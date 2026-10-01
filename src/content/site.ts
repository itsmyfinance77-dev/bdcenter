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

/**
 * The 7 service tiles from the brief (§5). Training opens the on-site course
 * list, consulting and the service desk have their own intake forms, and the
 * rest render as an announced-soon card until their content arrives (OQ-BD-06).
 * `icon` names come from src/components/site/icons.tsx.
 */
export const serviceTiles = [
  {
    slug: 'training',
    title: 'آموزش و توانمندسازی',
    // On-site courses (ADR-0002); /courses still links to the Chamber's system.
    href: '/courses',
    isPlaceholder: false,
    icon: 'cap',
    cta: 'دوره‌های آموزشی',
  },
  {
    slug: 'consulting',
    title: 'مرکز مشاوره',
    summary: 'ویژه شرکت‌های فناور و دانش‌بنیان',
    description:
      'شرکت‌های فناور و دانش‌بنیان می‌توانند درخواست مشاوره خود را از طریق فرم زیر ثبت کنند.',
    isPlaceholder: false,
    icon: 'chat',
    cta: 'ثبت درخواست مشاوره',
  },
  { slug: 'industry-desk', title: 'میز صنعت', isPlaceholder: true, icon: 'factory' },
  {
    slug: 'service-desk',
    title: 'میز خدمت',
    href: '/forms/service-desk',
    isPlaceholder: false,
    icon: 'clipboard',
    cta: 'تکمیل فرم میز خدمت',
  },
  { slug: 'tech-events', title: 'رویدادهای فناورانه', isPlaceholder: true, icon: 'calendar' },
  { slug: 'experience-cafe', title: 'کافه تجربه', isPlaceholder: true, icon: 'cup' },
  { slug: 'investment-services', title: 'خدمات سرمایه‌گذاری', isPlaceholder: true, icon: 'trend' },
] as const;

export type ServiceTile = (typeof serviceTiles)[number];

/** Where a tile leads: its own page, or the generic /services/<slug> page. */
export function tileHref(tile: ServiceTile): string {
  return 'href' in tile ? tile.href : `/services/${tile.slug}`;
}

/** The "خدمات" dropdown in the header and mobile menu. */
export const servicesMenu = [
  { title: 'دوره‌های آموزشی', href: '/courses', icon: 'cap' },
  { title: 'مرکز مشاوره', href: '/services/consulting', icon: 'chat' },
  { title: 'رزرو نوبت مشاوره', href: '/appointments/consulting', icon: 'clock' },
  { title: 'رویدادها', href: '/events', icon: 'calendar' },
  { title: 'تقویم رویدادها', href: '/events/calendar', icon: 'calendar' },
  { title: 'میز خدمت', href: '/forms/service-desk', icon: 'clipboard' },
  { title: 'رزرو نوبت میز خدمت', href: '/appointments/service-desk', icon: 'clock' },
  { title: 'میز صنعت', href: '/services/industry-desk', icon: 'factory' },
] as const;

export const mainNav = [
  { title: 'فرم‌ها', href: '/forms' },
  { title: 'درباره مرکز', href: '/about' },
  { title: 'تماس با ما', href: '/contact' },
] as const;

/** Icons for the Chamber links (matched by address); others get a plain link icon. */
export const chamberLinkIcons: Record<string, string> = {
  'https://yazdccima.com/services/registration/': 'card',
  'https://members.yazdccima.com/': 'database',
  'https://sad.yazdccima.com/': 'briefcase',
  'https://yazdccima.com/commission/': 'users',
  'https://yazdccima.com/research/': 'chart',
  'https://yazdccima.com/inter/': 'globe',
  'https://yazdccima.com/event-group/Foreign-exhibition/': 'flag',
  'https://yazdccima.com/event-group/indoorexhibition/': 'building',
  'https://yazdccima.com/event-group/yazdevent/': 'spark',
};

