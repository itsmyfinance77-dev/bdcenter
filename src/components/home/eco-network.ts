/**
 * The ecosystem diagram's canvas layer (BDC Yazd design): the center hub,
 * five partner nodes, orbiting satellites and light packets along the links.
 * Highlights one partner at a time (or the one under the mouse), tilts the
 * diagram towards the pointer and reports the active node so the HTML node
 * badges can glow with it. With reduced motion it draws one still frame.
 */

/** Partner positions in % of the diagram box: park, tech companies, industry, government, university. */
export const ECO_MAJORS: [number, number][] = [
  [50, 13],
  [85.2, 38.6],
  [71.7, 79.9],
  [28.3, 79.9],
  [14.8, 38.6],
];

type Point = { x: number; y: number };
type Sat = Point & {
  g: number;
  cx: number;
  cy: number;
  a: number;
  r: number;
  w: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  size: number;
  ph: number;
  near?: number;
  f?: number;
};
type Edge = { t: 's' | 'r' | 'c' | 'l'; i?: number; j?: number; a: Point; b: Point; c?: Point };
type Packet = { e: Edge; p: number; v: number; rev: boolean; sm?: boolean };

const T = 'rgba(94,214,219,';
const B = 'rgba(157,187,255,';

export class EcoNetwork {
  private ctx: CanvasRenderingContext2D;
  private ptr: Point | null = null;
  private tx = 0;
  private ty = 0;
  private active = -1;
  private cycleAt = 0;
  private cycleIdx = -1;
  private packets: Packet[] = [];
  private spawnAt = 0;
  private visible = true;
  private last = 0;
  private raf = 0;
  private W = 0;
  private S = 0;
  private pad = 0;
  private hub: Point = { x: 0, y: 0 };
  private majors: Point[] = [];
  private sats: Sat[] = [];
  private edges: Edge[] = [];
  private ro: ResizeObserver;
  private io: IntersectionObserver;

  /**
   * @param tilt element rotated towards the pointer
   * @param root element whose box maps pointer positions onto the diagram
   */
  constructor(
    private canvas: HTMLCanvasElement,
    private tilt: HTMLElement,
    private root: HTMLElement,
    private reduce: boolean,
    private onActive: (index: number) => void,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.io = new IntersectionObserver((entries) => {
      this.visible = entries[0]!.isIntersecting;
      this.kick();
    });
    this.io.observe(canvas);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    document.addEventListener('pointerleave', this.onLeave);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    window.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerleave', this.onLeave);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.tilt.style.transform = '';
  }

