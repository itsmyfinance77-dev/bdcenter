'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SearchForm } from '@/components/search-form';
import { Icon, type IconName } from '@/components/site/icons';
import { accountLink, mainNav, searchCopy, servicesMenu, siteInfo } from '@/content/site';

/**
 * Sticky navy header (BDC Yazd design). On the home page it starts
 * translucent over the hero and turns solid once the page scrolls. Below the
 * `nav` breakpoint the links move into a slide-in drawer.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const overlay = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerServicesOpen, setDrawerServicesOpen] = useState(true);
  const servicesButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Navigating closes every menu.
  useEffect(() => {
    setServicesOpen(false);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    if (drawerOpen) setTimeout(() => closeButton.current?.focus(), 60);
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (drawerOpen) closeDrawer();
      if (servicesOpen) {
        setServicesOpen(false);
        servicesButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function closeDrawer() {
    setDrawerOpen(false);
    menuButton.current?.focus();
  }

  const solid = !overlay || scrolled;
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const servicesActive = servicesMenu.some((item) => isCurrent(item.href));
  const navItemClass =
    'flex h-11 items-center rounded-[10px] px-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/8 hover:text-white';

  return (
    <>
      <header
        className={`sticky top-0 z-50 h-[72px] border-b backdrop-blur-[14px] transition-[background-color,box-shadow,border-color] duration-300 ${
          !overlay
            ? 'border-white/8 bg-brand-950/96'
            : solid
              ? 'border-white/8 bg-brand-950/92'
              : 'border-transparent bg-brand-950/35'
        } ${solid && scrolled ? 'shadow-[0_10px_30px_-18px_rgba(0,0,0,.6)]' : ''}`}
      >
        <div className="mx-auto flex h-full max-w-(--container-page) items-center gap-6 px-[clamp(20px,4vw,32px)]">
          <Link
            href="/"
            aria-label={`${siteInfo.name} — صفحه اصلی`}
            className="flex min-w-0 items-center gap-3 text-white hover:text-white"
          >
            <Image
              src="/brand/bdc-logo-white.png"
              alt=""
              width={42}
              height={42}
              priority
              className="size-[42px] flex-none"
            />
            <span className="flex min-w-0 flex-col leading-[1.35]">
              <span className="font-display text-[17px] font-extrabold text-white">
                {siteInfo.name}
              </span>
              <span className="truncate text-[11.5px] font-medium text-on-dark-2">
                {siteInfo.parentOrg}
              </span>
            </span>
          </Link>

          <nav aria-label="ناوبری اصلی" className="ms-auto hidden nav:block">
            <ul className="flex items-center gap-1">
              <li
                className="relative"
                onPointerEnter={(e) => e.pointerType === 'mouse' && setServicesOpen(true)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setServicesOpen(false)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setServicesOpen(false);
                }}
              >
                <button
                  ref={servicesButton}
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={servicesOpen}
                  aria-controls="services-menu"
                  onClick={() => setServicesOpen((open) => !open)}
                  className={`${navItemClass} gap-1.5 ${servicesOpen ? 'bg-white/10' : servicesActive ? 'bg-white/8' : ''}`}
                >
                  خدمات
                  <Icon
                    name="chevronDown"
                    size={16}
                    strokeWidth={2}
                    className={`transition-transform duration-250 ${servicesOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  id="services-menu"
                  className={`absolute top-full right-0 w-[300px] pt-2.5 transition-[opacity,transform,visibility] duration-200 ease-(--ease-out-soft) ${
                    servicesOpen
                      ? 'visible translate-y-0 opacity-100'
                      : 'invisible -translate-y-1.5 opacity-0'
                  }`}
                >
                  <ul className="flex flex-col gap-0.5 rounded-2xl bg-white p-2 shadow-[0_24px_60px_-16px_rgba(8,26,68,.45),0_0_0_1px_rgba(14,26,51,.06)]">
                    {servicesMenu.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isCurrent(item.href) ? 'page' : undefined}
                          onClick={() => setServicesOpen(false)}
                          className="flex items-center gap-3 rounded-[10px] p-2.5 text-[14.5px] font-semibold text-ink transition-colors hover:bg-primary-wash hover:text-brand-900 aria-[current=page]:bg-primary-wash"
                        >
                          <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-primary-tint text-primary">
                            <Icon name={item.icon as IconName} size={18} />
                          </span>
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item.href) ? 'page' : undefined}
                    className={`${navItemClass} aria-[current=page]:bg-white/10`}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
              <li className="ms-2">
                <Link
                  href="/search"
                  aria-label={searchCopy.title}
                  className="grid size-11 place-items-center rounded-[10px] text-white hover:bg-white/8 hover:text-white"
                >
                  <Icon name="search" size={20} strokeWidth={2} />
                </Link>
              </li>
              <li>
                <Link
                  href={accountLink.href}
                  className="flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/6 px-3.5 text-sm font-semibold text-white transition-colors hover:border-white/35 hover:bg-white/12 hover:text-white"
                >
                  <Icon name="user" size={18} strokeWidth={2} />
                  {accountLink.title}
                </Link>
              </li>
            </ul>
          </nav>

          <button
            ref={menuButton}
            type="button"
            aria-label="باز کردن منو"
            aria-expanded={drawerOpen}
            aria-controls="mobile-menu"
            onClick={() => setDrawerOpen(true)}
            className="ms-auto grid size-11 flex-none cursor-pointer place-items-center rounded-xl border border-white/18 bg-white/6 text-white nav:hidden"
          >
            <Icon name="menu" size={22} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`fixed inset-0 z-80 transition-[visibility] nav:hidden ${drawerOpen ? 'visible' : 'invisible delay-[420ms]'}`}
      >
        <div
          onClick={closeDrawer}
          className={`absolute inset-0 bg-[rgba(5,14,36,.6)] transition-opacity duration-350 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="منوی اصلی"
          className={`absolute inset-y-0 right-0 flex w-[min(360px,88vw)] flex-col gap-2 overflow-y-auto bg-brand-850 px-5 pt-4 pb-7 text-white shadow-[-24px_0_60px_-20px_rgba(0,0,0,.5)] transition-transform duration-[420ms] ease-(--ease-out-soft) ${
            drawerOpen ? 'translate-x-0' : 'translate-x-[105%]'
          }`}
        >
          <div className="mb-2 flex h-14 items-center justify-between">
            <Link
              href="/"
              className="font-display text-[17px] font-extrabold text-white hover:text-white"
            >
              {siteInfo.name}
            </Link>
            <button
              ref={closeButton}
              type="button"
              aria-label="بستن منو"
              onClick={closeDrawer}
              className="grid size-11 cursor-pointer place-items-center rounded-xl border border-white/18 bg-white/6 text-white"
            >
              <Icon name="close" size={20} strokeWidth={2} />
            </button>
          </div>
          <div className="mb-2 [&_input]:w-auto [&_input]:flex-1">
            <SearchForm id="mobile-search" />
          </div>
          <nav aria-label="ناوبری موبایل">
            <ul className="flex flex-col gap-1">
              <li>
                <button
                  type="button"
                  aria-expanded={drawerServicesOpen}
                  aria-controls="mobile-services"
                  onClick={() => setDrawerServicesOpen((open) => !open)}
                  className="flex min-h-[52px] w-full cursor-pointer items-center justify-between rounded-xl bg-white/5 px-3.5 text-base font-bold text-white"
                >
                  خدمات
                  <Icon
                    name="chevronDown"
                    size={18}
                    strokeWidth={2}
                    className={`transition-transform duration-250 ${drawerServicesOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {drawerServicesOpen ? (
                  <ul
                    id="mobile-services"
                    className="ms-3.5 flex flex-col gap-0.5 border-s border-white/14 py-1.5 pe-2"
                  >
                    {servicesMenu.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isCurrent(item.href) ? 'page' : undefined}
                          onClick={closeDrawer}
                          className="flex min-h-[46px] items-center gap-3 rounded-[10px] px-3 text-[15px] text-on-dark hover:bg-white/6 hover:text-white aria-[current=page]:text-white"
                        >
                          <Icon name={item.icon as IconName} size={18} />
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
              {[...mainNav, accountLink].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item.href) ? 'page' : undefined}
                    onClick={closeDrawer}
                    className="flex min-h-[52px] items-center rounded-xl px-3.5 text-base font-bold text-white hover:bg-white/6 hover:text-white aria-[current=page]:bg-white/8"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="mt-auto pt-6 text-[12.5px] leading-[1.8] text-on-dark-2">
            {siteInfo.parentOrg}
          </p>
        </div>
      </div>
    </>
  );
}
