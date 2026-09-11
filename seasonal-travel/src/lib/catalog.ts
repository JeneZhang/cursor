import type { CatalogEntry } from "./types";
import { monthDistance } from "./season";

export const CATALOG: CatalogEntry[] = [
  { id: "kyoto", name: "Kyoto", region: "Japan", hemisphere: "north", peakMonths: [3, 4, 10, 11], seasonalHint: "Cherry blossoms or crisp autumn maples frame the temples." },
  { id: "patagonia", name: "Patagonia", region: "Chile & Argentina", hemisphere: "south", peakMonths: [11, 12, 1, 2, 3], seasonalHint: "Long daylight and stable weather for glacier and peak hikes." },
  { id: "marrakech", name: "Marrakech", region: "Morocco", hemisphere: "north", peakMonths: [3, 4, 5, 10, 11], seasonalHint: "Warm days without peak summer heat — ideal for medina wandering." },
  { id: "iceland", name: "Reykjavík & South Coast", region: "Iceland", hemisphere: "north", peakMonths: [6, 7, 8, 9], seasonalHint: "Midnight sun and accessible highland roads open the south coast." },
  { id: "amalfi", name: "Amalfi Coast", region: "Italy", hemisphere: "north", peakMonths: [5, 6, 9, 10], seasonalHint: "Shoulder season brings warm seas without August crowds." },
  { id: "bali", name: "Bali", region: "Indonesia", hemisphere: "south", peakMonths: [4, 5, 6, 7, 8, 9], seasonalHint: "Dry season means clear skies for temples and surf." },
  { id: "queenstown", name: "Queenstown", region: "New Zealand", hemisphere: "south", peakMonths: [12, 1, 2, 3], seasonalHint: "Southern summer fills the lakes with long golden evenings." },
  { id: "vancouver", name: "Vancouver", region: "Canada", hemisphere: "north", peakMonths: [6, 7, 8, 9], seasonalHint: "Mild Pacific summer — perfect for outdoor city days." },
  { id: "santorini", name: "Santorini", region: "Greece", hemisphere: "north", peakMonths: [5, 6, 9, 10], seasonalHint: "Warm Aegean light without July cruise-ship crush." },
  { id: "cape-town", name: "Cape Town", region: "South Africa", hemisphere: "south", peakMonths: [11, 12, 1, 2, 3], seasonalHint: "Dry, sunny season for beaches and vineyard harvest vibes." },
  { id: "lisbon", name: "Lisbon", region: "Portugal", hemisphere: "north", peakMonths: [4, 5, 6, 9, 10], seasonalHint: "Long spring and autumn evenings ideal for tiled streets." },
  { id: "banff", name: "Banff", region: "Canada", hemisphere: "north", peakMonths: [6, 7, 8, 9], seasonalHint: "Alpine lakes thaw to turquoise — peak hiking window." },
  { id: "seoul", name: "Seoul", region: "South Korea", hemisphere: "north", peakMonths: [4, 5, 9, 10], seasonalHint: "Mild weather for palace gardens and night markets." },
  { id: "cartagena", name: "Cartagena", region: "Colombia", hemisphere: "north", peakMonths: [12, 1, 2, 3], seasonalHint: "Dry Caribbean breeze — best months for old-town evenings." },
  { id: "zermatt", name: "Zermatt", region: "Switzerland", hemisphere: "north", peakMonths: [12, 1, 2, 3], seasonalHint: "Peak snow season under the Matterhorn." },
  { id: "hanoi", name: "Hanoi", region: "Vietnam", hemisphere: "north", peakMonths: [10, 11, 3, 4], seasonalHint: "Cooler, drier air after monsoon — clear bay days." },
  { id: "edinburgh", name: "Edinburgh", region: "Scotland", hemisphere: "north", peakMonths: [8, 9], seasonalHint: "Festival season energy with lingering summer light." },
  { id: "maui", name: "Maui", region: "Hawaii, USA", hemisphere: "north", peakMonths: [4, 5, 9, 10], seasonalHint: "Calmer shoulder-season seas for the Hana coast." },
  { id: "prague", name: "Prague", region: "Czech Republic", hemisphere: "north", peakMonths: [5, 6, 9, 10, 12], seasonalHint: "Golden hour on Gothic spires — mild or festive depending on month." },
  { id: "sydney", name: "Sydney", region: "Australia", hemisphere: "south", peakMonths: [10, 11, 12, 1, 2, 3], seasonalHint: "Warm harbor season — outdoor dining and coastal hikes." },
  { id: "petra", name: "Petra", region: "Jordan", hemisphere: "north", peakMonths: [3, 4, 10, 11], seasonalHint: "Comfortable desert temperatures for long site walks." },
  { id: "buenos-aires", name: "Buenos Aires", region: "Argentina", hemisphere: "south", peakMonths: [10, 11, 12, 1, 2, 3], seasonalHint: "Blooming jacarandas or long summer nights on the plazas." },
  { id: "tromso", name: "Tromsø", region: "Norway", hemisphere: "north", peakMonths: [1, 2, 3, 11, 12], seasonalHint: "Polar night skies prime for aurora hunting." },
  { id: "oaxaca", name: "Oaxaca", region: "Mexico", hemisphere: "north", peakMonths: [10, 11, 12, 1, 2], seasonalHint: "Dry season and Día de Muertos atmosphere in autumn." },
  { id: "croatia", name: "Dubrovnik", region: "Croatia", hemisphere: "north", peakMonths: [5, 6, 9, 10], seasonalHint: "Adriatic warmth before or after peak cruise season." },
  { id: "kenya", name: "Maasai Mara", region: "Kenya", hemisphere: "north", peakMonths: [7, 8, 9, 1, 2], seasonalHint: "Great Migration crossings or green-season calving." },
  { id: "ljubljana", name: "Ljubljana", region: "Slovenia", hemisphere: "north", peakMonths: [5, 6, 9, 10], seasonalHint: "Alpine lakes and café culture in mild weather." },
  { id: "maldives", name: "Maldives", region: "Indian Ocean", hemisphere: "north", peakMonths: [12, 1, 2, 3, 4], seasonalHint: "Dry northeast monsoon — calm turquoise lagoons." },
  { id: "chicago", name: "Chicago", region: "USA", hemisphere: "north", peakMonths: [6, 7, 8, 9], seasonalHint: "Lake Michigan festivals and rooftop season." },
  { id: "madeira", name: "Madeira", region: "Portugal", hemisphere: "north", peakMonths: [4, 5, 6, 9, 10], seasonalHint: "Wildflower-lined levadas in spring bloom." },
  { id: "namibia", name: "Namib Desert", region: "Namibia", hemisphere: "south", peakMonths: [5, 6, 7, 8, 9], seasonalHint: "Cooler desert mornings — best dune light and wildlife." },
  { id: "taipei", name: "Taipei", region: "Taiwan", hemisphere: "north", peakMonths: [3, 4, 10, 11], seasonalHint: "Pleasant temps for night-market hopping and day trips." },
  { id: "provence", name: "Provence", region: "France", hemisphere: "north", peakMonths: [6, 7, 8, 9], seasonalHint: "Lavender peaks and long Provençal evenings." },
  { id: "cusco", name: "Cusco", region: "Peru", hemisphere: "south", peakMonths: [5, 6, 7, 8, 9], seasonalHint: "Dry Andean season — clearest views at Machu Picchu." },
  { id: "vienna", name: "Vienna", region: "Austria", hemisphere: "north", peakMonths: [11, 12, 1, 2], seasonalHint: "Ball season and glittering winter markets." },
  { id: "rwanda", name: "Volcanoes NP", region: "Rwanda", hemisphere: "north", peakMonths: [6, 7, 8, 9, 12, 1, 2], seasonalHint: "Dry trekking months with clearer forest trails." },
];

