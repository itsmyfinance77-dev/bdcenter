import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.service.createMany({
    data: [
      {
        slug: 'training',
        title: 'آموزش و توانمندسازی',
        externalUrl: 'https://yazdccima.com/services/edu',
        isPlaceholder: false,
        sortOrder: 1,
      },
      {
        slug: 'consulting',
        title: 'مرکز مشاوره',
        summary: 'ویژه شرکت‌های فناور و دانش‌بنیان',
        isPlaceholder: false,
        sortOrder: 2,
      },
      { slug: 'industry-desk', title: 'میز صنعت', isPlaceholder: true, sortOrder: 3 },
      { slug: 'service-desk', title: 'میز خدمت', isPlaceholder: false, sortOrder: 4 },
      { slug: 'tech-events', title: 'رویدادهای فناورانه', isPlaceholder: true, sortOrder: 5 },
      { slug: 'experience-cafe', title: 'کافه تجربه', isPlaceholder: true, sortOrder: 6 },
      {
        slug: 'investment-services',
        title: 'خدمات سرمایه‌گذاری',
        isPlaceholder: true,
        sortOrder: 7,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.externalLink.createMany({
    data: [
      {
        section: 'chamber-services',
        title: 'خدمات کارت بازرگانی و عضویت',
        url: 'https://yazdccima.com/services/registration/',
        sortOrder: 1,
      },
      {
        section: 'chamber-services',
        title: 'بانک اطلاعات اعضای اتاق بازرگانی یزد',
        url: 'https://members.yazdccima.com/',
        sortOrder: 2,
      },
      {
        section: 'chamber-services',
        title: 'مرکز علم و کار',
        url: 'https://sad.yazdccima.com/',
        sortOrder: 3,
      },
      {
        section: 'chamber-services',
        title: 'کمیسیون‌های اتاق بازرگانی یزد',
        url: 'https://yazdccima.com/commission/',
        sortOrder: 4,
      },
      {
        section: 'chamber-services',
        title: 'مرکز پژوهش‌های اقتصادی استان یزد',
        url: 'https://yazdccima.com/research/',
        sortOrder: 5,
      },
      {
        section: 'chamber-services',
        title: 'امور بین‌الملل',
        url: 'https://yazdccima.com/inter/',
        sortOrder: 6,
      },
      {
        section: 'chamber-services',
        title: 'نمایشگاه خارجی',
        url: 'https://yazdccima.com/event-group/Foreign-exhibition/',
        sortOrder: 7,
      },
      {
        section: 'chamber-services',
        title: 'نمایشگاه داخلی',
        url: 'https://yazdccima.com/event-group/indoorexhibition/',
        sortOrder: 8,
      },
      {
        section: 'chamber-services',
        title: 'رویدادهای تجاری اتاق یزد',
        url: 'https://yazdccima.com/event-group/yazdevent/',
        sortOrder: 9,
      },
    ],
    skipDuplicates: true,
  });

  // OQ-BD-09: field set mirrors a generic intake form until the Chamber's own
  // "میز خدمت" form is confirmed.
  const serviceDesk = await prisma.formDefinition.upsert({
    where: { slug: 'service-desk' },
    update: {},
    create: {
      slug: 'service-desk',
      title: 'میز خدمت',
      description: 'اعضا و فعالان اقتصادی می‌توانند درخواست یا مشکل خود را از این طریق ثبت کنند.',
      status: 'PUBLISHED',
      fields: {
        create: [
          {
            key: 'full_name',
            label: 'نام و نام خانوادگی',
            type: 'TEXT',
            isRequired: true,
            sortOrder: 1,
          },
          {
            key: 'company_name',
            label: 'نام شرکت/واحد',
            type: 'TEXT',
            isRequired: false,
            sortOrder: 2,
          },
          { key: 'phone', label: 'شماره تماس', type: 'PHONE', isRequired: true, sortOrder: 3 },
          { key: 'subject', label: 'موضوع درخواست', type: 'TEXT', isRequired: true, sortOrder: 4 },
          {
            key: 'description',
            label: 'توضیحات',
            type: 'TEXTAREA',
            isRequired: false,
            sortOrder: 5,
          },
          { key: 'attachment', label: 'پیوست', type: 'FILE', isRequired: false, sortOrder: 6 },
        ],
      },
    },
  });

  console.log('Seeded services, external links, and form:', serviceDesk.slug);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
