import { describe, expect, it } from 'vitest';
import { formAvailability, type FormRules } from '@/modules/forms/availability';

const open: FormRules = {
  opensAt: null,
  closesAt: null,
  maxSubmissions: null,
  membersOnly: false,
  onePerMember: false,
};
const now = new Date('2026-10-10T08:00:00Z');
const state = { now, submissions: 0, signedIn: false, memberAnswered: false };

describe('form availability', () => {
  it('follows the dates, the total limit and the members rules, in that order', () => {
    expect(formAvailability(open, state)).toBe('open');
    expect(formAvailability({ ...open, opensAt: new Date('2026-10-11') }, state)).toBe('not-yet');
    expect(formAvailability({ ...open, closesAt: now }, state)).toBe('closed');
    expect(formAvailability({ ...open, maxSubmissions: 3 }, { ...state, submissions: 2 })).toBe(
      'open',
    );
    expect(formAvailability({ ...open, maxSubmissions: 3 }, { ...state, submissions: 3 })).toBe(
      'full',
    );
    const members = { ...open, membersOnly: true, onePerMember: true };
    expect(formAvailability(members, state)).toBe('sign-in');
    expect(formAvailability(members, { ...state, signedIn: true })).toBe('open');
    expect(formAvailability(members, { ...state, signedIn: true, memberAnswered: true })).toBe(
      'already',
    );
    // A closed form says "closed" even to someone not signed in.
    expect(formAvailability({ ...members, closesAt: now }, state)).toBe('closed');
  });
});
