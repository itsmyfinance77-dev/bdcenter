'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon, type IconName } from '@/components/site/icons';
import { homeCopy, siteInfo } from '@/content/site';
import { ECO_MAJORS, EcoNetwork } from './eco-network';
import { HeroNetwork } from './hero-network';

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

/** Live `prefers-reduced-motion`; assumes motion is fine during server rendering. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(reducedMotionQuery);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(reducedMotionQuery).matches,
    () => false,
  );
}

/** Floating colour blobs plus the drifting node network behind the hero. */
export function HeroBackground() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!canvas.current) return;
    const network = new HeroNetwork(canvas.current, reduce);
    return () => network.destroy();
  }, [reduce]);

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-20 overflow-hidden">
      <div className="absolute -top-[30vmax] -right-[18vmax] size-[64vmax] animate-float-a rounded-full bg-[radial-gradient(circle,rgba(31,99,230,.7),rgba(31,99,230,0)_62%)] will-change-transform" />
      <div className="absolute -bottom-[28vmax] -left-[14vmax] size-[52vmax] animate-float-b rounded-full bg-[radial-gradient(circle,rgba(20,163,168,.5),rgba(20,163,168,0)_62%)] will-change-transform" />
      <canvas ref={canvas} className="absolute inset-0 block size-full" />
    </div>
  );
}

const partnerIcons: (IconName | 'stp')[] = ['stp', 'chip', 'factory', 'government', 'cap'];

/**
 * "The center connects the park, tech companies, industry, government and
 * universities": a hub with five partner badges over the animated canvas.
 * Decorative; the figure's label carries the meaning for screen readers.
 */
export function Ecosystem() {
  const root = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (!canvas.current || !tilt.current || !root.current) return;
    const network = new EcoNetwork(canvas.current, tilt.current, root.current, reduce, setActive);
    return () => network.destroy();
  }, [reduce]);

  return (
    <div
      ref={root}
      role="img"
      aria-label={homeCopy.ecosystemLabel}
      data-reveal=""
      data-reveal-delay="150"
      className="relative mb-6 aspect-square w-full max-w-[500px] justify-self-center"
    >
      <div ref={tilt} className="absolute inset-0 will-change-transform transform-3d">
        <div aria-hidden="true" className="absolute inset-0">
          <canvas
            ref={canvas}
            className="pointer-events-none absolute -top-[30%] -left-[30%] block size-[160%]"
          />
        </div>
        {ECO_MAJORS.map(([left, top], index) => {
          const on = active === index;
          const icon = partnerIcons[index]!;
          return (
            <div
              key={index}
              aria-hidden="true"
              className="absolute aspect-square w-[clamp(40px,11%,52px)] transition-transform duration-400 ease-(--ease-out-soft)"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: `translate(-50%,-50%) scale(${on ? 1.14 : 1})`,
              }}
            >
              <span
                className={`absolute inset-0 grid place-items-center rounded-[14px] border bg-[rgba(10,29,74,.9)] backdrop-blur-sm transition-[border-color,box-shadow,color] duration-300 ${
                  on
                    ? 'border-[rgba(159,240,242,.95)] text-white shadow-[0_0_0_4px_rgba(94,214,219,.2),0_12px_36px_-8px_rgba(20,163,168,.95)]'
                    : 'border-[rgba(159,240,242,.3)] text-accent-glow shadow-[0_10px_30px_-12px_rgba(0,0,0,.7)]'
                }`}
              >
                {icon === 'stp' ? (
                  <Image
                    src="/brand/stp-logo-white.svg"
                    alt=""
                    width={28}
                    height={25}
                    className="block h-auto w-[62%]"
                  />
                ) : (
                  <Icon name={icon} size={22} />
                )}
              </span>
              <span className="absolute top-[calc(100%+8px)] left-1/2 w-[clamp(88px,28vw,136px)] -translate-x-1/2 text-center text-[clamp(11.5px,2.8vw,13.5px)] leading-[1.55] font-bold text-white [text-shadow:0_1px_10px_rgba(8,26,68,.95)]">
                {homeCopy.ecosystem[index]}
              </span>
            </div>
          );
        })}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 flex aspect-square w-[32%] flex-col items-center justify-center gap-1.5 rounded-full bg-[radial-gradient(circle_at_30%_25%,#2a6cf0,#1450c8_55%,#0e6f8f)] p-2.5 text-center shadow-[0_0_0_6px_rgba(94,214,219,.14),0_20px_60px_-12px_rgba(20,163,168,.8)] transition-transform duration-400 ease-(--ease-out-soft)"
          style={{ transform: `translate(-50%,-50%) scale(${active === 5 ? 1.06 : 1})` }}
        >
          <Image
            src="/brand/bdc-logo-white.png"
            alt=""
            width={44}
            height={44}
            className="block h-auto w-[30%]"
          />
          <span className="font-display text-[clamp(11.5px,2.8vw,14.5px)] leading-[1.45] font-extrabold text-white">
            {siteInfo.name}
          </span>
        </div>
      </div>
    </div>
  );
}
