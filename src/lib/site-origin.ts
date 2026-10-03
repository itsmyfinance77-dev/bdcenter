import { headers } from 'next/headers';
import { servedOverHttps } from './https';

/**
 * The address visitors reach this site at, for links they copy into other
 * apps (calendar subscriptions). The real deployment uses NEXT_PUBLIC_SITE_URL;
 * development and the plain-HTTP preview use the host the visitor typed, so
 * a link made on the LAN preview points back at the LAN preview.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (servedOverHttps() && configured) return new URL(configured).origin;
  const host = (await headers()).get('host');
  return host ? `http://${host}` : (configured ?? 'http://localhost:3010');
}