function effectiveMonth(month: number, hemisphere: "north" | "south"): number {
  if (hemisphere === "south") return ((month + 5) % 12) + 1;
  return month;
}

function scoreEntry(entry: CatalogEntry, month: number): number {
  const localMonth = effectiveMonth(month, entry.hemisphere);
  if (entry.peakMonths.includes(localMonth)) {
    const minDist = Math.min(
      ...entry.peakMonths.map((m) => monthDistance(localMonth, m)),
    );
    return 100 - minDist * 2;
  }
  const nearest = entry.peakMonths.reduce(
    (best, peak) => {
      const dist = monthDistance(localMonth, peak);
      return dist < best.dist ? { dist } : best;
    },
    { dist: Infinity },
  );
  return Math.max(20, 70 - nearest.dist * 12);
}

export function searchCatalog(
  month: number,
  excludeIds: string[] = [],
  limit = 12,
): Array<CatalogEntry & { score: number; inPeakSeason: boolean }> {
  const exclude = new Set(excludeIds);
  return CATALOG
    .filter((entry) => !exclude.has(entry.id))
    .map((entry) => {
      const localMonth = effectiveMonth(month, entry.hemisphere);
      const inPeakSeason = entry.peakMonths.includes(localMonth);
      return { ...entry, score: scoreEntry(entry, month), inPeakSeason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.id === id);
}
