'use client';

import { useEffect, useRef, useState } from 'react';
import { homeCopy } from '@/content/site';

const SEEN_KEY = 'bdc-intro-seen';
const BG = '#081a44';
const LOGO = '/brand/bdc-logo-white.png';

/**
 * Before the overlay paints: skip it when the visitor saw it this session or
 * prefers reduced motion. Runs inline (the CSP allows inline scripts).
 */
const skipScript = `try{if(sessionStorage.getItem('${SEEN_KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.setAttribute('data-intro','skip')}catch(e){}`;

/**
 * The logo intro from the BDC Yazd design: the white logo spins up, glows,
 * then the screen opens from the center onto the page. Plays once per
 * session; click, Escape or the button skips it. Without JavaScript the
 * overlay is hidden by <noscript> CSS.
 */
export function LogoIntro() {
  const [done, setDone] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const spin = useRef<HTMLDivElement>(null);
  const disc = useRef<HTMLDivElement>(null);
  const hole = useRef<HTMLDivElement>(null);
  const skip = useRef<HTMLButtonElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (document.documentElement.getAttribute('data-intro') === 'skip') {
      setDone(true);
      return;
    }
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    let raf = 0;
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      window.removeEventListener('keydown', onKey);
      html.style.overflow = previousOverflow;
      try {
        sessionStorage.setItem(SEEN_KEY, '1');
      } catch {
        // Private mode: the intro may play again next time.
      }
      setDone(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    const safety = setTimeout(finish, 7000);
    root.current?.addEventListener('click', finish);
    skip.current?.addEventListener('click', (event) => {
      event.stopPropagation();
      finish();
    });

    const run = () => {
      if (finished.current) return;
      const T_IN = 500;
      const T_SPIN = 2000;
      const T_OPEN = 1100;
      const D = Math.min(170, window.innerWidth * 0.36);
      const easeIn = (p: number) => p * p * p;
      const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
      const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
      const clamp = (v: number) => Math.max(0, Math.min(1, v));
      const sp = spin.current!;
      const dc = disc.current!;
      const hl = hole.current!;
      const rt = root.current!;
      const trails = [...sp.querySelectorAll<HTMLElement>('[data-trail]')];
      const t0 = performance.now();
      let opened = false;
      const tick = (t: number) => {
        const e = t - t0;
        if (e < T_IN + T_SPIN) {
          const pi = clamp(e / T_IN);
          const ps = clamp((e - T_IN * 0.3) / T_SPIN);
          const angle = easeIn(ps) * 360 * 8;
          sp.style.opacity = String(easeOut(pi));
          sp.style.transform = `scale(${0.55 + 0.45 * easeOut(pi)}) rotate(${angle.toFixed(1)}deg)`;
          sp.style.filter = `blur(${(ps * ps * 5).toFixed(2)}px)`;
          const tr = clamp(ps * 1.8);
          trails.forEach((el, i) => {
            el.style.opacity = (tr * Math.pow(0.62, i + 1)).toFixed(3);
          });
          const pd = clamp((ps - 0.6) / 0.4);
          dc.style.opacity = (pd * pd).toFixed(3);
          dc.style.transform = `scale(${0.7 + 0.3 * easeOut(pd)})`;
          dc.style.boxShadow = `0 0 ${(20 + 60 * pd).toFixed(0)}px ${(4 + 16 * pd).toFixed(0)}px rgba(159,240,242,${(0.5 * pd).toFixed(2)})`;
        } else if (e < T_IN + T_SPIN + T_OPEN) {
          if (!opened) {
            opened = true;
            sp.style.display = 'none';
            dc.style.display = 'none';
            if (skip.current) skip.current.style.display = 'none';
            rt.style.background = 'transparent';
            rt.style.pointerEvents = 'none';
            hl.style.display = 'block';
          }
          const p = clamp((e - T_IN - T_SPIN) / T_OPEN);
          const q = easeInOut(p);
          const maxS = Math.hypot(window.innerWidth, window.innerHeight) * 1.08;
          const s = q * maxS;
          const a = (D / 2) * (1 - easeOut(clamp(p * 1.4)));
          const cover = Math.max(window.innerWidth, window.innerHeight) * 1.6;
          hl.style.width = hl.style.height = `${s.toFixed(1)}px`;
          hl.style.boxShadow = `0 0 ${(30 * (1 - p)).toFixed(0)}px ${a.toFixed(1)}px rgba(255,255,255,${(1 - p * 0.3).toFixed(2)}), 0 0 0 ${(a + cover).toFixed(0)}px ${BG}`;
        } else {
          finish();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const img = new window.Image();
    img.src = LOGO;
    (img.decode ? img.decode() : Promise.resolve()).then(run, run);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      window.removeEventListener('keydown', onKey);
      html.style.overflow = previousOverflow;
    };
  }, []);

  if (done) return null;
  const size = 'min(170px, 36vw)';
  const box = {
    left: '50%',
    top: '50%',
    width: size,
    height: size,
    margin: `calc(${size} / -2) 0 0 calc(${size} / -2)`,
  } as const;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: skipScript }} />
      <noscript>
        <style>{'#logo-intro{display:none}'}</style>
      </noscript>
      <div
        id="logo-intro"
        ref={root}
        aria-hidden="true"
        className="fixed inset-0 z-1000 cursor-pointer overflow-hidden in-data-[intro=skip]:hidden"
        style={{ background: BG }}
      >
        <div ref={disc} className="absolute rounded-full bg-white opacity-0" style={box} />
        <div ref={spin} className="absolute opacity-0 will-change-[transform,filter]" style={box}>
          {[1, 2, 3, 4, 5].map((i) => (
            // eslint-disable-next-line @next/next/no-img-element -- animated frame, not content
            <img
              key={i}
              src={LOGO}
              alt=""
              data-trail=""
              className="absolute inset-0 block size-full opacity-0"
              style={{ transform: `rotate(${-i * 14}deg)` }}
            />
          ))}
          {/* eslint-disable-next-line @next/next/no-img-element -- animated frame, not content */}
          <img src={LOGO} alt="" className="absolute inset-0 block size-full" />
        </div>
        <div
          ref={hole}
          className="absolute top-1/2 left-1/2 hidden size-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
        />
        <button
          ref={skip}
          type="button"
          aria-hidden="false"
          className="absolute bottom-7 left-1/2 min-h-11 -translate-x-1/2 cursor-pointer rounded-full border border-white/20 bg-white/6 px-[18px] text-sm font-semibold text-on-dark"
        >
          {homeCopy.skipIntro}
        </button>
      </div>
    </>
  );
}
