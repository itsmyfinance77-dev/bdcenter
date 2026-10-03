import { describe, expect, it } from 'vitest';
import {
  isValidLegalNationalId,
  isValidNationalCode,
  legalNationalId,
  nationalCode,
  postalCode,
} from '@/lib/validation';
import { memberAccess, type IdentityState } from '@/modules/members/access';

const individual: IdentityState = {
  fullName: 'عضو',
  nationalId: '0499370899',
  postalCode: '8915713456',
  personType: 'INDIVIDUAL',
  companyName: null,
  legalNationalId: null,
  hasLetter: false,
  hasNationalCard: false,
  approval: 'NOT_REQUIRED',
};

const representative: IdentityState = {
  ...individual,
  personType: 'LEGAL',
  companyName: 'شرکت نمونه',
  legalNationalId: '10380284790',
  hasLetter: true,
  approval: 'PENDING',
};

describe('national code, legal id and postal code', () => {
  it('checks the national code check digit', () => {
    expect(isValidNationalCode('0499370899')).toBe(true);
    expect(isValidNationalCode('0790419904')).toBe(true);
    expect(isValidNationalCode('0499370898')).toBe(false);
    expect(isValidNationalCode('1111111111')).toBe(false);
    expect(isValidNationalCode('049937089')).toBe(false);
  });

  it('checks the legal national id check digit', () => {
    expect(isValidLegalNationalId('10380284790')).toBe(true);
    expect(isValidLegalNationalId('10380284791')).toBe(false);
    expect(isValidLegalNationalId('11111111111')).toBe(false);
  });

  it('accepts Persian digits, spaces and dashes', () => {
    expect(nationalCode.parse('۰۴۹۹-۳۷۰۸۹۹')).toBe('0499370899');
    expect(legalNationalId.parse('۱۰۳۸۰۲۸۴۷۹۰')).toBe('10380284790');
    expect(postalCode.parse('89157 13456')).toBe('8915713456');
    expect(postalCode.safeParse('123').success).toBe(false);
    expect(postalCode.safeParse('0000000000').success).toBe(false);
  });
});

describe('member access', () => {
  it('lets a complete individual in without review', () => {
    expect(memberAccess(individual, false)).toBe('ok');
  });

  it('needs every identity field', () => {
    expect(memberAccess({ ...individual, postalCode: null }, false)).toBe('incomplete');
    expect(memberAccess({ ...individual, personType: null }, false)).toBe('incomplete');
    expect(memberAccess({ ...individual, nationalId: '10380284790' }, false)).toBe('incomplete');
  });

  it('asks for the national card only when an ADMIN requires it', () => {
    expect(memberAccess(individual, true)).toBe('incomplete');
    expect(memberAccess({ ...individual, hasNationalCard: true }, true)).toBe('ok');
  });

  it('holds legal-entity representatives until an ADMIN approves them', () => {
    expect(memberAccess(representative, false)).toBe('pending');
    expect(memberAccess({ ...representative, approval: 'REJECTED' }, false)).toBe('rejected');
    expect(memberAccess({ ...representative, approval: 'APPROVED' }, false)).toBe('ok');
    expect(memberAccess({ ...representative, hasLetter: false, approval: 'APPROVED' }, false)).toBe(
      'incomplete',
    );
  });
});
