import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getCatalogEntry, searchCatalog } from "@/lib/catalog";
import { buildPlaceholderImage, fetchPlacePhoto } from "@/lib/photos";
import { getSeasonContext } from "@/lib/season";
import type { Recommendation, RecommendationsResponse } from "@/lib/types";
import { AI_MODEL, getAiConfigStatus } from "./config";

const recommendationSchema = z.object({
  catalogId: z.string(),
  name: z.string(),
  region: z.string(),
  whyNow: z.string(),
  plan: z.array(z.string()).min(2).max(4),
  imageUrl: z.string(),
});

type SubmittedBatch = {
  recommendations: z.infer<typeof recommendationSchema>[];
};

export async function runTravelAgent(
  excludeIds: string[] = [],
  date = new Date(),
): Promise<RecommendationsResponse> {
  const context = getSeasonContext(date);
  const aiStatus = getAiConfigStatus();

  if (!aiStatus.configured) {
    return {
      context,
      recommendations: [],
      agentConfigured: false,
      agentError: aiStatus.setupMessage,
    };
  }

  const batch: { value: SubmittedBatch | null } = { value: null };

  const tools = {
    getSeasonContext: tool({
      description:
        "Return the current calendar date, month, and northern-hemisphere season label.",
      inputSchema: z.object({}),
      execute: async () => context,
    }),
    searchDestinationCatalog: tool({
      description:
        "Search the curated seasonal destination catalog. Returns scored candidates for the current month. Use excludeIds to skip places already shown to the user.",
      inputSchema: z.object({
        excludeIds: z.array(z.string()).optional(),
        limit: z.number().min(6).max(20).optional(),
      }),
      execute: async ({ excludeIds: toolExclude = [], limit = 12 }) => {
        const mergedExclude = [...new Set([...excludeIds, ...toolExclude])];
        return searchCatalog(context.month, mergedExclude, limit);
      },
    }),
    fetchPlacePhoto: tool({
      description:
        "Fetch a place-bound photo for a destination. Pipeline: Wikipedia page image for the exact place name, then Unsplash search for the same name. Returns url, fallbackUrl, and source.",
      inputSchema: z.object({
        placeName: z.string().describe("Exact destination name, e.g. Kyoto"),
        region: z.string().optional(),
      }),
      execute: async ({ placeName, region }) => fetchPlacePhoto(placeName, region),
    }),
    submitRecommendations: tool({
      description:
        "Submit the final batch of exactly six destination recommendations after choosing from the catalog, writing mini plans, and fetching photos.",
      inputSchema: z.object({
        recommendations: z.array(recommendationSchema).length(6),
      }),
      execute: async (input) => {
        batch.value = input;
        return { accepted: true, count: input.recommendations.length };
      },
    }),
  };

  const excludeNote =
    excludeIds.length > 0
      ? `The user has already seen these catalog IDs — do NOT repeat them: ${excludeIds.join(", ")}.`
      : "This is the first batch for this session.";

  try {
    const result = await generateText({
      model: AI_MODEL,
      system: `You are an expert travel editor for a seasonal recommendation magazine.

Your job on every run:
1. Call getSeasonContext to confirm today's date and season.
2. Call searchDestinationCatalog with the user's exclude list to see scored candidates.
3. Choose exactly six distinct destinations that are best for RIGHT NOW (prioritize inPeakSeason entries).
4. For each chosen place, call fetchPlacePhoto with the exact catalog place name.
5. Write a fresh 2–4 day mini itinerary (concise highlights, not a novel) and a specific whyNow tied to the current month.
6. Call submitRecommendations with all six entries. Each imageUrl must be the url from fetchPlacePhoto for that same place.

Photo rules:
- Photos are bound to the destination name (Wikipedia page image first, Unsplash search fallback).
- Never substitute unrelated stock imagery.
- Each place gets its own fetchPlacePhoto call.

Catalog rules:
- Only use catalog IDs returned by searchDestinationCatalog.
- Never invent destinations outside the catalog.`,
      prompt: `${excludeNote}

Curate six destinations for ${context.dateLabel} (${context.seasonLabel}).`,
      tools,
      stopWhen: stepCountIs(14),
    });

    if (!batch.value) {
      return {
        context,
        recommendations: [],
        agentConfigured: true,
        agentError:
          "The travel agent did not submit a recommendation batch. Try refreshing.",
        agentSteps: result.steps.length,
      };
    }

    const recommendations = await finalizeRecommendations(batch.value.recommendations);

    if (recommendations.length === 0) {
      return {
        context,
        recommendations: [],
        agentConfigured: true,
        agentError: "Agent submitted invalid catalog entries. Try refreshing.",
        agentSteps: result.steps.length,
      };
    }

    const overlap = recommendations.filter((r) => excludeIds.includes(r.id));
    if (overlap.length > 0 && excludeIds.length > 0) {
      return {
        context,
        recommendations: [],
        agentConfigured: true,
        agentError:
          "Agent repeated excluded destinations. Click Refresh to try again.",
        agentSteps: result.steps.length,
      };
    }

    return {
      context,
      recommendations,
      agentConfigured: true,
      agentSteps: result.steps.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown agent error";
    return {
      context,
      recommendations: [],
      agentConfigured: true,
      agentError: message.includes("Unauthenticated")
        ? getAiConfigStatus().setupMessage
        : `Travel agent failed: ${message}`,
    };
  }
}

async function finalizeRecommendations(
  raw: z.infer<typeof recommendationSchema>[],
): Promise<Recommendation[]> {
  const finalized: Recommendation[] = [];

  for (const item of raw) {
    const catalog = getCatalogEntry(item.catalogId);
    if (!catalog) continue;

    const photo = await fetchPlacePhoto(catalog.name, item.region);
    const placeholder = buildPlaceholderImage(catalog.name);

    finalized.push({
      id: catalog.id,
      name: item.name,
      region: item.region,
      whyNow: item.whyNow,
      reason: item.whyNow,
      plan: item.plan,
      imageUrl: photo.url,
      imageFallbackUrl: photo.fallbackUrl,
      imagePlaceholderUrl: placeholder,
      imageSource: photo.source,
    });
  }

  return finalized;
}
