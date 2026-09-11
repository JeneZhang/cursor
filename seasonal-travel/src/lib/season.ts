import type { SeasonContext } from "./types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function getSeasonContext(date = new Date()): SeasonContext {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthName = MONTH_NAMES[month - 1];

  const season = getNorthernSeason(month);
  const seasonLabel = formatSeasonLabel(season, monthName);

  return {
    month,
    monthName,
    day,
    season,
    seasonLabel,
    dateLabel: `${monthName} ${day}, ${date.getFullYear()}`,
  };
}

function getNorthernSeason(month: number): string {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function formatSeasonLabel(season: string, monthName: string): string {
  const labels: Record<string, string> = {
    spring: "Spring escapes",
    summer: "Summer horizons",
    autumn: "Autumn journeys",
    winter: "Winter wanderlust",
  };
  return `${labels[season] ?? "Seasonal picks"} · ${monthName}`;
}

export function monthDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 12 - diff);
}
