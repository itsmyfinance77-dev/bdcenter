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

/** The 7 service tiles from the brief (§5). Training opens the on-site course
 * list, consulting and the service desk have their own intake forms, and the rest
 * render as an announced-soon card until their content arrives (OQ-BD-06). */
export const serviceTiles = [
  {
    slug: 'training',
    title: 'آموزش و توانمندسازی',
    // On-site courses (ADR-0002); /courses still links to the Chamber's system.
    href: '/courses',
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

export const mainNav = [
  {
    title: 'خدمات',
    children: [
      { title: 'دوره‌های آموزشی', href: '/courses' },
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

/** Header link to the member area; /account redirects to sign-in when needed. */
export const accountLink = { title: 'حساب کاربری', href: '/account' } as const;

/** Intro copy for the service detail pages. Only what the brief states. */
export const servicePageCopy = {
  consulting:
    'شرکت‌های فناور و دانش‌بنیان می‌توانند درخواست مشاوره خود را از طریق فرم زیر ثبت کنند.',
  placeholder: 'اطلاعات این بخش به‌زودی اضافه می‌شود.',
} as const;

/** Site search (/search). */
export const searchCopy = {
  title: 'جستجو',
  label: 'جستجو در سایت',
  placeholder: 'جستجو…',
  button: 'جستجو',
  hint: 'در اخبار، رویدادها، دوره‌ها و صفحه‌های سایت جستجو کنید.',
  tooShort: 'عبارت جستجو باید دست‌کم دو حرف داشته باشد.',
  none: (query: string) => `نتیجه‌ای برای «${query}» پیدا نشد.`,
  count: (count: string, query: string) => `${count} نتیجه برای «${query}»`,
} as const;
