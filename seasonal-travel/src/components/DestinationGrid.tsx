"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecommendationsResponse } from "@/lib/types";
import { AgentConfigBanner } from "./AgentConfigBanner";
import { DestinationCard } from "./DestinationCard";
import { LoadingGrid } from "./LoadingGrid";

export function DestinationGrid() {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<string[]>([]);
  const refreshLockRef = useRef(false);

  const fetchRecommendations = useCallback(async (excludeIds: string[]) => {
    const response = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exclude: excludeIds }),
    });

    const payload = (await response.json()) as RecommendationsResponse;

    if (!payload.agentConfigured) {
      return payload;
    }

    if (!response.ok || payload.agentError) {
      throw new Error(payload.agentError ?? "Could not load destinations");
    }

    return payload;
  }, []);

  const loadBatch = useCallback(
    async (excludeIds: string[], isRefresh = false) => {
      if (refreshLockRef.current) return;
      refreshLockRef.current = true;
      setLoading(true);
      if (isRefresh) setError(null);

      try {
        const next = await fetchRecommendations(excludeIds);

        if (!next.agentConfigured) {
          setData(next);
          return;
        }

        const newIds = next.recommendations.map((d) => d.id);
        seenIdsRef.current = [...new Set([...seenIdsRef.current, ...newIds])];
        setData(next);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Try again.",
        );
      } finally {
        setLoading(false);
        refreshLockRef.current = false;
      }
    },
    [fetchRecommendations],
  );

  useEffect(() => {
    loadBatch([], false);
  }, [loadBatch]);

  const handleRefresh = () => loadBatch(seenIdsRef.current, true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "r" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleRefresh();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRefresh]);

  if (loading && !data) {
    return (
      <LoadingGrid
        message="Agent is reading the calendar, choosing places, writing mini plans, and fetching place-bound photos…"
      />
    );
  }

  const context = data?.context;
  const configured = data?.agentConfigured ?? false;

  return (
    <>
      <AgentConfigBanner configured={configured} error={data?.agentError ?? error ?? undefined} />

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 border-b border-ink/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-terracotta">
              {context?.dateLabel ?? "Today"}
            </p>
            <h2 className="mt-2 font-display text-4xl text-ink sm:text-5xl">
              {context?.seasonLabel ?? "Seasonal picks"}
            </h2>
            <p className="mt-3 max-w-xl text-base text-ink/70">
              Six AI-curated destinations for {context?.monthName ?? "this month"} —
              agent picks, plans, and fetches a Wikipedia or Unsplash photo per place.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || !configured}
            className="inline-flex items-center justify-center gap-2 self-start rounded-sm bg-terracotta px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-parchment transition hover:bg-terracotta/90 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-parchment/30 border-t-parchment" />
                Agent running
              </>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v6h6M20 20v-6h-6M5 19a9 9 0 0114-7.5M19 5a9 9 0 00-14 7.5"
                  />
                </svg>
                Refresh picks
              </>
            )}
          </button>
        </div>

        {error && configured && (
          <div
            role="alert"
            className="mb-6 rounded-sm border border-terracotta/30 bg-terracotta/10 px-4 py-3 text-sm text-terracotta"
          >
            {error}
          </div>
        )}

        <div
          className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}
          aria-busy={loading}
        >
          {data?.recommendations.map((destination, index) => (
            <DestinationCard
              key={`${destination.id}-${destination.imageUrl}`}
              destination={destination}
              index={index}
            />
          ))}
        </div>

        {configured && !loading && data?.recommendations.length === 0 && (
          <p className="py-16 text-center text-ink/60">
            No destinations returned. Try refreshing.
          </p>
        )}
      </section>
    </>
  );
}