  private onVisibility = () => this.kick();
  private onLeave = () => {
    this.ptr = null;
  };
  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !this.S || this.reduce) return;
    const r = this.root.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    this.ptr =
      x > -0.35 && x < 1.35 && y > -0.35 && y < 1.35 ? { x: x * this.S, y: y * this.S } : null;
  };

  private resize() {
    const c = this.canvas;
    const W = c.clientWidth;
    if (!W) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = W;
    this.S = W / 1.6;
    this.pad = this.S * 0.3;
    c.width = Math.round(W * dpr);
    c.height = Math.round(W * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, this.pad * dpr, this.pad * dpr);
    this.build();
    this.kick();
  }

  private build() {
    const S = this.S;
    const P = (p: [number, number]) => ({ x: (p[0] / 100) * S, y: (p[1] / 100) * S });
    this.hub = { x: S / 2, y: S / 2 };
    this.majors = ECO_MAJORS.map(P);
    let seed = 11;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const mk = (g: number, cx: number, cy: number, r0: number, r1: number, w: number): Sat => ({
      g,
      cx,
      cy,
      a: rnd() * 6.283,
      r: (r0 + rnd() * (r1 - r0)) * S,
      w: (rnd() - 0.5) * w,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      x: cx,
      y: cy,
      size: 0.9 + rnd() * 1.4,
      ph: rnd() * 6.283,
    });
    const sats: Sat[] = [];
    this.majors.forEach((m, i) => {
      for (let k = 0; k < 12; k++) sats.push(mk(i, m.x, m.y, 0.05, 0.17, 0.005));
    });
    for (let k = 0; k < 26; k++) sats.push(mk(-1, this.hub.x, this.hub.y, 0.18, 0.36, 0.0018));
    for (let k = 0; k < 44; k++) {
      const o = mk(-2, this.hub.x, this.hub.y, 0.46, 0.76, 0.0009);
      const ox = o.cx + Math.cos(o.a) * o.r;
      const oy = o.cy + Math.sin(o.a) * o.r;
      let bi = 0;
      let bd = 1e9;
      this.majors.forEach((m, i) => {
        const d = Math.hypot(m.x - ox, m.y - oy);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      o.near = bi;
      sats.push(o);
    }
    this.sats = sats;
    const edges: Edge[] = [];
    this.majors.forEach((m, i) => {
      edges.push({ t: 's', i, a: this.hub, b: m });
      const j = (i + 1) % 5;
      const n = this.majors[j]!;
      const mx = (m.x + n.x) / 2;
      const my = (m.y + n.y) / 2;
      const dx = mx - this.hub.x;
      const dy = my - this.hub.y;
      const dl = Math.hypot(dx, dy) || 1;
      edges.push({
        t: 'r',
        i,
        j,
        a: m,
        b: n,
        c: { x: mx + (dx / dl) * S * 0.07, y: my + (dy / dl) * S * 0.07 },
      });
      const q = (i + 2) % 5;
      edges.push({ t: 'c', i, j: q, a: m, b: this.majors[q]! });
    });
    this.edges = edges;
  }

  private kick() {
    cancelAnimationFrame(this.raf);
    if (this.reduce || document.hidden || !this.visible) {
      this.tilt.style.transform = '';
      this.setActive(-1);
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

  private setActive(i: number) {
    if (i !== this.active) {
      this.active = i;
      this.onActive(i);
    }
  }

  private step(t: number) {
    const dt = this.last ? Math.min(3, (t - this.last) / 16.67) : 1;
    this.last = t;
    const S = this.S;
    const ptr = this.ptr;
    let act: number;
    if (ptr) {
      act = -1;
      let best = S * 0.15;
      this.majors.forEach((m, i) => {
        const d = Math.hypot(m.x - ptr.x, m.y - ptr.y);
        if (d < best) {
          best = d;
          act = i;
        }
      });
      if (act < 0 && Math.hypot(ptr.x - this.hub.x, ptr.y - this.hub.y) < S * 0.17) act = 5;
      this.cycleAt = t + 2400;
    } else if (t > this.cycleAt) {
      this.cycleIdx = (this.cycleIdx + 1) % 5;
      this.cycleAt = t + 2600;
      act = this.cycleIdx;
    } else act = this.active === 5 ? -1 : this.active;
    this.setActive(act);

    const R = 95;
    for (const s of this.sats) {
      s.a += s.w * dt;
      const rx = s.cx + Math.cos(s.a) * s.r;
      const ry = s.cy + Math.sin(s.a) * s.r;
      let fx = -s.ox * 0.035;
      let fy = -s.oy * 0.035;
      if (ptr) {
        const dx = rx + s.ox - ptr.x;
        const dy = ry + s.oy - ptr.y;
        const d = Math.hypot(dx, dy);
        if (d < R && d > 0.1) {
          const f = (1 - d / R) * 1.4;
          fx += (dx / d) * f;
          fy += (dy / d) * f;
        }
      }
      s.vx = (s.vx + fx * dt) * 0.86;
      s.vy = (s.vy + fy * dt) * 0.86;
      s.ox += s.vx * dt;
      s.oy += s.vy * dt;
      s.x = rx + s.ox;
      s.y = ry + s.oy;
    }
    const txT = ptr ? ptr.x / S - 0.5 : 0;
    const tyT = ptr ? ptr.y / S - 0.5 : 0;
    this.tx += (txT - this.tx) * Math.min(1, 0.08 * dt);
    this.ty += (tyT - this.ty) * Math.min(1, 0.08 * dt);
    this.tilt.style.transform = `perspective(1100px) rotateX(${(-this.ty * 10).toFixed(2)}deg) rotateY(${(this.tx * 10).toFixed(2)}deg)`;

    if (t > this.spawnAt && this.packets.length < 26) {
      this.spawnAt = t + 110 + Math.random() * 200;
      const A = this.active;
      if (Math.random() < 0.35) {
        const cand = this.sats.filter(
          (q) => q.g >= 0 && (A < 0 || A === 5 || q.g === A || Math.random() < 0.3),
        );
        const q = cand[(Math.random() * cand.length) | 0];
        if (q) {
          this.packets.push({
            e: { t: 'l', a: q, b: this.majors[q.g]! },
            p: 0,
            v: 0.014 + Math.random() * 0.01,
            rev: Math.random() < 0.5,
            sm: true,
          });
        }
      } else {
        const pool =
          A >= 0 && A < 5 && Math.random() < 0.6
            ? this.edges.filter((e) => e.i === A || e.j === A)
            : A === 5 && Math.random() < 0.6
              ? this.edges.filter((e) => e.t === 's')
              : this.edges;
        this.packets.push({
          e: pool[(Math.random() * pool.length) | 0]!,
          p: 0,
          v: 0.006 + Math.random() * 0.006,
          rev: Math.random() < 0.5,
        });
      }
    }
    this.packets = this.packets.filter((k) => {
      k.p += k.v * dt;
      return k.p < 1;
    });
  }

  private pt(e: Edge, p: number): Point {
    if (e.t === 'r' && e.c) {
      const u = 1 - p;
      return {
        x: u * u * e.a.x + 2 * u * p * e.c.x + p * p * e.b.x,
        y: u * u * e.a.y + 2 * u * p * e.c.y + p * p * e.b.y,
      };
    }
    return { x: e.a.x + (e.b.x - e.a.x) * p, y: e.a.y + (e.b.y - e.a.y) * p };
  }

  private line(a: Point, b: Point) {
    this.ctx.beginPath();
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
  }

  private draw(t: number) {
    const { ctx, S, hub, sats } = this;
    if (!S) return;
    const A = this.active;
    const ptr = this.ptr;
    ctx.clearRect(-this.pad, -this.pad, this.W, this.W);
    ctx.setLineDash([2, 6]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(159,240,242,.18)';
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, S * 0.37, 0, 6.283);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(hub.x, hub.y, S * 0.25, 0, 6.283);
    ctx.strokeStyle = 'rgba(157,187,255,.12)';
    ctx.stroke();
    ctx.setLineDash([]);

    const D = S * 0.15;
    for (const s of sats) {
      if (s.g === -2) {
        const d = Math.hypot(s.x - hub.x, s.y - hub.y);
        s.f = Math.max(0, Math.min(1, 1 - (d - S * 0.5) / (S * 0.32)));
      } else s.f = 1;
    }
    ctx.lineWidth = 0.8;
    for (let i = 0; i < sats.length; i++) {
      const a = sats[i]!;
      if (a.g >= 0) {
        const m = this.majors[a.g]!;
        ctx.strokeStyle = T + (a.g === A ? 0.55 : 0.2) + ')';
        this.line(a, m);
      } else if (a.g === -2) {
        const m = this.majors[a.near!]!;
        const d = Math.hypot(a.x - m.x, a.y - m.y);
        if (d < S * 0.3) {
          const on = a.near === A;
          ctx.strokeStyle = B + ((1 - d / (S * 0.3)) * (on ? 0.45 : 0.16) * a.f!).toFixed(3) + ')';
          this.line(a, m);
        }
      }
      for (let j = i + 1; j < sats.length; j++) {
        const b = sats[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < D) {
          const on = (a.g >= 0 && a.g === A) || (b.g >= 0 && b.g === A);
          ctx.strokeStyle =
            (a.g < 0 && b.g < 0 ? B : T) +
            ((1 - d / D) * (on ? 0.5 : 0.2) * Math.min(a.f!, b.f!)).toFixed(3) +
            ')';
          this.line(a, b);
        }
      }
    }
    for (const e of this.edges) {
      const on = A === 5 ? e.t === 's' : e.i === A || e.j === A;
      if (e.t === 's') {
        const g = ctx.createLinearGradient(e.a.x, e.a.y, e.b.x, e.b.y);
        g.addColorStop(0, T + (on ? 0.95 : 0.5) + ')');
        g.addColorStop(1, B + (on ? 0.8 : 0.3) + ')');
        ctx.strokeStyle = g;
        ctx.lineWidth = on ? 2.2 : 1.4;
        this.line(e.a, e.b);
      } else if (e.t === 'r' && e.c) {
        ctx.strokeStyle = T + (on ? 0.6 : 0.28) + ')';
        ctx.lineWidth = on ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.quadraticCurveTo(e.c.x, e.c.y, e.b.x, e.b.y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = B + (on ? 0.4 : 0.12) + ')';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 5]);
        this.line(e.a, e.b);
        ctx.setLineDash([]);
      }
    }
    if (ptr) {
      const R = S * 0.24;
      ctx.lineWidth = 0.8;
      for (const s of sats) {
        const d = Math.hypot(s.x - ptr.x, s.y - ptr.y);
        if (d < R) {
          ctx.strokeStyle = 'rgba(210,252,253,' + ((1 - d / R) * 0.45 * s.f!).toFixed(3) + ')';
          this.line(s, ptr);
        }
      }
      ctx.fillStyle = 'rgba(210,252,253,.9)';
      ctx.beginPath();
      ctx.arc(ptr.x, ptr.y, 2.4, 0, 6.283);
      ctx.fill();
    }
    for (const s of sats) {
      const tw = 0.6 + 0.4 * Math.sin(t / 800 + s.ph);
      const on = s.g >= 0 && s.g === A;
      ctx.fillStyle = (s.g < 0 ? B : T) + ((on ? 0.95 : 0.5 + 0.35 * tw) * s.f!).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (on ? 1.4 : 1), 0, 6.283);
      ctx.fill();
    }
    this.majors.forEach((m, i) => {
      const on = i === A;
      const r = S * (on ? 0.095 + 0.01 * Math.sin(t / 300) : 0.07);
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
      g.addColorStop(0, T + (on ? 0.35 : 0.14) + ')');
      g.addColorStop(1, T + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, 6.283);
      ctx.fill();
    });
    if (!this.reduce) {
      for (let k = 0; k < 2; k++) {
        const p = (t / 3600 + k * 0.5) % 1;
        const r = S * (0.16 + 0.12 * p);
        ctx.strokeStyle = T + (0.6 * (1 - p)).toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, r, 0, 6.283);
        ctx.stroke();
      }
    }
    for (const k of this.packets) {
      const q = this.pt(k.e, k.rev ? 1 - k.p : k.p);
      const a = Math.sin(k.p * Math.PI);
      const pr = k.sm ? 4.5 : 8;
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, pr);
      g.addColorStop(0, 'rgba(225,253,254,' + ((k.sm ? 0.8 : 0.95) * a).toFixed(3) + ')');
      g.addColorStop(1, T + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(q.x, q.y, pr, 0, 6.283);
      ctx.fill();
    }
  }
}
