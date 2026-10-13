# Plate to Pan

Photograph a restaurant meal and get a home-cookable recipe, a grocery list and a step-by-step cooking guide. The whole path (scan → confirm → recipe → grocery list → cook) works with taps on suggestion bubbles; typing is always available but never required.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4 and the Anthropic Claude API (`claude-haiku-5-5`, which supports image input).

> The app name is one constant: `APP_NAME` in `src/lib/config.ts`.

## Quick start

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local      # then put your key in ANTHROPIC_API_KEY
npm run dev                     # http://localhost:3000
```

Get an API key at <https://console.anthropic.com/>. The key is only read by server-side API routes and is never sent to the browser.

**No key yet?** Run with canned AI responses to click through every screen:

```bash
AI_MOCK=1 npm run dev
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server (the service worker for offline use only runs here) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run build:artifact` | Single-page build for a claude.ai artifact (see below) |

## How it works

### Screens

| Route | Screen |
| --- | --- |
| `/` | Home: greeting, “Scan a meal” card, search + filter chips, recent scans, example recipes |
| `/scan` | Meal photo (camera or upload), optional menu photo, optional note → **Analyze** |
| `/results?id=` | Dish name + confidence, “Is this right?” chips, visible-ingredient chips, AI suggestion bubbles, Q&A |
| `/recipe?id=` | Recipe with servings stepper, US/metric toggle, inferred-ingredient tags, tips, allergy notice, follow-up bubbles, sticky Start cooking / Grocery list / Save bar |
| `/cook?id=` | Full-screen cooking mode: one step at a time, swipe or arrow keys, timers, ingredient quick-peek, screen wake lock |
| `/grocery` | Merged list grouped by store section, checkboxes, swipe/× to remove, add items, hide staples, copy/share |
| `/saved` | Saved recipes with search and filters |
| `/profile` | Name, avatar, units, dietary preferences (sent to the AI), pantry staples |

Pages read their ids from the query string so each page is one static shell. That keeps offline caching simple.

### AI (server-side only)

All model calls go through `src/app/api/*/route.ts`:

| Route | Input → output |
| --- | --- |
| `POST /api/analyze` | meal photo, optional menu photo, note, diet (and an optional `dishHint` when the user picks another dish) → dish, confidence, alternatives, visible ingredients, 5–7 suggested actions, `not_food` |
| `POST /api/recipe` | dish, edited ingredients, photos, note, diet, units, optional modifier + current recipe → full recipe |
| `POST /api/grocery` | one or more scaled recipes → merged, sectioned shopping list |
| `POST /api/ask` | dish/recipe context + question → short answer + 3 follow-up bubbles |

- **One place to change the model:** `AI_MODEL` in `src/lib/ai/config.ts` (per-task `effort` is set there too).
- No `temperature`, `top_p` or `top_k` are sent anywhere (this model rejects them).
- Responses use structured outputs generated from zod schemas (`src/lib/schemas.ts`) and are validated with zod. If parsing or validation fails, the call is retried once, then the user sees a friendly message with a **Try again** button. Transient HTTP errors are retried by the SDK.
- Prompts live in `src/lib/ai/prompts.ts`; post-processing (trimming, clamping, making sure the recipe and grocery actions come first) is in `src/lib/ai/normalize.ts`.
- Request bodies are validated before anything reaches the model. Errors never expose raw messages or JSON.

### Images

Before upload, photos are resized in the browser to at most 1568 px on the long edge and re-encoded as JPEG at 0.85 quality (`src/lib/images.ts`). A smaller 900 px copy is stored for display and later recipe tweaks.

### Data

Saved recipes, scan history, the grocery list, profile and timers live in `localStorage`. Every read and write is wrapped in `try/catch`. When storage fills up, the oldest photos that aren't attached to a saved recipe are evicted first.

The app only talks to the `DataRepository` interface (`src/lib/data/repository.ts`). To move to a real database, implement that interface (for example with `fetch` calls to new API routes) and swap the one `repository` export in `src/lib/data/local-repository.ts`.

The grocery list is merged on-device first, so it's instant and works offline. When online, `/api/grocery` then tidies it (merging synonyms and converting to amounts you'd actually buy) while keeping your checked items, removals and custom items.

### Offline

In production builds a service worker (`public/sw.js`) caches the page shells and static assets. Saved recipes, cooking mode and grocery lists keep working without a connection. AI features show a friendly "you're offline" message.

## Run it as a Claude artifact (no API key)

`npm run build:artifact` packs the same screens into one page (`dist-artifact/index.html` plus `seed/`) that can be published as a claude.ai artifact. In that build:

- Next's router is replaced by an in-memory one (`artifact/shims/`), so routes and screens are unchanged.
- AI calls go through the artifact's `sample` capability (`artifact/sample-api.ts`) on the viewer's own Claude account instead of `/api/*`, reusing the same prompts, zod schemas and post-processing. Publish it with `capabilities: {sample: {images: true}}` so photos can be sent.
- React 18.3.1 loads from cdnjs (the only script host artifacts allow); everything else is inlined. Data stays in that browser's localStorage. There's no service worker, so offline mode is only in the Next.js deployment.

## Project structure

```
src/
  app/                 routes + API routes (pages are thin wrappers around screens)
  components/
    screens/           one component per screen
    ui/                Button, Chip, IconButton, BottomSheet, Stepper, Segmented, ...
    timers/            TimerProvider (background timers, sound + vibration), TimerPill
    BottomNav, FoodCard, SuggestionBubbles, StepNavigator, AskBar, AnswerThread, ...
  hooks/               useWakeLock, useOnline
  lib/
    ai/                model config, client, prompts, structured-output helper, mock
    data/              repository interface, localStorage implementation, React store
    schemas.ts         zod schemas shared by API routes and UI
    flows.ts           multi-step flows (scan → recipe → grocery)
    units.ts           scaling, US ⇄ metric, fraction formatting
    grocery.ts         merging + grouping
    seed.ts            example recipes shown before the first scan
artifact/              single-page build for claude.ai artifacts (router shims, `sample` adapter, build script)
public/
  seed/                example-recipe illustrations (replace with real photos, same file names)
  sw.js                service worker
```

## Notes

- **Example images** in `public/seed/` are generated illustrations. Drop in real food photos with the same names (or change `imageUrl` in `src/lib/seed.ts`).
- **Accessibility:** large touch targets (44 px+), labelled controls, keyboard support (cooking mode uses ←/→), focus-trapped bottom sheets, `prefers-reduced-motion` support. The brand colours from the design are used as specified: white text on olive `#8A9A2B` measures 3.1:1 and on orange `#C1652A` 4.1:1. That passes WCAG AA for large text and UI components but not for small body text. If you need AA everywhere, darken those two tokens in `src/app/globals.css` (for example olive `#6E7B1F`, orange `#A9561F`).
- **Allergies:** recipes are estimated from a photo; the recipe screen says so and tells people to check with the restaurant.
