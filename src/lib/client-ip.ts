import 'server-only';
import { headers } from 'next/headers';

/**
 * The visitor's address, for rate limiting and nothing else (it is never
 * stored with a submission).
 *
 * Next.js only fills in `X-Forwarded-For` when a request arrives without one,
 * so a visitor can send any value they like. Production runs behind a reverse
 * proxy: set CLIENT_IP_HEADER to the header that proxy overwrites (e.g.
 * `x-real-ip` with nginx `proxy_set_header X-Real-IP $remote_addr`).
 * Otherwise the last `X-Forwarded-For` entry is used — the one a proxy using
 * `$proxy_add_x_forwarded_for` appended, which a visitor cannot choose.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const configured = process.env.CLIENT_IP_HEADER?.trim().toLowerCase();
  const value = configured
    ? headerList.get(configured)
    : headerList.get('x-forwarded-for')?.split(',').at(-1);
  return value?.trim() || 'unknown';
}
