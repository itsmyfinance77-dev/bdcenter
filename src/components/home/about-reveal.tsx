'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/site/icons';
import { homeCopy, siteInfo } from '@/content/site';

/**
 * The building photo; hovering (mouse), keyboard focus or the button reveals
 * the "about" text over it. The button pins it open; Escape closes it.
 */
export function AboutReveal({ text }: { text: string }) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const pointerDown = useRef(false);
  const open = pinned || ((hover || focus) && !suppressed);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setHover(false);
      setFocus(false);
      setPinned(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        setHover(false);
        setSuppressed(false);
      }}
      onPointerDown={() => {
        pointerDown.current = true;
        setTimeout(() => (pointerDown.current = false), 400);
      }}
      onFocus={(e) => {
        let keyboard = !pointerDown.current;
        try {
          keyboard = keyboard && e.target.matches(':focus-visible');
        } catch {
          // Older browsers: treat any focus as keyboard focus.
        }
        if (keyboard) setFocus(true);
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setFocus(false);
        setPinned(false);
        setSuppressed(false);
      }}
      className="relative h-[clamp(540px,56vw,620px)] overflow-hidden rounded-panel bg-[#27385c] shadow-[0_30px_80px_-40px_rgba(8,26,68,.55)]"
    >
      <Image
        src="/brand/bdc-building-front.jpg"
        alt={homeCopy.aboutPhotoAlt}
        fill
        sizes="(min-width: 1200px) 1136px, 100vw"
        className={`object-cover object-[50%_45%] transition-transform duration-[1400ms] ease-[cubic-bezier(.2,.7,.2,1)] ${open ? 'scale-106' : 'scale-100'}`}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,26,68,.9)_0%,rgba(8,26,68,.2)_45%,transparent_70%)]"
      />

      <div
        className={`absolute inset-x-0 bottom-0 p-[clamp(20px,3.5vw,40px)] pe-[clamp(180px,22vw,260px)] transition-[opacity,transform] duration-500 ease-(--ease-out-soft) ${
          open ? 'translate-y-3 opacity-0' : 'opacity-100'
        }`}
      >
        <p className="text-[clamp(22px,2.4vw,28px)] font-extrabold text-white">
          {homeCopy.aboutKicker}
        </p>
        <p className="mt-1.5 text-[15px] text-on-dark">{siteInfo.contact.address}</p>
      </div>

      <div
        id="about-panel"
        tabIndex={open ? 0 : -1}
        aria-label={homeCopy.aboutPanelLabel}
        className={`absolute inset-0 z-2 overflow-y-auto bg-[linear-gradient(160deg,rgba(8,26,68,.96),rgba(11,34,87,.93))] p-[clamp(24px,4.5vw,56px)] pb-[104px] text-white transition-[opacity,transform] duration-700 ease-(--ease-out-soft) will-change-[opacity,transform] ${
          open
            ? 'pointer-events-auto translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-10 opacity-0'
        }`}
      >
        <div
          className={`transition-[opacity,transform] delay-[180ms] duration-700 ease-(--ease-out-soft) ${
            open ? 'opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <span className="text-sm font-bold text-accent-light">{homeCopy.aboutTitle}</span>
          <h3 className="mt-2 text-[clamp(24px,2.8vw,32px)] leading-[1.4] font-extrabold">
            {siteInfo.name}
          </h3>
          <div
            aria-hidden="true"
            className="mt-5 mb-6 h-[3px] w-14 rounded-[3px] bg-[linear-gradient(90deg,#14a3a8,#2a6cf0)]"
          />
          <p className="gap-12 text-justify text-base leading-[2.1] text-pretty text-[#dbe4f4] min-[900px]:columns-2">
            {text}
          </p>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls="about-panel"
        onClick={() => {
          if (open) {
            setPinned(false);
            setSuppressed(true);
          } else {
            setPinned(true);
            setSuppressed(false);
          }
        }}
        className="absolute bottom-[clamp(20px,3.5vw,40px)] left-[clamp(20px,3.5vw,40px)] z-3 inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full border border-white/28 bg-white/12 ps-2 pe-[18px] text-[15px] font-bold text-white backdrop-blur-[10px] transition-colors hover:bg-white/20"
      >
        <span className="grid size-8 place-items-center rounded-full bg-white text-brand-900">
          <Icon
            name="plus"
            size={16}
            strokeWidth={2.4}
            className={`transition-transform duration-400 ease-(--ease-out-soft) ${open ? 'rotate-45' : ''}`}
          />
        </span>
        {open ? homeCopy.aboutClose : homeCopy.aboutOpen}
      </button>
    </div>
  );
}
