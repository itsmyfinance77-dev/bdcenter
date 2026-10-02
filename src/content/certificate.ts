/**
 * Wording of the course-completion certificate. DRAFT until the center
 * settles the text, signatory and legal status (OQ-BD-16): it states only
 * that the course was completed, nothing about grades, credits or
 * accreditation. Certificates are off for every course until an admin turns
 * them on.
 */
export const certificateCopy = {
  title: 'گواهی پایان دوره',
  issuer: 'مرکز توسعه کسب‌وکار اتاق بازرگانی، صنایع، معادن و کشاورزی یزد',
  /** Printed in order around the large name and course title. */
  intro: 'بدین‌وسیله گواهی می‌شود',
  beforeCourse: 'دورهٔ آموزشی',
  /** {dates} becomes the course dates, or disappears when the course has none. */
  outro: 'را{dates} به پایان رسانده است.',
  dates: ' از {from} تا {to}',
  singleDate: ' در {from}',
  issuedOn: 'تاریخ صدور: {date}',
  code: 'شمارهٔ گواهی: {code}',
  verify: 'استعلام اعتبار: {url}',
  verifyHint: 'برای استعلام، کد QR را اسکن کنید یا شماره را در نشانی زیر وارد کنید.',
} as const;

/** Labels of the public verification page (/certificates). */
export const certificateVerifyCopy = {
  title: 'استعلام گواهی',
  lead: 'شمارهٔ چاپ‌شده روی گواهی پایان دوره را وارد کنید تا اعتبار آن بررسی شود.',
  label: 'شمارهٔ گواهی',
  submit: 'استعلام',
  valid: 'این گواهی معتبر است.',
  revoked: 'این گواهی باطل شده است.',
  notFound: 'گواهی‌ای با این شماره پیدا نشد. شماره را دوباره بررسی کنید.',
} as const;
