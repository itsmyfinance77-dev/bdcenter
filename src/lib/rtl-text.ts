/**
 * Minimal bidirectional text layout for drawing Persian lines into a PDF.
 *
 * PDFKit shapes text through fontkit, which joins Persian letters and
 * reverses the glyphs of anything it detects as Arabic script — including
 * Persian digits, which must read left to right. PDFKit also splits strings
 * at spaces and places the words left to right, which breaks the word order
 * of right-to-left text. So a line is laid out here instead: split into
 * direction runs (a simplified Unicode Bidirectional Algorithm for a
 * right-to-left paragraph), ordered visually, and cut into single words and
 * spaces. The drawing code gives PDFKit one space-free piece at a time,
 * left to right, and advances by each piece's width.
 */

export type Direction = 'rtl' | 'ltr';
export type TextRun = { text: string; direction: Direction };
/** One piece to draw, in left-to-right page order. `text` is ready for PDFKit. */
export type Piece = { kind: 'text'; text: string } | { kind: 'space'; count: number };

type CharClass = 'R' | 'L' | 'N' | 'S';

// Character classes are built from code points: the editing tools used on
// this repo turn escape sequences into the literal, often invisible, characters.
const chr = (code: number) => String.fromCharCode(code);
const range = (from: number, to: number) => `${chr(from)}-${chr(to)}`;

/** Arabic-Indic and Persian digits. */
const ARABIC_DIGITS = range(0x0660, 0x0669) + range(0x06f0, 0x06f9);
/** Hebrew/Arabic blocks and Arabic presentation forms, plus ZWNJ and ZWJ (part of words). */
const RTL_LETTERS =
  range(0x0590, 0x08ff) + range(0xfb1d, 0xfdff) + range(0xfe70, 0xfefe) + chr(0x200c) + chr(0x200d);
/** Separators inside numbers: ASCII ones and the Arabic decimal/thousands marks. */
const SEPARATORS = `/.,:\\-${chr(0x066b)}${chr(0x066c)}`;

const ARABIC_DIGIT = new RegExp(`[${ARABIC_DIGITS}]`);
const RTL_LETTER = new RegExp(`[${RTL_LETTERS}]`);
const DIGIT = new RegExp(`[0-9${ARABIC_DIGITS}]`);
const LTR_LETTER = /\p{L}/u;
/** Separators that stay inside a number when digits are on both sides: 1405/07/10, 2.5, 1,000. */
const NUMBER_SEPARATOR = new RegExp(`[${SEPARATORS}]`);
/** Persian/Arabic digits with the separators between them, and everything else. */
const DIGIT_PIECES = new RegExp(`[${ARABIC_DIGITS}${SEPARATORS}]+|[^${ARABIC_DIGITS}]+`, 'g');

/** Characters whose glyph is mirrored in right-to-left text (UAX #9 rule L4). */
const MIRRORED: Record<string, string> = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '<': '>',
  '>': '<',
  '«': '»',
  '»': '«',
};

function classify(char: string): CharClass {
  if (DIGIT.test(char)) return 'L'; // numbers read left to right
  if (RTL_LETTER.test(char)) return 'R';
  if (LTR_LETTER.test(char)) return 'L';
  if (NUMBER_SEPARATOR.test(char)) return 'S';
  return 'N';
}

/** Splits one line into direction runs, in logical (reading) order. */
export function directionRuns(line: string): TextRun[] {
  const chars = Array.from(line);
  const classes = chars.map(classify);

  // A separator between two digits belongs to the number; otherwise neutral.
  classes.forEach((cls, i) => {
    if (cls !== 'S') return;
    const between =
      i > 0 && i < chars.length - 1 && DIGIT.test(chars[i - 1]!) && DIGIT.test(chars[i + 1]!);
    classes[i] = between ? 'L' : 'N';
  });

  // Neutrals between two left-to-right characters join them; any other
  // neutral takes the paragraph direction (right-to-left).
  const resolved: Direction[] = classes.map((cls) => (cls === 'L' ? 'ltr' : 'rtl'));
  classes.forEach((cls, i) => {
    if (cls !== 'N') return;
    let before: CharClass | undefined;
    for (let j = i - 1; j >= 0 && !before; j--) if (classes[j] !== 'N') before = classes[j];
    let after: CharClass | undefined;
    for (let j = i + 1; j < classes.length && !after; j++)
      if (classes[j] !== 'N') after = classes[j];
    resolved[i] = before === 'L' && after === 'L' ? 'ltr' : 'rtl';
  });

  const runs: TextRun[] = [];
  chars.forEach((char, i) => {
    const direction = resolved[i]!;
    const last = runs.at(-1);
    if (last && last.direction === direction) last.text += char;
    else runs.push({ text: char, direction });
  });
  return runs;
}

/**
 * A word as PDFKit must receive it. fontkit reverses the glyphs of
 * Arabic-script text itself, so a right-to-left word only needs its brackets
 * mirrored. In a left-to-right word, Persian digits would be reversed too, so
 * those stretches are pre-reversed (digits do not join, so this is safe).
 */
function wordPieces(word: string, direction: Direction): string[] {
  if (direction === 'rtl') return [Array.from(word, (char) => MIRRORED[char] ?? char).join('')];
  return (word.match(DIGIT_PIECES) ?? []).map((piece) =>
    ARABIC_DIGIT.test(piece) ? Array.from(piece).reverse().join('') : piece,
  );
}

/** Explicit direction marks (e.g. from Intl date formatting); the layout here replaces them. */
const BIDI_CONTROLS = new RegExp(
  `[${chr(0x200e)}${chr(0x200f)}${chr(0x061c)}${range(0x202a, 0x202e)}${range(0x2066, 0x2069)}]`,
  'g',
);

/** The pieces of a right-to-left line in left-to-right drawing order. */
export function layoutLine(line: string): Piece[] {
  const pieces: Piece[] = [];
  for (const run of directionRuns(line.replace(BIDI_CONTROLS, '')).reverse()) {
    const tokens = run.text.split(/( +)/).filter(Boolean);
    if (run.direction === 'rtl') tokens.reverse();
    for (const token of tokens) {
      if (token.startsWith(' ')) pieces.push({ kind: 'space', count: token.length });
      else for (const text of wordPieces(token, run.direction)) pieces.push({ kind: 'text', text });
    }
  }
  return pieces;
}

/**
 * Breaks text into lines no wider than `maxWidth`, at spaces, in reading
 * order. `measure` gives a string's width (it does not depend on direction).
 * A single word wider than the limit gets a line of its own.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(candidate) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