/** Home page copy (BDC Yazd design). */
export const homeCopy = {
  heroBadge: 'پارک علم و فناوری یزد',
  heroLead:
    'بستری مناسب برای معرفی ایده‌ها، طرح‌ها و ظرفیت‌های نوآورانه به صنایع، واحدهای تولیدی و سرمایه‌گذاران',
  heroPrimary: 'مشاهده خدمات',
  heroSecondary: 'تماس با ما',
  ecosystemLabel:
    'مرکز توسعه کسب‌وکار، حلقه اتصال پارک علم و فناوری، شرکت‌های فناور و دانش‌بنیان، صنایع، دولت و دانشگاه',
  ecosystem: ['پارک علم و فناوری', 'شرکت‌های فناور و دانش‌بنیان', 'صنایع', 'دولت', 'دانشگاه'],
  aboutKicker: 'نمای مرکز',
  aboutTitle: 'درباره مرکز',
  aboutHint: 'برای خواندن معرفی، نشانگر را روی تصویر ببرید یا دکمه را بزنید.',
  aboutPhotoAlt: 'سردر مرکز توسعه کسب‌وکار اتاق بازرگانی یزد',
  aboutOpen: 'مطالعه معرفی مرکز',
  aboutClose: 'بستن معرفی',
  aboutPanelLabel: 'متن معرفی مرکز',
  newsTitle: 'اخبار و رویدادها',
  newsEmpty: 'به‌زودی از طریق داشبورد مدیریت محتوا منتشر می‌شود.',
  allNews: 'همه اخبار',
  allEvents: 'همه رویدادها',
  readMore: 'ادامه مطلب',
  newsPlay: 'پخش خودکار اخبار',
  newsPause: 'توقف پخش خودکار اخبار',
  newsPrev: 'مورد قبلی',
  newsNext: 'مورد بعدی',
  servicesTitle: 'خدمات مرکز',
  live: 'فعال',
  soon: 'به‌زودی',
  soonText: 'اطلاعات این بخش به‌زودی اضافه می‌شود',
  moreInfo: 'اطلاعات بیشتر',
  chamberTitle: 'دسترسی به خدمات اتاق بازرگانی یزد',
  chamberLead: 'پیوندها در سایت اتاق بازرگانی یزد باز می‌شوند.',
  newWindow: '(در پنجره جدید باز می‌شود)',
  backToTop: 'بازگشت به بالا',
  skipIntro: 'رد شدن',
} as const;

/** Header link to the member area; /account redirects to sign-in when needed. */
export const accountLink = { title: 'حساب کاربری', href: '/account' } as const;

/** Intro copy for the service detail pages. Only what the brief states. */
export const servicePageCopy = {
  consulting:
    'شرکت‌های فناور و دانش‌بنیان می‌توانند درخواست مشاوره خود را از طریق فرم زیر ثبت کنند.',
  bookingPrompt: 'می‌خواهید مستقیم با یکی از مشاوران وقت بگیرید؟',
  bookingLink: 'رزرو نوبت مشاوره',
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

/** Events calendar (/events/calendar) and "add to calendar" links. */
export const calendarCopy = {
  title: 'تقویم رویدادها',
  lead: 'رویدادها و دوره‌های آموزشی مرکز به تفکیک روز.',
  feedName: 'رویدادها و دوره‌های مرکز توسعه کسب‌وکار اتاق یزد',
  months: [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ],
  weekdays: ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'],
  previous: 'ماه قبل',
  next: 'ماه بعد',
  thisMonth: 'این ماه',
  monthList: 'برنامه‌های این ماه',
  empty: 'در این ماه رویداد یا دوره‌ای ثبت نشده است.',
  kind: { event: 'رویداد', course: 'دوره' },
  addToCalendar: 'افزودن به تقویم گوشی',
  addToCalendarHint: 'فایل تقویم دانلود می‌شود؛ با باز کردن آن، برنامه به تقویم گوشی اضافه می‌شود.',
  subscribe: 'اشتراک در تقویم مرکز',
  subscribeHint:
    'این نشانی را در برنامه تقویم (مثلاً Google Calendar یا تقویم آیفون) به‌عنوان «تقویم از روی نشانی اینترنتی» اضافه کنید تا برنامه‌های تازه خودکار اضافه شوند.',
} as const;
