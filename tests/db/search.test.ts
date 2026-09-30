import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { searchSite } from '@/modules/search/service';

/** Search against real rows; everything uses the `test-search-` slug prefix. */

const PREFIX = 'test-search-';
const ZWNJ = String.fromCharCode(0x200c);

async function cleanup() {
  await prisma.article.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.course.deleteMany({ where: { slug: { startsWith: PREFIX } } });
  await prisma.page.deleteMany({ where: { slug: { startsWith: PREFIX } } });
}

beforeAll(async () => {
  await cleanup();
  await prisma.article.createMany({
    data: [
      {
        kind: 'NEWS',
        slug: `${PREFIX}news`,
        title: 'نشست زنجفیل‌کاری',
        bodyMarkdown: `رویداد توسعه کسب${ZWNJ}وکار در سال ۱۴۰۵ با ۱۰۰% ظرفیت`,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      {
        kind: 'EVENT',
        slug: `${PREFIX}draft`,
        title: 'پیش‌نویس زنجفیل',
        bodyMarkdown: 'x',
        status: 'DRAFT',
      },
      {
        kind: 'EVENT',
        slug: `${PREFIX}event`,
        title: 'رویداد دیگر',
        bodyMarkdown: 'درباره زنجفیل هم هست',
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - 86_400_000),
      },
    ],
  });
  await prisma.course.create({
    data: {
      slug: `${PREFIX}course`,
      title: 'دوره زنجفیل',
      description: 'آموزش',
      instructor: 'استاد نمونه',
      status: 'PUBLISHED',
    },
  });
  await prisma.page.create({
    data: {
      slug: `${PREFIX}page`,
      title: 'صفحه نمونه',
      sections: [{ type: 'markdown', body: 'متن صفحه درباره زنجفیل' }],
      status: 'PUBLISHED',
    },
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('site search', () => {
  it('finds published items of every kind, title hits first, never drafts', async () => {
    const results = await searchSite('زنجفیل');
    expect(results?.articles.map((a) => a.slug)).toEqual([`${PREFIX}news`, `${PREFIX}event`]);
    expect(results?.courses.map((c) => c.slug)).toEqual([`${PREFIX}course`]);
    expect(results?.pages.map((p) => p.path)).toEqual([`/pages/${PREFIX}page`]);
  });

  it('matches across Arabic letters, half-spaces and digit scripts', async () => {
    expect((await searchSite('زنجفيل'))?.articles).toHaveLength(2); // Arabic ي
    expect((await searchSite('کسب وکار'))?.articles.map((a) => a.slug)).toEqual([`${PREFIX}news`]);
    expect((await searchSite('1405 رویداد'))?.articles.map((a) => a.slug)).toEqual([
      `${PREFIX}news`,
    ]);
  });

  it('needs every word and treats LIKE wildcards literally', async () => {
    expect((await searchSite('زنجفیل ناموجود'))?.total).toBe(0);
    expect((await searchSite('۱۰۰%'))?.articles.map((a) => a.slug)).toEqual([`${PREFIX}news`]);
    expect((await searchSite('%%'))?.total).toBe(0);
    expect((await searchSite('__'))?.total).toBe(0);
  });

  it('does not match page JSON keys', async () => {
    expect((await searchSite('markdown'))?.pages).toEqual([]);
  });

  it('returns null for queries without a usable word', async () => {
    expect(await searchSite('ا ب')).toBeNull();
  });
});
