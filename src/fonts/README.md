# Fonts

- `Vazirmatn-Variable.woff2` (site) and `Vazirmatn-Regular.ttf` /
  `Vazirmatn-Bold.ttf` (PDF certificates: PDF embedding needs static fonts) —
  Vazirmatn by Saber Rastikerdar, SIL Open Font
  License 1.1 (`Vazirmatn-OFL.txt`; from the `vazirmatn` npm package, v33.0.3).
  The woff2 is subset to what the site uses (111 KB -> 81 KB; the OFL allows
  it, and Vazirmatn has no Reserved Font Name). To redo it from the package's
  `fonts/variable/Vazirmatn[wght].woff2`, with fonttools and brotli installed:
  `pyftsubset <in> --unicodes="U+0020-007E,U+00A0-00FF,U+0600-06FF,U+200C-200F,U+2010-2027,U+2030-203A,U+20AC,U+2122,U+2190-2199,U+2212,U+25CC" --layout-features='*' --flavor=woff2 --output-file=Vazirmatn-Variable.woff2`
- `Anjoman-*.ttf` — headings, supplied with the "BDC Yazd" design handoff on
  2026-10-01. The owner confirmed on 2026-10-01 that the center holds a
  license; the license document is to be supplied and kept with the project
  (OQ-BD-17). To fall back to Vazirmatn everywhere,
  remove `anjoman` from `src/app/fonts.ts` and `src/app/layout.tsx`.
