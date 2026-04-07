# Photo Notes

Capture quick “information photos” (receipts, tickets, QR codes) with a default timestamp title, browse them in a timeline, and edit or delete each note with an optional description.

Built with [Expo](https://expo.dev) (React Native) SDK 54 so it runs on modern iPhones including **iPhone 16 Pro Max** when you install a development or production build.

## Run on this VM (Expo dev server)

You cannot compile a native iOS `.ipa` on Linux; use the VM to develop UI and logic, then build iOS on a Mac or with [EAS Build](https://docs.expo.dev/build/introduction/).

```bash
cd /workspace
npm install
npx expo start
```

Then:

- **Web (fastest on the VM):** press `w` or run `npx expo start --web`. The web build uses an **in-memory** note list (`src/db/index.web.ts`) so you can exercise navigation without SQLite’s WASM bundle. For real persistence and camera behavior, use **iOS/Android** (`src/db/index.ts`).
- **iPhone with Expo Go:** install [Expo Go](https://expo.dev/go) from the App Store, ensure phone and VM are on the same network (or use tunnel mode), scan the QR code from the terminal.

## Install on your own iPhone (recommended path)

1. Create an [Expo](https://expo.dev) account and install the Expo CLI / EAS CLI.
2. Use **EAS Build** to produce an iOS build: configure `eas.json`, set your Apple Developer Team, and run `eas build --platform ios`. Install via TestFlight or ad hoc distribution.
3. For quick iteration without the store, use **Expo Go** during development (same SDK as this project).

Compatibility: target **iOS 15+** (Expo SDK 54 supports current iOS; iPhone 16 Pro Max is fully supported).

## Product plan (basics + advanced)

### Phase 1 — MVP (this repo)

- Camera capture → save JPEG under app documents → SQLite row with `id`, `created_at`, `local_uri`, `description`.
- Timeline sorted by date/time; tap a row for detail, edit description, delete.

### Phase 2 — Cloud sync + “delete local copy”

- **Architecture:** each note is a record with `remote_id`, `sync_status`, `local_uri` (nullable after offload), `remote_thumbnail_uri` or similar.
- **Backend:** object storage (S3, R2, Supabase Storage) for images + Postgres/Firestore/Supabase for metadata; authenticated API (JWT or session).
- **Sync:** background job (or foreground on app open) uploads pending items; on success mark `synced` and **remove the local file** (`File.delete()`), keep only remote URL in DB. **Thumbnail cache:** store a small local preview so the timeline stays instant; optionally clear cache by LRU.
- **Viewing old notes:** download image on demand when user opens detail, or stream from signed URL. Show sync state in UI (“cloud only” / “downloading…”).

### Phase 3 — Background OCR → description

- **On-device:** [expo-text-extractor](https://docs.expo.dev/versions/latest/sdk/text-extractor/) or VisionKit (custom dev client) — good for privacy, works offline after models load.
- **Server-side:** upload image → Cloud Vision, AWS Textract, or similar → return text → append or replace `description` if user left it empty.
- **Scheduling:** after capture or after sync; use a queue and avoid blocking the UI. Let users **lock** a description so OCR does not overwrite manual edits.

## Project layout

- `App.tsx` — root
- `src/navigation.tsx` — stack: Timeline, Camera (modal), Detail
- `src/db.ts` — SQLite (`expo-sqlite`)
- `src/screens/*` — UI screens

## Scripts

| Command            | Purpose                          |
| ------------------ | -------------------------------- |
| `npm start`        | Expo dev server                  |
| `npm run web`      | Open in browser                  |
| `npm run ios`      | Requires Xcode (macOS)           |
| `npm run android`  | Android emulator or device       |
