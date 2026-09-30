/**
 * Signed, stateless admin session token: `base64url(payload).base64url(hmac)`.
 * Uses Web Crypto only, so middleware (Edge) and server code share it.
 * The token proves identity; role and `isActive` are re-read from the
 * database on every request, so deactivating a user takes effect at once.
 */

export const SESSION_COOKIE = 'bd_admin';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type SessionPayload = { uid: string; exp: number };

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

let cachedKey: Promise<CryptoKey> | null = null;

function signingKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters.');
  }
  cachedKey ??= crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  return cachedKey;
}

export async function signSession(uid: string): Promise<string> {
  const payload: SessionPayload = {
    uid,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the payload if the signature is valid and the token is not expired. */
export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await signingKey(),
      fromBase64Url(signature),
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null;
    return payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}
