/**
 * Persian-aware substring search. Text and query are compared after the same
 * normalization: Arabic ي/ك become Persian ی/ک, the half-space (ZWNJ) becomes
 * a space, Latin digits become Persian ones and case is folded. A query
 * matches when every word of it (2+ letters) appears somewhere in the text.
 *
 * The SQL is assembled as text with numbered parameters (`SqlParams`) rather
 * than nested `Prisma.sql` fragments: inside the Next.js bundle a fragment is
 * not always recognized as one and would be sent as a JSON value instead.
 * Only column expressions written in this codebase go into the text; every
 * user-supplied value goes through `SqlParams.add`.
 */

const ZWNJ = String.fromCharCode(0x200c);
const FROM = `يك${ZWNJ}0123456789`;
const TO = 'یک ۰۱۲۳۴۵۶۷۸۹';

export const MAX_QUERY_LENGTH = 100;

export function normalizeSearchText(text: string): string {
  let result = text.toLowerCase();
  for (let i = 0; i < FROM.length; i++) result = result.replaceAll(FROM[i]!, TO[i]!);
  return result.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0x06f0 - 0x0660));
}

/** The words to look for: at most 6, each at least 2 characters. */
export function searchTerms(query: string): string[] {
  return normalizeSearchText(query.slice(0, MAX_QUERY_LENGTH))
    .split(/[\s،,.;:!?«»()"'-]+/)
    .filter((term) => term.length >= 2)
    .slice(0, 6);
}

function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Collects query parameters and hands out their `$n` placeholders. */
export class SqlParams {
  readonly values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

/** The same normalization in SQL, applied to one trusted column expression. */
function normalized(column: string, params: SqlParams): string {
  return `translate(lower(coalesce(${column}, '')), ${params.add(FROM)}, ${params.add(TO)})`;
}

/** A WHERE condition: every term appears in at least one of `columns`. */
export function matchesAllTerms(columns: string[], terms: string[], params: SqlParams): string {
  const haystack = columns.map((column) => normalized(column, params)).join(` || ' ' || `);
  return terms.map((term) => `((${haystack}) LIKE ${params.add(likePattern(term))})`).join(' AND ');
}

/** A 0/1 score: 1 when every term is in `column` (ranks title hits first). */
export function allTermsIn(column: string, terms: string[], params: SqlParams): string {
  return `(CASE WHEN ${matchesAllTerms([column], terms, params)} THEN 1 ELSE 0 END)`;
}
