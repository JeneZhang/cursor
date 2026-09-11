export function SiteHeader() {
  return (
    <header className="border-b border-ink/10 bg-parchment/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-sage">
            Field Notes
          </p>
          <h1 className="font-display text-2xl text-ink sm:text-3xl">
            Where to Go <em className="not-italic text-terracotta">Now</em>
          </h1>
        </div>
        <p className="hidden max-w-xs text-right text-xs leading-relaxed text-ink/60 sm:block">
          AI travel agent — seasonal picks on demand.
          <br />
          Wikipedia &amp; Unsplash photos bound to each place.
        </p>
      </div>
    </header>
  );
}
