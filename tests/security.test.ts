import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from '@/modules/auth/session-token';
import { checkImageUpload, checkUploadContent } from '@/modules/files/service';

describe('session tokens', () => {
  it('accepts a token only for its own audience', async () => {
    const member = await signSession('user-1', 'member', 0);
    const admin = await signSession('user-1', 'admin', 0);
    expect(await verifySession(member, 'member')).toMatchObject({ uid: 'user-1', ver: 0 });
    expect(await verifySession(member, 'admin')).toBeNull();
    expect(await verifySession(admin, 'member')).toBeNull();
  });

  it('refuses a payload edited under a valid signature', async () => {
    const [, signature] = (await signSession('user-1', 'member', 0)).split('.');
    const forged = Buffer.from(
      JSON.stringify({ uid: 'user-1', aud: 'admin', ver: 0, exp: 9999999999 }),
    ).toString('base64url');
    expect(await verifySession(`${forged}.${signature}`, 'admin')).toBeNull();
  });

  it('refuses garbage', async () => {
    expect(await verifySession(undefined, 'admin')).toBeNull();
    expect(await verifySession('abc', 'admin')).toBeNull();
    expect(await verifySession('a.b.c', 'admin')).toBeNull();
  });
});

describe('upload content checks', () => {
  const png = () =>
    sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();

  it('accepts files whose bytes match their type', async () => {
    const bytes = await png();
    expect(await checkUploadContent(new File([bytes], 'a.png', { type: 'image/png' }))).toBeNull();
    const webp = await sharp(bytes).webp().toBuffer();
    expect(await checkUploadContent(new File([webp], 'a.webp', { type: 'image/webp' }))).toBeNull();
    expect(
      await checkUploadContent(new File(['%PDF-1.7'], 'a.pdf', { type: 'application/pdf' })),
    ).toBeNull();
  });

  it('refuses renamed files', async () => {
    const exe = new File(['MZ\x90\x00'], 'a.pdf', { type: 'application/pdf' });
    const html = new File(['<script>alert(1)</script>'], 'a.png', { type: 'image/png' });
    const pngAsWebp = new File([await png()], 'a.webp', { type: 'image/webp' });
    for (const file of [exe, html, pngAsWebp]) {
      expect(await checkUploadContent(file)).not.toBeNull();
    }
  });

  it('only takes JPG, PNG and WebP as cover images', () => {
    expect(checkImageUpload(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).not.toBeNull();
    expect(checkImageUpload(new File(['x'], 'a.svg', { type: 'image/svg+xml' }))).not.toBeNull();
    expect(checkImageUpload(new File(['x'], 'a.png', { type: 'image/png' }))).toBeNull();
  });
});
