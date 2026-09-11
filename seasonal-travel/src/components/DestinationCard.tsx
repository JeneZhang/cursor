"use client";

import { useEffect, useState } from "react";
import type { Recommendation } from "@/lib/types";

type Props = {
  destination: Recommendation;
  index: number;
};

export function DestinationCard({ destination, index }: Props) {
  const [imageSrc, setImageSrc] = useState(destination.imageUrl);
  const [fallbackStep, setFallbackStep] = useState(0);

  useEffect(() => {
    setImageSrc(destination.imageUrl);
    setFallbackStep(0);
  }, [destination.id, destination.imageUrl]);

  const handleImageError = () => {
    if (fallbackStep === 0 && destination.imageFallbackUrl !== imageSrc) {
      setFallbackStep(1);
      setImageSrc(destination.imageFallbackUrl);
      return;
    }
    if (fallbackStep <= 1 && destination.imagePlaceholderUrl) {
      setFallbackStep(2);
      setImageSrc(destination.imagePlaceholderUrl);
    }
  };

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-sm border border-ink/10 bg-parchment shadow-[0_12px_40px_-20px_rgba(26,26,46,0.35)] transition-transform duration-500 hover:-translate-y-1"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageSrc}
          alt={`${destination.name}, ${destination.region}`}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading={index < 3 ? "eager" : "lazy"}
          onError={handleImageError}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-parchment/80">
            {destination.region}
          </p>
          <h2 className="font-display text-3xl text-parchment">{destination.name}</h2>
        </div>
        {destination.imageSource && (
          <p className="absolute right-3 top-3 rounded-sm bg-ink/50 px-2 py-1 text-[10px] uppercase tracking-wider text-parchment/90">
            {destination.imageSource}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <p className="text-sm leading-relaxed text-ink/75">
          <span className="font-semibold text-terracotta">Why now:</span>{" "}
          {destination.reason}
        </p>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-sage">
            Mini plan
          </h3>
          <ul className="space-y-1.5">
            {destination.plan.map((day) => (
              <li key={day} className="text-sm leading-snug text-ink/85">
                {day}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
