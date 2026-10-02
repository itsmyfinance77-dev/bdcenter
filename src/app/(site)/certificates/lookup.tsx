import { certificateVerifyCopy as copy } from '@/content/certificate';

/** GET form to /certificates; works without JavaScript. */
export function CertificateLookupForm({ defaultValue = '' }: { defaultValue?: string }) {
  return (
    <form action="/certificates" method="get" className="flex flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm font-semibold text-ink">
        {copy.label}
        <input
          name="code"
          defaultValue={defaultValue}
          required
          maxLength={40}
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          placeholder="BDC-XXXX-XXXX"
          className="rounded-control border border-line bg-white px-4 py-2.5 text-base font-normal tracking-wider text-ink uppercase focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        {copy.submit}
      </button>
    </form>
  );
}
