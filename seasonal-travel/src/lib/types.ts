export type Hemisphere = "north" | "south";

export type CatalogEntry = {
  id: string;
  name: string;
  region: string;
  hemisphere: Hemisphere;
  peakMonths: number[];
  seasonalHint: string;
};

export type SeasonContext = {
  month: number;
  monthName: string;
  day: number;
  season: string;
  seasonLabel: string;
  dateLabel: string;
};

export type Recommendation = {
  id: string;
  name: string;
  region: string;
  whyNow: string;
  reason: string;
  plan: string[];
  imageUrl: string;
  imageFallbackUrl: string;
  imagePlaceholderUrl: string;
  imageSource?: string;
};

export type RecommendationsResponse = {
  context: SeasonContext;
  recommendations: Recommendation[];
  agentConfigured: boolean;
  agentError?: string;
  agentSteps?: number;
};
