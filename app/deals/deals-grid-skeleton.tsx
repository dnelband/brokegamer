import { DEFAULT_PAGE_SIZE } from "@/lib/deals/filters";

export function DealCardSkeleton() {
  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-lg border border-stroke bg-surface"
      aria-hidden
    >
      <div className="aspect-[3/4] animate-pulse bg-surface-2" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="h-4 min-h-[2.5rem] w-[80%] animate-pulse rounded bg-surface-2" />
        <div className="mt-auto h-3 w-1/2 animate-pulse rounded bg-surface-2" />
      </div>
    </article>
  );
}

export function DealsGridSkeleton({
  count = DEFAULT_PAGE_SIZE,
}: {
  count?: number;
}) {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: count }, (_, index) => (
          <li key={index} className="h-full">
            <DealCardSkeleton />
          </li>
        ))}
      </ul>
      <span className="sr-only">Loading deals…</span>
    </div>
  );
}

export function DealFiltersSkeleton() {
  return (
    <div
      className="h-9 w-24 animate-pulse rounded-md border border-stroke bg-surface"
      aria-hidden
    />
  );
}
