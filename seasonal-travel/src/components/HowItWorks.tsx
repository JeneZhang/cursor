export function HowItWorks() {
  return (
    <aside className="mx-auto mb-6 max-w-7xl px-4 sm:px-6 lg:px-8">
      <details className="group rounded-sm border border-ink/10 bg-parchment/60 p-5">
        <summary className="cursor-pointer list-none font-display text-lg text-ink marker:content-none">
          How refresh &amp; photos work
          <span className="ml-2 text-sm text-ink/50 group-open:hidden">+</span>
          <span className="ml-2 hidden text-sm text-ink/50 group-open:inline">−</span>
        </summary>
        <div className="mt-4 grid gap-4 text-sm leading-relaxed text-ink/75 sm:grid-cols-2">
          <div>
            <h3 className="mb-1 font-semibold text-terracotta">On load &amp; Refresh</h3>
            <p>
              A travel agent (AI SDK + tool calling) reads today&apos;s date, searches
              a seasonal catalog, picks six places, writes mini plans, and calls{" "}
              <code className="text-xs">fetchPlacePhoto</code> for each. Refresh
              POSTs the currently shown catalog IDs as an exclude list so the agent
              must return a different batch — with new place-bound photos.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-semibold text-terracotta">Photos (locked)</h3>
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                <strong>Primary:</strong> Wikipedia page image for the exact destination
                name (that place, not random stock).
              </li>
              <li>
                <strong>Fallback:</strong> Unsplash search for the same destination
                name (<code className="text-xs">UNSPLASH_ACCESS_KEY</code> required).
              </li>
              <li>
                <strong>Card error:</strong> tries the alternate URL, then a labeled
                placeholder — never a blank frame.
              </li>
            </ol>
          </div>
        </div>
      </details>
    </aside>
  );
}
