import { describe, expect, it } from 'vitest';
import { renderCertificatePdf, verificationUrl } from '@/modules/training/certificate-pdf';
import {
  certificateAvailable,
  certificateDates,
  generateCertificateCode,
  normalizeCertificateCode,
} from '@/modules/training/certificates';

describe('certificate codes', () => {
  it('generates distinct codes from the unambiguous alphabet', () => {
    const codes = new Set(Array.from({ length: 200 }, generateCertificateCode));
    expect(codes.size).toBe(200);
    for (const code of codes)
      expect(code).toMatch(/^BDC-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it('accepts codes however they are typed', () => {
    expect(normalizeCertificateCode('BDC-7K2M-9QX4')).toBe('BDC-7K2M-9QX4');
    expect(normalizeCertificateCode(' bdc 7k2m 9qx4 ')).toBe('BDC-7K2M-9QX4');
    expect(normalizeCertificateCode('7K2M9QX4')).toBe('BDC-7K2M-9QX4');
    // Persian digits and look-alike letters.
    expect(normalizeCertificateCode('BDC-۷K2M-۹QX۴')).toBe('BDC-7K2M-9QX4');
    expect(normalizeCertificateCode('BDC-OK2M-IQXL')).toBe('BDC-0K2M-1QX1');
  });

  it('rejects anything that cannot be a code', () => {
    for (const input of [
      '',
      'BDC',
      'BDC-7K2M-9QX',
      'BDC-7K2M-9QX44',
      'BDC-UUUU-0000',
      'abc',
      '<script>',
    ]) {
      expect(normalizeCertificateCode(input)).toBeNull();
    }
  });
});

describe('certificate rules', () => {
  const course = { certificateEnabled: true };

  it('is downloadable only for DONE enrollments with a valid or issuable certificate', () => {
    expect(certificateAvailable({ status: 'DONE', course, certificate: null })).toBe(true);
    expect(certificateAvailable({ status: 'ACCEPTED', course, certificate: null })).toBe(false);
    expect(
      certificateAvailable({
        status: 'DONE',
        course: { certificateEnabled: false },
        certificate: null,
      }),
    ).toBe(false);
    // Already issued: stays available even if the course stops issuing new ones.
    expect(
      certificateAvailable({
        status: 'DONE',
        course: { certificateEnabled: false },
        certificate: { revokedAt: null },
      }),
    ).toBe(true);
    expect(
      certificateAvailable({ status: 'DONE', course, certificate: { revokedAt: new Date() } }),
    ).toBe(false);
  });

  it('describes the course dates in Jalali', () => {
    const from = new Date('2026-10-02T06:00:00Z');
    const to = new Date('2026-10-30T10:00:00Z');
    expect(certificateDates({ courseStartsAt: from, courseEndsAt: to })).toBe(
      ' از ۱۰ مهر ۱۴۰۵ تا ۸ آبان ۱۴۰۵',
    );
    expect(certificateDates({ courseStartsAt: from, courseEndsAt: null })).toBe(' در ۱۰ مهر ۱۴۰۵');
    expect(certificateDates({ courseStartsAt: null, courseEndsAt: null })).toBe('');
  });
});

describe('certificate PDF', () => {
  it('renders a one-page PDF with embedded fonts', async () => {
    const pdf = await renderCertificatePdf(
      {
        id: 'c',
        code: 'BDC-7K2M-9QX4',
        enrollmentId: 'e',
        fullName: 'سارا محمدی‌نژاد',
        courseTitle: 'آموزش Microsoft Excel پیشرفته برای مدیران مالی و حسابداران (دورهٔ ۲)',
        courseStartsAt: new Date('2026-10-02T06:00:00Z'),
        courseEndsAt: null,
        signatory: 'نام امضاکننده',
        signatoryTitle: 'سمت',
        issuedAt: new Date('2026-11-01T08:00:00Z'),
        revokedAt: null,
      },
      'https://bdcenter.example',
    );
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text.match(/\/Type \/Page\b/g)).toHaveLength(1);
    expect(text).toContain('/FontFile2'); // Vazirmatn embedded (subset)
    expect(text).not.toContain('/Helvetica'); // the default font is never loaded
  });

  it('points the QR code at the verification page', () => {
    expect(verificationUrl('https://bdcenter.example/', 'BDC-7K2M-9QX4')).toBe(
      'https://bdcenter.example/certificates/BDC-7K2M-9QX4',
    );
  });
});
