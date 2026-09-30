/**
 * Typed institutional copy for the "مرکز توسعه کسب‌وکار" microsite.
 * Reviewed, approved text lives here until it moves into the CMS `Page`
 * model (see ADR-0001). Components never hard-code copy inline.
 *
 * Source: employer brief, "الگوی صفحه سایت - مرکز کسب و کار.docx".
 */

export const siteInfo = {
  name: 'مرکز توسعه کسب‌وکار',
  parentOrg: 'اتاق بازرگانی، صنایع، معادن و کشاورزی یزد',
  domain: 'bdcenter.yazdccima.com',
  contact: {
    address: 'یزد، خیابان مطهری، پارک علم و فناوری اقبال',
    // OQ-BD-02, OQ-BD-03: postal code and email are not confirmed yet.
    postalCode: null as string | null,
    phone: '035-91091050',
    phoneExtension: null as string | null,
    email: null as string | null,
  },
} as const;

export const aboutText = `اتاق بازرگانی، صنایع، معادن و کشاورزی یزد به عنوان پارلمان بخش خصوصی، مأموریت خود را در ارائه خدمات و حمایت از فعالان اقتصادی و کارآفرینان استان تعریف کرده است. این نهاد در دوره دهم فعالیت خود، توجه ویژه‌ای به حوزه‌های نوآورانه و توسعه زیست‌بوم فناوری داشته و با هدف ایجاد ارتباطی مؤثر میان شرکت‌های فناور و دانش‌بنیان و واحدهای اقتصادی بزرگ، دفتر مرکز کسب‌وکار را در پارک علم و فناوری یزد راه‌اندازی کرده است. این مرکز با ارائه خدمات مشاوره‌ای، آموزشی، برگزاری رویدادهای فناورانه و نشست‌های تخصصی با کارآفرینان، بستری مناسب برای معرفی ایده‌ها، طرح‌ها و ظرفیت‌های نوآورانه به صنایع، واحدهای تولیدی و سرمایه‌گذاران فراهم می‌آورد. همچنین در مواردی که صنایع و بنگاه‌های اقتصادی به دنبال راهکارها و فناوری‌های نوین برای توسعه فعالیت‌های خود باشند، این مرکز نقش تسهیل‌گر و پل ارتباطی میان آن‌ها و شرکت‌های فناور و دانش‌بنیان را ایفا می‌کند. اتاق بازرگانی یزد بر این باور است که نوآوری و بهره‌گیری از ایده‌های خلاقانه، رمز پایداری، رشد و رقابت‌پذیری صنایع در دنیای امروز است و مرکز کسب‌وکار با همین رویکرد تلاش می‌کند زمینه‌ساز شکل‌گیری همکاری‌های مؤثر و آینده‌ساز برای نسل جدید صنعت و اقتصاد استان باشد.`;

/** The 7 service tiles from the brief (§5). Training links out to the Chamber,
 * consulting and the service desk have their own intake forms, and the rest
 * render as an announced-soon card until their content arrives (OQ-BD-06). */
export const serviceTiles = [
  {
    slug: 'training',
    title: 'آموزش و توانمندسازی',
    externalUrl: 'https://yazdccima.com/services/edu',
    isPlaceholder: false,
  },
  {
    slug: 'consulting',
    title: 'مرکز مشاوره',
    summary: 'ویژه شرکت‌های فناور و دانش‌بنیان',
    isPlaceholder: false,
  },
  { slug: 'industry-desk', title: 'میز صنعت', isPlaceholder: true },
  { slug: 'service-desk', title: 'میز خدمت', href: '/forms/service-desk', isPlaceholder: false },
  { slug: 'tech-events', title: 'رویدادهای فناورانه', isPlaceholder: true },
  { slug: 'experience-cafe', title: 'کافه تجربه', isPlaceholder: true },
  { slug: 'investment-services', title: 'خدمات سرمایه‌گذاری', isPlaceholder: true },
] as const;

/** Section 6 of the brief: outbound links to the parent chamber's own services. */
export const chamberServiceLinks = [
  { title: 'خدمات کارت بازرگانی و عضویت', url: 'https://yazdccima.com/services/registration/' },
  { title: 'بانک اطلاعات اعضای اتاق بازرگانی یزد', url: 'https://members.yazdccima.com/' },
  { title: 'مرکز علم و کار', url: 'https://sad.yazdccima.com/' },
  { title: 'کمیسیون‌های اتاق بازرگانی یزد', url: 'https://yazdccima.com/commission/' },
  { title: 'مرکز پژوهش‌های اقتصادی استان یزد', url: 'https://yazdccima.com/research/' },
  { title: 'امور بین‌الملل', url: 'https://yazdccima.com/inter/' },
  {
    title: 'نمایشگاه خارجی',
    url: 'https://yazdccima.com/event-group/Foreign-exhibition/',
  },
  {
    title: 'نمایشگاه داخلی',
    url: 'https://yazdccima.com/event-group/indoorexhibition/',
  },
  { title: 'رویدادهای تجاری اتاق یزد', url: 'https://yazdccima.com/event-group/yazdevent/' },
] as const;

export const mainNav = [
  {
    title: 'خدمات',
    children: [
      { title: 'آموزش', href: '/services/training' },
      { title: 'مرکز مشاوره', href: '/services/consulting' },
      { title: 'رویدادها', href: '/events' },
      { title: 'میز خدمت', href: '/forms/service-desk' },
      { title: 'میز صنعت', href: '/services/industry-desk' },
    ],
  },
  { title: 'فرم‌ها', href: '/forms' },
  { title: 'درباره مرکز', href: '/about' },
  { title: 'تماس با ما', href: '/contact' },
] as const;

/** Intro copy for the service detail pages. Only what the brief states. */
export const servicePageCopy = {
  training:
    'دوره‌های آموزشی و برنامه‌های توانمندسازی مرکز از طریق سامانه آموزش اتاق بازرگانی یزد ارائه می‌شود.',
  consulting:
    'شرکت‌های فناور و دانش‌بنیان می‌توانند درخواست مشاوره خود را از طریق فرم زیر ثبت کنند.',
  placeholder: 'اطلاعات این بخش به‌زودی اضافه می‌شود.',
} as const;
