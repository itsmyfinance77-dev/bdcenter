/**
 * Whether a form takes answers right now (owner's request 2026-10-04,
 * advanced form builder, package B): its dates, its total limit and its
 * members-only rules. Kept free of database code for unit tests.
 */

export type FormRules = {
  opensAt: Date | null;
  closesAt: Date | null;
  maxSubmissions: number | null;
  membersOnly: boolean;
  onePerMember: boolean;
};

export type FormAvailability =
  | 'open'
  | 'not-yet'
  | 'closed'
  | 'full'
  /** Members-only and nobody is signed in. */
  | 'sign-in'
  /** One answer per member and this member already sent one. */
  | 'already';

export function formAvailability(
  rules: FormRules,
  state: { now: Date; submissions: number; signedIn: boolean; memberAnswered: boolean },
): FormAvailability {
  if (rules.opensAt && state.now < rules.opensAt) return 'not-yet';
  if (rules.closesAt && state.now >= rules.closesAt) return 'closed';
  if (rules.maxSubmissions !== null && state.submissions >= rules.maxSubmissions) return 'full';
  if (rules.membersOnly && !state.signedIn) return 'sign-in';
  if (rules.membersOnly && rules.onePerMember && state.memberAnswered) return 'already';
  return 'open';
}
