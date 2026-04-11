# FYTA Dashboard — Vue Rewrite + Viewport-Fill Layout

**Date:** 2026-04-11
**Status:** Approved

## Goal

Rewrite the single-file vanilla JS dashboard as a Vite + Vue 3 + Tailwind CSS + DaisyUI application. Simultaneously introduce a viewport-fill grid layout that shows all plants on screen at once with no scrolling, scaling cards dynamically to fill all available space.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Build tool | Vite | Fast dev server with built-in proxy; standard Vue toolchain |
| Framework | Vue 3 (`<script setup>`, Composition API) | Component model, reactivity |
| Utility composables | `@vueuse/core` | Replaces custom resize/fetch/timer code |
| CSS framework | Tailwind CSS v3 | Utility-first, works naturally with DaisyUI |
| Component library | DaisyUI v4, theme: `forest` | Dark green aesthetic, no custom colour overrides needed |
| Dev proxy | `vite.config.js` | `/api/*` → `web.fyta.de`; `/img-proxy/*` → `api.prod.fyta-app.de` with Bearer auth header injected via `proxyReq` event (reads `VITE_API_TOKEN` from env) |
| Production server | `server.py` (unchanged) | Serves `dist/`, proxies images with Bearer auth |
| Config | `.env.local` (`VITE_API_TOKEN`) | Replaces `config.js`; gitignored by Vite by default |

---

## Project Structure

```
fyta-dashboard/
├── index.html
├── vite.config.js
├── tailwind.config.js          # DaisyUI forest theme
├── .env.local                  # VITE_API_TOKEN=... (gitignored)
├── src/
│   ├── main.js
│   ├── App.vue                 # root: data fetch, refresh timer, layout state
│   ├── components/
│   │   ├── AppHeader.vue       # sticky header, refresh button, last-updated
│   │   ├── SummaryBar.vue      # "4 need water now" chips
│   │   ├── PlantGrid.vue       # viewport-fill grid
│   │   └── PlantCard.vue       # single card with 4 content tiers
│   └── composables/
│       ├── usePlants.js        # fetch, flatten, sort
│       └── useGridLayout.js    # optimal cols×rows algorithm
├── server.py                   # unchanged
├── config.example.js           # updated: explains .env.local
└── .gitignore                  # adds .env.local, dist/
```

---

## Components

### `App.vue`
- Calls `usePlants()` on mount and every 5 minutes via `useIntervalFn`
- Passes `plants`, `isLoading`, `error`, `lastUpdated` as props down
- Exposes `refresh()` triggered by header button

### `AppHeader.vue`
- Props: `isLoading`, `lastUpdated`
- Emits: `refresh`
- `useTimeAgo(lastUpdated)` for human-readable timestamp
- DaisyUI: `btn btn-sm btn-ghost` for refresh, `loading loading-spinner` when loading

### `SummaryBar.vue`
- Props: `plants[]`
- Computed counts: critical (status 1), warn (status 2), ok (status 3)
- DaisyUI: `badge badge-error`, `badge badge-warning`, `badge badge-success`
- Hidden when plant list is empty

### `PlantGrid.vue`
- Props: `plants[]`
- `useWindowSize()` → reactive `{ width, height }`
- `useElementSize(headerRef)` → reactive header height
- `useElementSize(summaryBarRef)` → reactive summary bar height
- `availH = windowHeight − headerH − summaryBarH`
- `useDebounceFn(recalc, 50ms)` — recalculates on any size change
- `useGridLayout(plants.length, availW, availH)` → `{ cols, rows }`
- Grid CSS: `grid-template-columns: repeat(cols, 1fr)`, `grid-template-rows: repeat(rows, 1fr)`, `height: availH + 'px'`
- Renders `PlantCard` × N plus `(cols×rows − N)` invisible placeholder divs

### `PlantCard.vue`
- Props: `plant`, `cardHeight` (px, passed from PlantGrid as `availH / rows`)
- Content tier based on `cardHeight`:
  - `≥ 180px` → **full**: photo + name + species + moisture hero + 3 sensor bars
  - `120–179px` → **medium**: species name visible
  - `80–119px` → **compact**: species name hidden
  - `< 80px` → **micro**: sensor emoji icons hidden, bars + labels only
- DaisyUI: `card`, `card-body`
- Photo URL: `thumb_path` rewritten to `/img-proxy/...`; fallback to `plant_thumb_path`
- Moisture badge: `badge badge-error` (critical), `badge badge-warning` (low), `badge badge-success` (ok)

---

## Composables

### `usePlants.js`
```js
// Uses useFetch from @vueuse/core
const { data, isFetching, error, execute } = useFetch('/api/user-plant', {
  headers: { Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}` }
}).json()

const plants = computed(() => flattenAndSort(data.value))
```
- `flattenAndSort`: handles `data.plants` array, sorts by moisture urgency (1→2→5→4→3→0)
- Field mapping confirmed from live API: `moisture_status`, `light_status`, `temperature_status`, `salinity_status` are direct plant properties

### `useGridLayout.js`
```js
// Returns optimal { cols, rows } to maximise card area
function calcGrid(n, availW, availH) {
  let bestCols = 1, bestArea = 0
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols)
    const area = (availW / cols) * (availH / rows)
    if (area > bestArea) { bestArea = area; bestCols = cols }
  }
  return { cols: bestCols, rows: Math.ceil(n / bestCols) }
}
```
- Returns `{ cols: 1, rows: 1 }` for a single plant
- Minimum card height: 60px. If computed height < 60px, grid stops shrinking and `overflow-y: auto` enables scrolling as a last resort

---

## Grid Edge Cases

| Scenario | Behaviour |
|---|---|
| Empty slots (`cols×rows > N`) | Invisible `<div>` placeholders fill remaining slots |
| Single plant | 1×1 — card fills entire viewport |
| Card height < 60px | Scrolling re-enabled; grid does not shrink further |
| Window resize | `useDebounceFn` at 50ms debounce; grid snaps after resize settles |
| Summary bar wraps | `useElementSize` measures actual rendered height; `availH` stays accurate |

---

## DaisyUI Component Mapping

| UI element | DaisyUI |
|---|---|
| Plant card | `card` + `card-body` |
| Status badges (photo overlay) | `badge badge-error / warning / success` |
| Summary chips | `badge` |
| Refresh button | `btn btn-sm btn-ghost` |
| Loading spinner | `loading loading-spinner` |
| Error message | `alert alert-error` |
| Config missing screen | `card` + `alert alert-warning` |
| Sensor bars | Plain `div` with Tailwind width utilities (data-driven %) |

---

## Configuration Migration

| Before | After |
|---|---|
| `config.js` (script tag, gitignored) | `.env.local` (gitignored by Vite) |
| `const FYTA_CONFIG = { api_token: '...' }` | `VITE_API_TOKEN=...` |
| `config.example.js` | Updated to document `.env.local` approach |
| Show config-error screen if `FYTA_CONFIG` missing | Show `alert alert-warning` if `VITE_API_TOKEN` empty |

---

## Production Serving

- `npm run build` → outputs `dist/`
- `server.py` serves `dist/` as static files (unchanged)
- `server.py` image proxy (`/img-proxy/*` → `api.prod.fyta-app.de` with Bearer auth) unchanged
- Vite dev server proxy covers `/api/*` and `/img-proxy/*` during development

---

## Out of Scope

- Vue Router (single view only)
- State management (Pinia) — composables are sufficient
- Unit tests
- Jetpack Compose for Web migration (separate future project)
