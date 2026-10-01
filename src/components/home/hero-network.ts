/**
 * Drifting node network behind the hero (BDC Yazd design, "network" hero
 * background). Nodes drift, link up when close, carry light "packets" and
 * shy away from the mouse. Pauses when hidden or off screen; with reduced
 * motion it draws one still frame.
 */

type Node = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  s: number;
  hub: boolean;
  blue: boolean;
  ph: number;
};
type Packet = { a: Node; b: Node; p: number; v: number };

export class HeroNetwork {
  private ctx: CanvasRenderingContext2D;
  private nodes: Node[] = [];
  private packets: Packet[] = [];
  private ptr: { x: number; y: number } | null = null;
  private visible = true;
  private last = 0;
  private spawnAt = 0;
  private raf = 0;
  private w = 0;
  private h = 0;
  private D = 0;
  private ro: ResizeObserver;
  private io: IntersectionObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private reduce: boolean,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]!.isIntersecting;
      this.kick();
    });
    this.io.observe(canvas);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    document.addEventListener('pointerleave', this.onLeave);
    this.resize();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerleave', this.onLeave);
  }

  private onVisibility = () => this.kick();
  private onLeave = () => {
    this.ptr = null;
  };
  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || this.reduce) return;
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    this.ptr = x >= 0 && y >= 0 && x <= r.width && y <= r.height ? { x, y } : null;
  };

  private resize() {
    const c = this.canvas;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!w || !h) return;
    const sx = this.w ? w / this.w : 1;
    const sy = this.h ? h / this.h : 1;
    this.w = w;
    this.h = h;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.D = Math.min(170, 70 + w * 0.08);
    const want = Math.max(22, Math.min(78, Math.round((w * h) / 15000)));
    for (const n of this.nodes) {
      n.x *= sx;
      n.y *= sy;
    }
    while (this.nodes.length < want) {
      const i = this.nodes.length;
      const a = Math.random() * Math.PI * 2;
      const s = 0.12 + Math.random() * 0.22;
      this.nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        s,
        hub: i % 9 === 0,
        blue: i % 3 === 0,
        ph: Math.random() * 6.28,
      });
    }
    this.nodes.length = want;
    this.kick();
  }

  private kick() {
    cancelAnimationFrame(this.raf);
    if (this.reduce || document.hidden || !this.visible) {
      this.draw(0);
      return;
    }
    this.last = 0;
    const loop = (t: number) => {
      this.step(t);
      this.draw(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private step(t: number) {
    const dt = this.last ? Math.min(3, (t - this.last) / 16.67) : 1;
    this.last = t;
    const { w, h, ptr } = this;
    for (const n of this.nodes) {
      if (ptr) {
        const dx = n.x - ptr.x;
        const dy = n.y - ptr.y;
        const d = Math.hypot(dx, dy);
        if (d < 130 && d > 0.1) {
          const f = (1 - d / 130) * 0.06 * dt;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
      }
      const sp = Math.hypot(n.vx, n.vy) || 1;
      const k = 1 + (n.s / sp - 1) * 0.02 * dt;
      n.vx *= k;
      n.vy *= k;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      if (n.x < -20) n.x = w + 20;
      else if (n.x > w + 20) n.x = -20;
      if (n.y < -20) n.y = h + 20;
      else if (n.y > h + 20) n.y = -20;
    }
    if (t > this.spawnAt && this.packets.length < 7) {
      this.spawnAt = t + 380 + Math.random() * 520;
      const a = this.nodes[(Math.random() * this.nodes.length) | 0]!;
      const near = this.nodes.filter((b) => b !== a && Math.hypot(a.x - b.x, a.y - b.y) < this.D);
      if (near.length) {
        this.packets.push({
          a,
          b: near[(Math.random() * near.length) | 0]!,
          p: 0,
          v: 0.008 + Math.random() * 0.008,
        });
      }
    }
    this.packets = this.packets.filter((k) => {
      k.p += k.v * dt;
      return k.p < 1 && Math.hypot(k.a.x - k.b.x, k.a.y - k.b.y) < this.D * 1.15;
    });
  }

  private draw(t: number) {
    const { ctx, w, h, D, nodes, ptr } = this;
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]!;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < D) {
          ctx.strokeStyle = `rgba(94,214,219,${((1 - d / D) * 0.32).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      if (ptr) {
        const d = Math.hypot(a.x - ptr.x, a.y - ptr.y);
        if (d < 190) {
          ctx.strokeStyle = `rgba(159,240,242,${((1 - d / 190) * 0.5).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(ptr.x, ptr.y);
          ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      const tw = 0.6 + 0.4 * Math.sin(t / 900 + n.ph);
      const r = n.hub ? 3.2 : 1.8;
      if (n.hub) {
        ctx.fillStyle = `rgba(94,214,219,${(0.14 * tw).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 11, 0, 6.283);
        ctx.fill();
      }
      ctx.fillStyle = n.blue
        ? `rgba(157,187,255,${(0.55 + 0.4 * tw).toFixed(3)})`
        : `rgba(94,214,219,${(0.55 + 0.4 * tw).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, 6.283);
      ctx.fill();
    }
    for (const k of this.packets) {
      const x = k.a.x + (k.b.x - k.a.x) * k.p;
      const y = k.a.y + (k.b.y - k.a.y) * k.p;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, 'rgba(210,252,253,.95)');
      g.addColorStop(1, 'rgba(94,214,219,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, 6.283);
      ctx.fill();
    }
  }
}
