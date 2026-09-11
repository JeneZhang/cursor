export type PhotoSource = "wikipedia" | "wikimedia" | "unsplash" | "placeholder";

export type PhotoResult = {
  url: string;
  fallbackUrl: string;
  source: PhotoSource;
  alternateSource?: PhotoSource;
};

const WIKI_API = "https://en.wikipedia.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const UNSPLASH_API = "https://api.unsplash.com/search/photos";

async function wikiFetch(params: Record<string, string>, api = WIKI_API) {
  const response = await fetch(`${api}?${new URLSearchParams({ ...params, format: "json", origin: "*" })}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return response.json();
}

/** Primary: Wikipedia page image for the exact destination title. */
async function fetchWikipediaPageImage(placeName: string): Promise<string | null> {
  const data = await wikiFetch({
    action: "query",
    titles: placeName,
    prop: "pageimages",
    pithumbsize: "1200",
    piprop: "thumbnail|original",
  });

  const pages = data?.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages) as Array<{
    missing?: string;
    thumbnail?: { source: string };
    original?: { source: string };
  }>) {
    if (page.missing) continue;
    const url = page.thumbnail?.source ?? page.original?.source;
    if (
      url &&
      !url.endsWith(".svg") &&
      !/[_-]map\.|\/map[_-]|pat_map/i.test(url)
    ) {
      return url;
    }
  }

  return null;
}

/** Wikimedia Commons file search scoped to the exact place name. */
async function fetchCommonsImage(placeName: string): Promise<string | null> {
  const data = await wikiFetch(
    {
      action: "query",
      generator: "search",
      gsrsearch: `intitle:"${placeName}"`,
      gsrnamespace: "6",
      prop: "imageinfo",
      iiprop: "url",
      iiurlwidth: "1200",
    },
    COMMONS_API,
  );

  const pages = data?.query?.pages;
  if (!pages) return null;

  for (const page of Object.values(pages) as Array<{
    title?: string;
    imageinfo?: Array<{ thumburl?: string; url?: string }>;
  }>) {
    const title = page.title?.toLowerCase() ?? "";
    if (!title.includes(placeName.toLowerCase().split(" ")[0])) continue;
    const info = page.imageinfo?.[0];
    const url = info?.thumburl ?? info?.url;
    if (url) return url;
  }

  return null;
}

/** Fallback: Unsplash search for the exact destination name. */
async function fetchUnsplashSearch(placeName: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  const response = await fetch(
    `${UNSPLASH_API}?${new URLSearchParams({
      query: placeName,
      per_page: "1",
      orientation: "landscape",
      content_filter: "high",
    })}`,
    {
      headers: { Authorization: `Client-ID ${accessKey}` },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    results?: Array<{ urls?: { regular?: string }; description?: string; alt_description?: string }>;
  };

  const hit = data.results?.[0];
  const url = hit?.urls?.regular;
  if (!url) return null;

  const alt = `${hit.description ?? ""} ${hit.alt_description ?? ""}`.toLowerCase();
  const token = placeName.toLowerCase().split(/[\s,&]+/)[0];
  if (token.length > 3 && !alt.includes(token) && !url.toLowerCase().includes(token)) {
    return null;
  }

  return url;
}

export function buildPlaceholderImage(placeName: string): string {
  const label = encodeURIComponent(placeName);
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="#e8e0d4"/>
      <text x="600" y="430" text-anchor="middle" font-family="Georgia, serif" font-size="42" fill="#1a1a2e">${label}</text>
      <text x="600" y="490" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#5b7b6a">Photo unavailable</text>
    </svg>`,
  )}`;
}

/**
 * Photo pipeline (locked):
 * 1. Wikipedia page image for exact destination name
 * 2. Wikimedia Commons file for exact destination name
 * 3. Unsplash search for exact destination name (requires UNSPLASH_ACCESS_KEY)
 * Card onError uses fallbackUrl, then placeholder — never a blank frame.
 */
export async function fetchPlacePhoto(
  placeName: string,
  _region?: string,
): Promise<PhotoResult> {
  const wikipedia = await fetchWikipediaPageImage(placeName);
  const unsplash = await fetchUnsplashSearch(placeName);
  const commons = wikipedia ? null : await fetchCommonsImage(placeName);

  if (wikipedia) {
    return {
      url: wikipedia,
      fallbackUrl: unsplash ?? commons ?? buildPlaceholderImage(placeName),
      source: "wikipedia",
      alternateSource: unsplash ? "unsplash" : commons ? "wikimedia" : "placeholder",
    };
  }

  if (commons) {
    return {
      url: commons,
      fallbackUrl: unsplash ?? buildPlaceholderImage(placeName),
      source: "wikimedia",
      alternateSource: unsplash ? "unsplash" : "placeholder",
    };
  }

  if (unsplash) {
    return {
      url: unsplash,
      fallbackUrl: buildPlaceholderImage(placeName),
      source: "unsplash",
      alternateSource: "placeholder",
    };
  }

  const placeholder = buildPlaceholderImage(placeName);
  return {
    url: placeholder,
    fallbackUrl: placeholder,
    source: "placeholder",
    alternateSource: "placeholder",
  };
}
