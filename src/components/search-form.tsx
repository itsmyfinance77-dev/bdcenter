import { searchCopy } from '@/content/site';
import { MAX_QUERY_LENGTH } from '@/lib/search-text';

/** A plain GET form to /search; works without JavaScript. */
export function SearchForm({
  defaultValue = '',
  large = false,
  id = 'site-search',
}: {
  defaultValue?: string;
  large?: boolean;
  id?: string;
}) {
  return (
    <form action="/search" method="get" role="search" className="flex gap-2">
      <label htmlFor={id} className="sr-only">
        {searchCopy.label}
      </label>
      <input
        id={id}
        type="search"
        name="q"
        defaultValue={defaultValue}
        maxLength={MAX_QUERY_LENGTH}
        placeholder={searchCopy.placeholder}
        className={`min-w-0 flex-1 rounded-control border border-line bg-white text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
          large ? 'px-4 py-2.5 text-base' : 'w-40 px-3 py-1.5 text-sm'
        }`}
      />
      <button
        type="submit"
        className={`rounded-control bg-primary font-semibold text-white hover:bg-primary-hover ${
          large ? 'px-5 py-2.5 text-sm' : 'px-3 py-1.5 text-xs'
        }`}
      >
        {searchCopy.button}
      </button>
    </form>
  );
}
