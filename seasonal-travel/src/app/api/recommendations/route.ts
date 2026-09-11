import { NextRequest, NextResponse } from "next/server";
import { runTravelAgent } from "@/lib/ai/travel-agent";

function parseExcludeIds(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function GET(request: NextRequest) {
  const excludeIds = parseExcludeIds(request.nextUrl.searchParams.get("exclude"));
  const data = await runTravelAgent(excludeIds);
  const status = data.agentConfigured ? 200 : 503;
  return NextResponse.json(data, { status });
}

export async function POST(request: NextRequest) {
  let excludeIds: string[] = [];
  try {
    const body = (await request.json()) as { exclude?: string[] };
    excludeIds = Array.isArray(body.exclude) ? body.exclude : [];
  } catch {
    excludeIds = [];
  }

  const data = await runTravelAgent(excludeIds);
  const status = data.agentConfigured ? 200 : 503;
  return NextResponse.json(data, { status });
}
