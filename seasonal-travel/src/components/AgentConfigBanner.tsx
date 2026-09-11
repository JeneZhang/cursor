type Props = {
  configured: boolean;
  error?: string;
};

export function AgentConfigBanner({ configured, error }: Props) {
  if (configured && !error) return null;

  return (
    <div
      role="alert"
      className="mx-auto mb-8 max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-sm border-2 border-terracotta bg-terracotta/10 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
          {configured ? "Agent error" : "AI Gateway not configured"}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          {error ??
            "Set AI_GATEWAY_API_KEY in seasonal-travel/.env.local to enable the travel agent. This app does not fake recommendations when the gateway is missing."}
        </p>
        {!configured && (
          <pre className="mt-3 overflow-x-auto rounded-sm bg-ink/5 p-3 text-xs text-ink/80">
            cd seasonal-travel{"\n"}
            echo &apos;AI_GATEWAY_API_KEY=your_key&apos; &gt;&gt; .env.local{"\n"}
            npm run dev
          </pre>
        )}
      </div>
    </div>
  );
}
