# Where to Go Now

Agentic seasonal travel recommendations — open the site and an AI travel editor picks six destinations for the current month, writes mini plans, and fetches place-bound photos.

## Run locally

```bash
cd seasonal-travel
npm install
cp .env.example .env.local
# Add AI_GATEWAY_API_KEY (required). UNSPLASH_ACCESS_KEY optional for photo fallback.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

### Travel agent (load + Refresh)

Both first load and **Refresh picks** POST to `/api/recommendations` with an optional `exclude` list of catalog IDs already shown. The server runs an AI SDK agent with tools:

1. `getSeasonContext` — today's date and season
2. `searchDestinationCatalog` — scored seasonal catalog (respects exclude list)
3. `fetchPlacePhoto` — place-bound photo per destination
4. `submitRecommendations` — final batch of six

If `AI_GATEWAY_API_KEY` (or `VERCEL_OIDC_TOKEN`) is missing, the UI shows a clear configuration banner — no fake recommendations.

### Photos (locked pipeline)

For each destination name, `fetchPlacePhoto`:

1. **Primary:** Wikipedia page image for the exact place name
2. **Fallback:** Unsplash search for the same name (`UNSPLASH_ACCESS_KEY`)
3. **Card onError:** alternate URL → labeled SVG placeholder (never blank, never unrelated stock)

Each card binds `imageUrl` to that place. Refresh returns new places with new photo URLs.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
