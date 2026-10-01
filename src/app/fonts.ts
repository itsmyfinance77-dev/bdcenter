import localFont from 'next/font/local';

/**
 * Self-hosted fonts (no third-party font requests; the CSP allows fonts from
 * this origin only). Vazirmatn (SIL OFL) is the body face; Anjoman, supplied
 * with the design handoff, is used for headings — see src/fonts/README.md.
 */

export const vazirmatn = localFont({
  src: '../fonts/Vazirmatn-Variable.woff2',
  weight: '100 900',
  variable: '--font-vazirmatn',
  display: 'swap',
});

export const anjoman = localFont({
  src: [
    { path: '../fonts/Anjoman-Bold.ttf', weight: '700' },
    { path: '../fonts/Anjoman-ExtraBold.ttf', weight: '800' },
    { path: '../fonts/Anjoman-Black.ttf', weight: '900' },
  ],
  variable: '--font-anjoman',
  display: 'swap',
  preload: false,
});
