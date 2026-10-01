import { Icon, type IconName } from '@/components/site/icons';

/** Content area under an inner page's title band (BDC Yazd design spacing). */
export function PageBody({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div
      className={`mx-auto px-[clamp(20px,4vw,32px)] pt-[clamp(40px,6vw,80px)] pb-[clamp(64px,8vw,104px)] ${
        narrow ? 'max-w-[864px]' : 'max-w-(--container-page)'
      }`}
    >
      {children}
    </div>
  );
}

/** White card holding a public form, with its heading and the required-fields note. */
export function FormCard({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-3xl border border-line bg-white p-[clamp(20px,3.5vw,36px)] shadow-[0_30px_60px_-48px_rgba(11,34,87,.5)]"
    >
      <div className="mb-6 flex flex-col gap-2">
        <h2 id={id} className="text-xl font-extrabold text-brand-900">
          {title}
        </h2>
        <p className="text-[13px] text-ink-2">فیلدهای ستاره‌دار الزامی است.</p>
        {note}
      </div>
      {children}
    </section>
  );
}

/** One line of contact information as a small card with an icon. */
export function InfoCard({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3.5 rounded-2xl border border-line bg-white p-4">
      <span className="grid size-10 flex-none place-items-center rounded-[11px] bg-primary-tint text-primary">
        <Icon name={icon} size={20} />
      </span>
      <span className="flex flex-col gap-0.5 text-[14.5px] leading-[1.8]">
        <span className="text-[13px] text-ink-2">{label}</span>
        {children}
      </span>
    </li>
  );
}
