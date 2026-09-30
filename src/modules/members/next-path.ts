/**
 * Where to send a member after sign-in or profile completion: only same-site
 * account and course paths, never an outside URL (`//host`, `/\host`).
 */
export function safeMemberNext(value: unknown): string {
  return typeof value === 'string' &&
    /^\/(account|courses)(\/[\w\-/%]*)?$/.test(value) &&
    !value.includes('//')
    ? value
    : '/account';
}
