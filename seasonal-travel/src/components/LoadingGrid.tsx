export function LoadingGrid({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <div className="mb-10 flex items-center gap-3 border-b border-ink/10 pb-8">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-terracotta/30 border-t-terracotta" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-terracotta">
            Travel agent running
          </p>
          <p className="mt-1 text-sm text-ink/70">{message}</p>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse overflow-hidden rounded-sm border border-ink/10 bg-parchment"
          >
            <div className="aspect-[4/3] bg-ink/10" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-2/3 rounded bg-ink/10" />
              <div className="h-3 w-full rounded bg-ink/10" />
              <div className="h-3 w-5/6 rounded bg-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
