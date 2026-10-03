import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  deletePage,
  getPageForAdmin,
  getPublishedPage,
  getSystemPageContent,
  getPageRevision,
  listPageRevisions,
  listPublishedSystemPages,
  restorePageRevision,
  savePage,
} from '@/modules/pages/service';

/** Built-in and custom pages against the dev database; everything is removed afterwards. */

const PREFIX = 'test-pages-';
let actorId: string;
let privacyBefore: Awaited<ReturnType<typeof prisma.page.findUnique>>;

async function cleanup() {
  await prisma.page.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

beforeAll(async () => {
  await cleanup();
  privacyBefore = await prisma.page.findUnique({ where: { slug: 'privacy' } });
  const admin = await prisma.adminUser.create({
    data: { fullName: 'test', email: `${PREFIX}pages@bdcenter.test`, passwordHash: 'x' },
  });
  actorId = admin.id;
});

afterAll(async () => {
  await cleanup();
  // Put the real privacy page back exactly as it was.
  await prisma.page.deleteMany({ where: { slug: 'privacy' } });
  if (privacyBefore) await prisma.page.create({ data: privacyBefore as never });
  await prisma.auditLog.deleteMany({ where: { actorId } });
  await prisma.adminUser.delete({ where: { id: actorId } });
  await prisma.$disconnect();
});

const input = (overrides: Record<string, unknown> = {}) => ({
  title: 'عنوان',
  slug: undefined,
  body: 'متن',
  seoDesc: undefined,
  status: 'PUBLISHED' as const,
  ...overrides,
});

describe('built-in pages', () => {
  it('starts the editor from the draft and keeps its slug', async () => {
    await prisma.page.deleteMany({ where: { slug: 'privacy' } });
    const draft = await getPageForAdmin('privacy');
    expect(draft).toMatchObject({ exists: false, isSystem: true, status: 'DRAFT' });
    expect(draft!.html).toContain('شماره همراه');
    expect(await getSystemPageContent('privacy')).toBeNull();

    // A slug in the input is ignored for built-in pages.
    const saved = await savePage('privacy', input({ slug: 'other', status: 'DRAFT' }), actorId);
    expect(saved).toEqual({ ok: true, slug: 'privacy' });
    expect(await getSystemPageContent('privacy')).toBeNull();
    expect((await listPublishedSystemPages()).map((p) => p.slug)).not.toContain('privacy');

    await savePage('privacy', input({ body: 'نسخه منتشرشده' }), actorId);
    expect((await getSystemPageContent('privacy'))?.body).toBe('نسخه منتشرشده');
    expect((await listPublishedSystemPages()).map((p) => p.path)).toContain('/privacy');
    expect(await deletePage('privacy', actorId)).toBe(false);
  });

  it('falls back to the approved about text until one is published', async () => {
    const about = await prisma.page.findUnique({ where: { slug: 'about' } });
    if (about?.status === 'PUBLISHED') return; // a real edit exists; nothing to check
    expect((await getSystemPageContent('about'))?.body).toContain('اتاق بازرگانی');
  });
});

describe('custom pages', () => {
  it('creates, renames, refuses clashes and reserved slugs, and deletes', async () => {
    const created = await savePage(null, input({ slug: `${PREFIX}one` }), actorId);
    expect(created).toEqual({ ok: true, slug: `${PREFIX}one` });
    expect(await getPublishedPage(`${PREFIX}one`)).toMatchObject({ body: 'متن' });

    await savePage(null, input({ slug: `${PREFIX}two` }), actorId);
    expect(await savePage(`${PREFIX}one`, input({ slug: `${PREFIX}two` }), actorId)).toMatchObject({
      ok: false,
      errors: { slug: expect.any(String) },
    });
    expect(await savePage(null, input({ slug: 'terms' }), actorId)).toMatchObject({ ok: false });
    expect(await savePage(null, input({ slug: 'a b!' }), actorId)).toEqual({
      ok: true,
      slug: 'a-b',
    });
    await prisma.page.deleteMany({ where: { slug: 'a-b' } });

    expect(await savePage(`${PREFIX}one`, input({ slug: `${PREFIX}renamed` }), actorId)).toEqual({
      ok: true,
      slug: `${PREFIX}renamed`,
    });
    expect(await getPublishedPage(`${PREFIX}one`)).toBeNull();

    await savePage(
      `${PREFIX}renamed`,
      input({ slug: `${PREFIX}renamed`, status: 'DRAFT' }),
      actorId,
    );
    expect(await getPublishedPage(`${PREFIX}renamed`)).toBeNull();
    expect(await deletePage(`${PREFIX}renamed`, actorId)).toBe(true);
  });
});

describe('page history', () => {
  it('keeps the replaced content and puts it back on request', async () => {
    const slug = `${PREFIX}history`;
    await savePage(null, input({ slug, title: 'نسخهٔ یک', body: '<p>متن اول</p>' }), actorId);
    // Saving the same content again adds no version.
    await savePage(slug, input({ slug, title: 'نسخهٔ یک', body: '<p>متن اول</p>' }), actorId);
    expect(await listPageRevisions(slug)).toHaveLength(0);

    await savePage(slug, input({ slug, title: 'نسخهٔ دو', body: '<p>متن دوم</p>' }), actorId);
    const [first] = await listPageRevisions(slug);
    expect(first?.title).toBe('نسخهٔ یک');
    expect((await getPageRevision(slug, first!.id))?.html).toContain('متن اول');

    expect(await restorePageRevision(slug, first!.id, actorId)).toBe(true);
    const page = await getPageForAdmin(slug);
    expect(page?.title).toBe('نسخهٔ یک');
    expect(page?.html).toContain('متن اول');
    // The version the restore replaced is kept too.
    expect((await listPageRevisions(slug)).map((r) => r.title)).toEqual(['نسخهٔ دو', 'نسخهٔ یک']);
    expect(await restorePageRevision(`${PREFIX}other`, first!.id, actorId)).toBe(false);
  });
});
