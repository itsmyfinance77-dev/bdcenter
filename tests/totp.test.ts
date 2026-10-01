import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  hotp,
  otpauthUri,
  verifyTotp,
} from '@/modules/auth/totp';

// RFC 6238 appendix B uses the ASCII secret "12345678901234567890" (SHA-1).
const rfcSecret = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP', () => {
  it('matches the RFC 6238 test vectors', () => {
    const key = base32Decode(rfcSecret);
    expect(hotp(key, Math.floor(59 / 30), 8)).toBe('94287082');
    expect(hotp(key, Math.floor(1111111109 / 30), 8)).toBe('07081804');
    expect(hotp(key, Math.floor(2000000000 / 30), 8)).toBe('69279037');
  });

  it('round-trips base32', () => {
    const bytes = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 7]);
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(rfcSecret).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });

  it('accepts the current and neighbouring steps once, and nothing else', () => {
    const key = base32Decode(rfcSecret);
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / 30);
    const code = hotp(key, step);
    expect(verifyTotp(rfcSecret, code, now, null)).toBe(step);
    expect(verifyTotp(rfcSecret, code, now, step)).toBeNull(); // replay
    expect(verifyTotp(rfcSecret, hotp(key, step - 1), now, null)).toBe(step - 1);
    expect(verifyTotp(rfcSecret, hotp(key, step + 1), now, null)).toBe(step + 1);
    expect(verifyTotp(rfcSecret, hotp(key, step - 3), now, null)).toBeNull();
    expect(verifyTotp(rfcSecret, '12345', now, null)).toBeNull();
  });

  it('builds an otpauth address for authenticator apps', () => {
    const uri = otpauthUri(rfcSecret, 'admin@bdcenter.ir', 'BDC Yazd');
    expect(uri).toMatch(/^otpauth:\/\/totp\/BDC%20Yazd%3Aadmin%40bdcenter\.ir\?/);
    expect(new URL(uri).searchParams.get('secret')).toBe(rfcSecret);
  });
});

describe('recovery codes and secret encryption', () => {
  it('generates distinct codes and hashes them independent of formatting', () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(hashRecoveryCode(codes[0]!.toUpperCase().replace(/-/g, ' '))).toBe(
      hashRecoveryCode(codes[0]!),
    );
  });

  it('encrypts with AES-GCM and refuses tampering', () => {
    process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    const sealed = encryptSecret(rfcSecret);
    expect(sealed).not.toContain(rfcSecret);
    expect(decryptSecret(sealed)).toBe(rfcSecret);
    const parts = sealed.split('.');
    parts[3] = Buffer.from('tampered').toString('base64url');
    expect(() => decryptSecret(parts.join('.'))).toThrow();
  });
});
