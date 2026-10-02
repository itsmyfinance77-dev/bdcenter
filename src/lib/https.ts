/**
 * Whether the site is served over HTTPS. True in production, so cookies are
 * `Secure` and browsers are told to stay on HTTPS (HSTS,
 * upgrade-insecure-requests in next.config.ts).
 *
 * `INSECURE_HTTP_PREVIEW=1` turns this off for a production build viewed over
 * plain HTTP on a LAN or a bare IP address (`npm run preview`). Never set it
 * on the real deployment: passwords and session cookies would travel
 * unencrypted.
 */
export function servedOverHttps(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === 'production' && env.INSECURE_HTTP_PREVIEW !== '1';
}
