# FYTA Dashboard — Vue Rewrite + Viewport-Fill Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Note (2026-04-18):** Token configuration has changed. `VITE_API_TOKEN` references in this plan are superseded by `FYTA_API_TOKEN`. See `docs/superpowers/specs/2026-04-18-token-consolidation-design.md`.

**Goal:** Rewrite the single-file vanilla JS dashboard as a Vite + Vue 3 + Tailwind CSS + DaisyUI app with a JS-optimal viewport-fill grid that shows all plants without scrolling.

**Architecture:** Vue 3 `<script setup>` components wired in App.vue; VueUse composables replace all manual event listeners, fetch wrappers, and timers; a pure function `calcGrid(n, w, h)` finds the column count that maximises card area for N plants in the available viewport space.

**Tech Stack:** Vite 6, Vue 3, @vueuse/core, Tailwind CSS v3, DaisyUI v4 (forest theme), Node 25+

---

## File Map

| File                               | Action          | Responsibility                          |
| ---------------------------------- | --------------- | --------------------------------------- |
| `index.html`                       | Rewrite         | Vite entry point, `data-theme="forest"` |
| `vite.config.js`                   | Create          | Dev proxies for `/api` and `/img-proxy` |
| `tailwind.config.js`               | Create          | DaisyUI forest theme                    |
| `postcss.config.js`                | Create          | Tailwind + autoprefixer                 |
| `package.json`                     | Create          | Vite scaffold output                    |
| `src/main.js`                      | Create          | Mount Vue app                           |
| `src/style.css`                    | Create          | Tailwind directives                     |
| `src/App.vue`                      | Create          | Root: fetch, timer, layout shell        |
| `src/components/AppHeader.vue`     | Create          | Sticky header, refresh, last-updated    |
| `src/components/SummaryBar.vue`    | Create          | Moisture status chips                   |
| `src/components/PlantGrid.vue`     | Create          | Viewport-fill grid, measures itself     |
| `src/components/PlantCard.vue`     | Create          | Card with 4 content tiers               |
| `src/composables/usePlants.js`     | Create          | useFetch wrapper, flatten, sort         |
| `src/composables/useGridLayout.js` | Create          | Optimal cols×rows algorithm             |
| `.env.local`                       | Create          | `VITE_API_TOKEN=...` (gitignored)       |
| `config.example.js`                | Modify          | Update instructions for .env.local      |
| `server.py`                        | Modify          | Serve `dist/` instead of `.`            |
| `.gitignore`                       | Already updated | `.env.local`, `dist/`, `node_modules/`  |

---

## Task 1: Scaffold Vite + Vue project

**Files:**

- Create: `package.json`, `src/main.js`, `src/App.vue` (scaffold placeholder)
- Create: `src/style.css`

- [ ] **Step 1: Scaffold into existing directory**

```bash
cd /Users/bkahlert/Development/com.bkahlert/fyta-dashboard
npm create vite@latest . -- --template vue
# When prompted "Current directory is not empty. Remove existing files and continue?" → choose "Ignore files and continue"
```

Expected: `package.json`, `vite.config.js`, `src/` created. Existing files (`index.html`, `server.py`, etc.) untouched because we chose "Ignore".

- [ ] **Step 2: Install core dependencies**

```bash
npm install
npm install -D tailwindcss@3 autoprefixer postcss
npm install daisyui@4
npm install @vueuse/core
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Remove scaffold boilerplate**

```bash
rm -f src/components/HelloWorld.vue src/assets/vue.svg public/vite.svg
```

- [ ] **Step 4: Replace `src/style.css` with Tailwind directives**

```css
/* src/style.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Replace `src/main.js`**

```js
// src/main.js
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");
```

- [ ] **Step 6: Replace `src/App.vue` with minimal placeholder**

```vue
<!-- src/App.vue -->
<template>
  <div
    class="flex items-center justify-center h-screen text-primary text-2xl font-bold"
  >
    🌿 FYTA Dashboard — scaffolded
  </div>
</template>
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:5173` — expect dark green background (forest theme not applied yet, but no errors).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js src/ public/
git commit -m "chore: scaffold Vite + Vue 3 project"
```

---

## Task 2: Configure Tailwind CSS + DaisyUI

**Files:**

- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `index.html`

- [ ] **Step 1: Initialise Tailwind**

```bash
npx tailwindcss init -p
```

Expected: `tailwind.config.js` and `postcss.config.js` created.

- [ ] **Step 2: Write `tailwind.config.js`**

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["forest"],
  },
};
```

- [ ] **Step 3: Write `postcss.config.js`**

```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Update `index.html` — add `data-theme` and clean up title**

```html
<!DOCTYPE html>
<html lang="en" data-theme="forest">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
    />
    <title>🌿 FYTA Dashboard</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: Verify forest theme is applied**

```bash
npm run dev
```

Open `http://localhost:5173` — expect dark green background (`bg-base-100` of forest theme ≈ `#171212`), text in the forest accent colour.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js postcss.config.js index.html
git commit -m "chore: configure Tailwind CSS v3 + DaisyUI forest theme"
```

---

## Task 3: Configure Vite dev proxies

**Files:**

- Modify: `vite.config.js`

- [ ] **Step 1: Write `vite.config.js` with both proxies**

```js
// vite.config.js
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [vue()],
    server: {
      proxy: {
        "/api": {
          target: "https://web.fyta.de",
          changeOrigin: true,
          secure: true,
        },
        "/img-proxy": {
          target: "https://api.prod.fyta-app.de",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/img-proxy/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              proxyReq.setHeader(
                "Authorization",
                `Bearer ${env.VITE_API_TOKEN}`,
              );
            });
          },
        },
      },
    },
  };
});
```

- [ ] **Step 2: Create `.env.local` with the API token**

```bash
echo "VITE_API_TOKEN=FYTA_API_TOKEN_REDACTED" > .env.local
```

- [ ] **Step 3: Verify API proxy works**

```bash
npm run dev &
sleep 2
curl -s http://localhost:5173/api/user-plant \
  -H "Authorization: Bearer FYTA_API_TOKEN_REDACTED" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('plants:', len(d['plants']))"
# Expected: plants: 23
kill %1
```

- [ ] **Step 4: Commit**

```bash
git add vite.config.js
git commit -m "chore: configure Vite dev proxies for FYTA API and image proxy"
```

---

## Task 4: Update config.example.js

**Files:**

- Modify: `config.example.js`

- [ ] **Step 1: Rewrite `config.example.js`**

```js
// config.example.js
// FYTA Dashboard — Configuration
// ────────────────────────────────────────────────
// Create a .env.local file in the project root with:
//
//   VITE_API_TOKEN=your-token-here
//
// Get your token at: https://web.fyta.de → "API Token" tab
//
// ⚠️  .env.local is listed in .gitignore — never commit it.
```

- [ ] **Step 2: Commit**

```bash
git add config.example.js
git commit -m "docs: update config.example.js for .env.local approach"
```

---

## Task 5: `useGridLayout` composable

**Files:**

- Create: `src/composables/useGridLayout.js`

- [ ] **Step 1: Create `src/composables/useGridLayout.js`**

```js
// src/composables/useGridLayout.js
import { computed, toValue } from "vue";

/**
 * Finds the column count that maximises card area for `count` plants
 * in a container of `availW` × `availH` pixels.
 *
 * Returns a reactive { cols, rows } object.
 * Accepts plain numbers or refs for all arguments.
 */
export function useGridLayout(count, availW, availH) {
  return computed(() => {
    const n = toValue(count);
    const w = toValue(availW);
    const h = toValue(availH);

    if (!n || n <= 0 || w <= 0 || h <= 0) return { cols: 1, rows: 1 };

    let bestCols = 1;
    let bestArea = 0;

    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const area = (w / cols) * (h / rows);
      if (area > bestArea) {
        bestArea = area;
        bestCols = cols;
      }
    }

    return {
      cols: bestCols,
      rows: Math.ceil(n / bestCols),
    };
  });
}
```

- [ ] **Step 2: Verify algorithm manually in browser console**

Start dev server (`npm run dev`), open DevTools console, paste:

```js
function calcGrid(n, w, h) {
  let bestCols = 1,
    bestArea = 0;
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const area = (w / cols) * (h / rows);
    if (area > bestArea) {
      bestArea = area;
      bestCols = cols;
    }
  }
  return { cols: bestCols, rows: Math.ceil(n / bestCols) };
}
// 23 plants in 1024×720 → expect 6×4 = 24 slots
console.assert(
  JSON.stringify(calcGrid(23, 1024, 720)) ===
    JSON.stringify({ cols: 6, rows: 4 }),
  "23 plants test failed",
);
// 1 plant → 1×1
console.assert(
  JSON.stringify(calcGrid(1, 1024, 720)) ===
    JSON.stringify({ cols: 1, rows: 1 }),
  "1 plant test failed",
);
// 4 plants in square → 2×2
console.assert(
  JSON.stringify(calcGrid(4, 800, 800)) ===
    JSON.stringify({ cols: 2, rows: 2 }),
  "4 plants test failed",
);
console.log("all assertions passed");
```

Expected output: `all assertions passed`

- [ ] **Step 3: Commit**

```bash
git add src/composables/useGridLayout.js
git commit -m "feat: add useGridLayout composable — optimal cols×rows for viewport-fill grid"
```

---

## Task 6: `usePlants` composable

**Files:**

- Create: `src/composables/usePlants.js`

- [ ] **Step 1: Create `src/composables/usePlants.js`**

```js
// src/composables/usePlants.js
import { computed, ref, watch } from "vue";
import { useFetch } from "@vueuse/core";

// Urgency order: too dry → water soon → overwatered → slightly wet → perfect → no sensor
const URGENCY_ORDER = [1, 2, 5, 4, 3, 0];

function flattenAndSort(data) {
  if (!data) return [];

  let plants = [];
  if (Array.isArray(data)) {
    plants = data;
  } else if (Array.isArray(data.plants)) {
    plants = data.plants;
  } else if (Array.isArray(data.gardens)) {
    data.gardens.forEach((g) =>
      (g.plants ?? []).forEach((p) => plants.push({ ...p, _garden: g.name })),
    );
  }

  return [...plants].sort(
    (a, b) =>
      URGENCY_ORDER.indexOf(a.moisture_status ?? 0) -
      URGENCY_ORDER.indexOf(b.moisture_status ?? 0),
  );
}

export function usePlants() {
  const lastUpdated = ref(null);

  const { data, isFetching, error, execute } = useFetch("/api/user-plant", {
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN}`,
      Accept: "application/json",
    },
  }).json();

  watch(isFetching, (fetching) => {
    if (!fetching && data.value) lastUpdated.value = new Date();
  });

  const plants = computed(() => flattenAndSort(data.value));

  return { plants, isFetching, error, execute, lastUpdated };
}
```

- [ ] **Step 2: Smoke-test the composable in App.vue placeholder**

Replace `src/App.vue` temporarily:

```vue
<!-- src/App.vue — temporary smoke test -->
<template>
  <div class="p-8 text-base-content">
    <div v-if="isFetching" class="loading loading-spinner loading-lg"></div>
    <div v-else-if="error" class="alert alert-error">{{ error }}</div>
    <div v-else>
      <p class="text-success font-bold">Loaded {{ plants.length }} plants</p>
      <p class="text-sm opacity-60">First: {{ plants[0]?.nickname }}</p>
    </div>
  </div>
</template>

<script setup>
import { usePlants } from "./composables/usePlants.js";
const { plants, isFetching, error } = usePlants();
</script>
```

Run `npm run dev`, open `http://localhost:5173` — expect `Loaded 23 plants` and the name of the most urgent plant.

- [ ] **Step 3: Commit**

```bash
git add src/composables/usePlants.js
git commit -m "feat: add usePlants composable — fetch, flatten, sort by moisture urgency"
```

---

## Task 7: `AppHeader` component

**Files:**

- Create: `src/components/AppHeader.vue`

- [ ] **Step 1: Create `src/components/AppHeader.vue`**

```vue
<!-- src/components/AppHeader.vue -->
<template>
  <header
    class="navbar bg-base-200 border-b border-base-300 min-h-12 px-4 shrink-0"
  >
    <div class="flex-1 flex items-center gap-2">
      <span class="text-xl select-none">🌿</span>
      <h1 class="text-base font-bold tracking-tight">My Plants</h1>
    </div>
    <div class="flex-none flex items-center gap-3">
      <span
        v-if="lastUpdated"
        class="text-xs text-base-content/50 hidden sm:inline"
      >
        {{ timeAgo }}
      </span>
      <button
        class="btn btn-sm btn-ghost gap-1"
        :disabled="isLoading"
        @click="$emit('refresh')"
      >
        <span :class="{ 'animate-spin': isLoading }" class="inline-block"
          >↻</span
        >
        Refresh
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { useTimeAgo } from "@vueuse/core";

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: null },
});
defineEmits(["refresh"]);

const timeAgo = useTimeAgo(computed(() => props.lastUpdated));
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AppHeader.vue
git commit -m "feat: add AppHeader component with useTimeAgo"
```

---

## Task 8: `SummaryBar` component

**Files:**

- Create: `src/components/SummaryBar.vue`

- [ ] **Step 1: Create `src/components/SummaryBar.vue`**

```vue
<!-- src/components/SummaryBar.vue -->
<template>
  <div
    v-if="plants.length"
    class="flex gap-2 px-4 py-1.5 bg-base-200 border-b border-base-300 flex-wrap shrink-0"
  >
    <span class="badge badge-ghost badge-sm"
      >{{ plants.length }} plant{{ plants.length !== 1 ? "s" : "" }}</span
    >
    <span v-if="critical" class="badge badge-error badge-sm gap-1">
      💧 {{ critical }} need{{ critical > 1 ? "" : "s" }} water now
    </span>
    <span v-if="warn" class="badge badge-warning badge-sm gap-1">
      ⚠️ {{ warn }} water soon
    </span>
    <span v-if="ok" class="badge badge-success badge-sm gap-1">
      ✅ {{ ok }} happy
    </span>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  plants: { type: Array, required: true },
});

const critical = computed(
  () => props.plants.filter((p) => (p.moisture_status ?? 0) === 1).length,
);
const warn = computed(
  () => props.plants.filter((p) => (p.moisture_status ?? 0) === 2).length,
);
const ok = computed(
  () => props.plants.filter((p) => (p.moisture_status ?? 0) === 3).length,
);
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SummaryBar.vue
git commit -m "feat: add SummaryBar component with moisture status chips"
```

---

## Task 9: `PlantCard` component

**Files:**

- Create: `src/components/PlantCard.vue`

- [ ] **Step 1: Create `src/components/PlantCard.vue`**

```vue
<!-- src/components/PlantCard.vue -->
<template>
  <div class="card shadow overflow-hidden" :class="cardBorderClass">
    <!-- Photo -->
    <figure
      class="relative overflow-hidden shrink-0 bg-base-300"
      :style="{ height: photoHeight + 'px' }"
    >
      <img
        v-if="photoUrl && !photoFailed"
        :src="photoUrl"
        :alt="plant.nickname ?? ''"
        class="w-full h-full object-cover"
        @error="photoFailed = true"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-4xl opacity-20 select-none"
      >
        🪴
      </div>
      <span
        v-if="badgeText"
        class="badge badge-xs absolute top-1.5 right-1.5"
        :class="badgeClass"
        >{{ badgeText }}</span
      >
    </figure>

    <!-- Body -->
    <div class="card-body p-2 gap-1 min-h-0 flex flex-col">
      <!-- Name -->
      <h2 class="font-bold truncate leading-tight" :class="nameSizeClass">
        {{ plant.nickname ?? plant.scientific_name ?? "Unknown" }}
      </h2>

      <!-- Species (hidden on compact + micro) -->
      <p
        v-if="tier === 'full' || tier === 'medium'"
        class="text-xs opacity-50 italic truncate leading-tight"
      >
        {{ plant.scientific_name ?? plant.common_name ?? "" }}
      </p>

      <!-- Moisture status -->
      <div class="flex items-center gap-1 min-w-0">
        <span
          class="shrink-0 leading-none"
          :class="tier === 'micro' ? 'text-xs' : 'text-sm'"
        >
          {{ MOISTURE_EMOJI[ms] ?? "💧" }}
        </span>
        <span
          class="font-bold truncate"
          :class="[
            moistureColorClass,
            tier === 'micro' ? 'text-xs' : 'text-xs',
          ]"
        >
          {{ MOISTURE_HEADLINE[ms] }}
        </span>
      </div>

      <!-- Sensor bars -->
      <div class="flex flex-col gap-0.5 mt-auto">
        <div
          v-for="[icon, code] in sensors"
          :key="icon"
          class="flex items-center gap-1"
        >
          <span
            v-if="tier !== 'micro'"
            class="text-xs w-3 shrink-0 leading-none"
            >{{ icon }}</span
          >
          <div class="flex-1 h-0.5 rounded-full bg-base-300 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="barColorClass(code)"
              :style="{ width: STATUS[code]?.bar + '%' }"
            ></div>
          </div>
          <span
            class="text-xs shrink-0 w-10 text-right"
            :class="labelColorClass(code)"
          >
            {{ STATUS[code]?.label ?? "" }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  plant: { type: Object, required: true },
  cardHeight: { type: Number, default: 160 },
});

const photoFailed = ref(false);

// ── Content tier ──────────────────────────────────────────────
const tier = computed(() => {
  const h = props.cardHeight;
  if (h >= 180) return "full";
  if (h >= 120) return "medium";
  if (h >= 80) return "compact";
  return "micro";
});

const photoHeight = computed(() => Math.round(props.cardHeight * 0.42));

// ── Status maps ───────────────────────────────────────────────
const STATUS = {
  0: { label: "No sensor", bar: 0 },
  1: { label: "Too dry", bar: 8 },
  2: { label: "Low", bar: 28 },
  3: { label: "Perfect", bar: 70 },
  4: { label: "High", bar: 87 },
  5: { label: "Too wet", bar: 98 },
};

const MOISTURE_HEADLINE = {
  0: "No sensor",
  1: "Needs Water",
  2: "Water Soon",
  3: "Well Watered",
  4: "Slightly Wet",
  5: "Overwatered",
};
const MOISTURE_EMOJI = { 0: "🪴", 1: "💧", 2: "💧", 3: "✅", 4: "🚿", 5: "🌊" };

// ── Sensor values ─────────────────────────────────────────────
const ms = computed(() => props.plant.moisture_status ?? 0);
const sensors = computed(() => [
  ["☀️", props.plant.light_status ?? 0],
  ["🌡️", props.plant.temperature_status ?? 0],
  ["🧪", props.plant.salinity_status ?? props.plant.nutrients_status ?? 0],
]);

// ── Photo URL ─────────────────────────────────────────────────
const photoUrl = computed(() => {
  const thumb = props.plant.thumb_path
    ? props.plant.thumb_path.replace(
        "https://api.prod.fyta-app.de",
        "/img-proxy",
      )
    : "";
  return thumb || props.plant.plant_thumb_path || "";
});

// ── CSS classes ───────────────────────────────────────────────
const cardBorderClass = computed(() => {
  if (ms.value === 1) return "border border-error/50 bg-base-200";
  if (ms.value === 2) return "border border-warning/40 bg-base-200";
  return "border border-base-300 bg-base-200";
});

const nameSizeClass = computed(() =>
  tier.value === "micro" ? "text-xs" : "text-sm",
);

const moistureColorClass = computed(() => {
  const m = ms.value;
  if (m === 1) return "text-error";
  if (m === 2 || m === 4) return "text-warning";
  if (m === 3) return "text-success";
  if (m === 5) return "text-info";
  return "text-base-content/40";
});

const badgeText = computed(() => {
  if (ms.value === 1) return "💧 Now";
  if (ms.value === 2) return "💧 Soon";
  return "";
});
const badgeClass = computed(() =>
  ms.value === 1 ? "badge-error" : "badge-warning",
);

function barColorClass(code) {
  if (code === 1) return "bg-error";
  if (code === 2 || code === 4) return "bg-warning";
  if (code === 3) return "bg-success";
  if (code === 5) return "bg-info";
  return "bg-base-content/20";
}

function labelColorClass(code) {
  if (code === 1) return "text-error";
  if (code === 2 || code === 4) return "text-warning";
  if (code === 3) return "text-success";
  if (code === 5) return "text-info";
  return "text-base-content/40";
}
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlantCard.vue
git commit -m "feat: add PlantCard component with 4 content tiers"
```

---

## Task 10: `PlantGrid` component

**Files:**

- Create: `src/components/PlantGrid.vue`

- [ ] **Step 1: Create `src/components/PlantGrid.vue`**

```vue
<!-- src/components/PlantGrid.vue -->
<template>
  <div ref="gridEl" class="flex-1 overflow-hidden p-2 min-h-0">
    <div
      v-if="plants.length"
      class="grid w-full h-full gap-2"
      :style="gridStyle"
    >
      <PlantCard
        v-for="plant in plants"
        :key="plant.id"
        :plant="plant"
        :card-height="cardHeight"
      />
      <!-- Empty placeholder slots to keep grid shape -->
      <div v-for="i in emptySlots" :key="`empty-${i}`" />
    </div>
    <div
      v-else
      class="w-full h-full flex flex-col items-center justify-center gap-4 opacity-40"
    >
      <span class="text-6xl select-none">🪴</span>
      <p class="text-sm">No plants found. Add some in the FYTA app first.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useElementSize } from "@vueuse/core";
import { useGridLayout } from "../composables/useGridLayout.js";
import PlantCard from "./PlantCard.vue";

const props = defineProps({
  plants: { type: Array, required: true },
});

const gridEl = ref(null);
const { width, height } = useElementSize(gridEl);

// gap-2 = 8px; p-2 = 8px padding each side
const GAP = 8;
const PADDING = 16; // p-2 on each axis (8px × 2)

const availW = computed(() => Math.max(0, width.value - PADDING));
const availH = computed(() => Math.max(0, height.value - PADDING));

const layout = useGridLayout(
  computed(() => props.plants.length),
  availW,
  availH,
);

// Actual card height accounting for gaps between rows
const cardHeight = computed(() => {
  const { rows } = layout.value;
  if (!rows || availH.value <= 0) return 160;
  const totalGaps = (rows - 1) * GAP;
  return Math.floor((availH.value - totalGaps) / rows);
});

const emptySlots = computed(() => {
  const { cols, rows } = layout.value;
  return Math.max(0, cols * rows - props.plants.length);
});

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${layout.value.cols}, 1fr)`,
  gridTemplateRows: `repeat(${layout.value.rows}, 1fr)`,
}));
</script>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PlantGrid.vue
git commit -m "feat: add PlantGrid — viewport-fill grid with useElementSize + useGridLayout"
```

---

## Task 11: `App.vue` — wire everything together

**Files:**

- Modify: `src/App.vue`

- [ ] **Step 1: Write final `src/App.vue`**

```vue
<!-- src/App.vue -->
<template>
  <!-- Config missing -->
  <div
    v-if="!apiToken"
    class="min-h-screen flex items-center justify-center p-6 bg-base-100"
  >
    <div class="card bg-base-200 shadow-xl w-full max-w-lg">
      <div class="card-body gap-4">
        <span class="text-5xl select-none">🌿</span>
        <h1 class="card-title text-xl">One-time setup needed</h1>
        <div role="alert" class="alert alert-warning text-sm">
          <span>
            Create a <code class="font-mono">.env.local</code> file with:<br />
            <code class="font-mono">VITE_API_TOKEN=your-token-here</code><br />
            Get your token at <strong>web.fyta.de → API Token</strong>
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Dashboard -->
  <div v-else class="flex flex-col h-screen overflow-hidden bg-base-100">
    <AppHeader
      :is-loading="isFetching"
      :last-updated="lastUpdated"
      @refresh="refresh"
    />
    <SummaryBar :plants="plants" />

    <!-- Loading (initial) -->
    <div
      v-if="isFetching && !plants.length"
      class="flex-1 flex items-center justify-center"
    >
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error && !plants.length" class="p-4">
      <div role="alert" class="alert alert-error text-sm">
        <span>Could not load plants: {{ error }}</span>
      </div>
    </div>

    <!-- Grid -->
    <PlantGrid v-else :plants="plants" />
  </div>
</template>

<script setup>
import { useIntervalFn } from "@vueuse/core";
import { usePlants } from "./composables/usePlants.js";
import AppHeader from "./components/AppHeader.vue";
import SummaryBar from "./components/SummaryBar.vue";
import PlantGrid from "./components/PlantGrid.vue";

const apiToken = import.meta.env.VITE_API_TOKEN;

const { plants, isFetching, error, execute, lastUpdated } = usePlants();

function refresh() {
  execute();
}

useIntervalFn(execute, 5 * 60 * 1000);
</script>
```

- [ ] **Step 2: Verify full app in browser**

```bash
npm run dev
```

Open `http://localhost:5173` and verify:

- All 23 plants render in a grid that fills the viewport
- No scrollbar visible
- Summary bar shows correct counts
- Header shows "🌿 My Plants" and Refresh button
- Resizing the window redistributes the grid (try narrow → wide)
- Refreshes automatically; manual Refresh button spins while loading

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: wire App.vue — full dashboard with auto-refresh and viewport-fill grid"
```

---

## Task 12: Update `server.py` to serve `dist/`

**Files:**

- Modify: `server.py`

- [ ] **Step 1: Update `server.py` to serve from `dist/`**

Replace the top of `server.py` (keep all proxy logic intact, only change the static file serving root):

```python
#!/usr/bin/env python3
"""
FYTA Dashboard server — serves dist/ and proxies:
  /api/*       → https://web.fyta.de/api/*        (JSON, auth from browser)
  /img-proxy/* → https://api.prod.fyta-app.de/*   (images, auth from config.js)
Usage: python3 server.py
"""
import http.server
import os
import re
import urllib.request
import urllib.error

PORT = 8080
UPSTREAM     = "https://web.fyta.de"
IMG_UPSTREAM = "https://api.prod.fyta-app.de"
DIST_DIR     = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')


def _load_token():
    try:
        with open('config.js') as f:
            m = re.search(r"api_token:\s*['\"]([^'\"]+)['\"]", f.read())
            return m.group(1) if m else ''
    except FileNotFoundError:
        pass
    # Also try .env.local
    try:
        with open('.env.local') as f:
            for line in f:
                if line.startswith('VITE_API_TOKEN='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        return ''
    return ''


TOKEN = _load_token()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_OPTIONS(self):
        if self.path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Authorization, Accept')
            self.end_headers()
        else:
            super().do_OPTIONS()

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy_api()
        elif self.path.startswith('/img-proxy/'):
            self._proxy_img()
        else:
            super().do_GET()

    def _proxy_api(self):
        url  = UPSTREAM + self.path
        auth = self.headers.get('Authorization', '')
        req  = urllib.request.Request(url, headers={
            'Authorization': auth,
            'Accept': 'application/json',
        })
        try:
            with urllib.request.urlopen(req) as resp:
                body = resp.read()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.HTTPError as e:
            self.send_error(e.code, e.reason)

    def _proxy_img(self):
        img_path = self.path[len('/img-proxy'):]
        url = IMG_UPSTREAM + img_path
        req = urllib.request.Request(url, headers={
            'Authorization': f'Bearer {TOKEN}',
            'Accept': 'image/*,*/*',
        })
        try:
            with urllib.request.urlopen(req) as resp:
                body         = resp.read()
                content_type = resp.headers.get('Content-Type', 'image/jpeg')
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Cache-Control', 'public, max-age=3600')
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.HTTPError as e:
            self.send_error(e.code, e.reason)

    def log_message(self, fmt, *args):
        pass  # silence access log


if __name__ == '__main__':
    if not os.path.isdir(DIST_DIR):
        print(f"ERROR: dist/ not found — run 'npm run build' first")
        raise SystemExit(1)
    with http.server.HTTPServer(('', PORT), Handler) as srv:
        print(f"FYTA Dashboard → http://localhost:{PORT}")
        srv.serve_forever()
```

- [ ] **Step 2: Commit**

```bash
git add server.py
git commit -m "chore: update server.py to serve dist/ and read token from .env.local"
```

---

## Task 13: Production build + smoke test

**Files:** none (verification only)

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: `dist/` directory created, no errors. Output should look like:

```
dist/index.html        ~0.5 kB
dist/assets/index-xxx.css   ~xx kB
dist/assets/index-xxx.js    ~xxx kB
```

- [ ] **Step 2: Kill existing servers and start production server**

```bash
pkill -f "python3 server.py" 2>/dev/null; pkill -f "npm run dev" 2>/dev/null
sleep 1
python3 server.py &
sleep 1
```

- [ ] **Step 3: Open and verify**

```bash
open http://localhost:8080
```

Verify in browser:

1. Dashboard loads with forest theme (dark background, green accent)
2. All 23 plants shown in grid — no scrollbar
3. Plant photos visible
4. Summary bar shows correct chip counts
5. Refresh button works
6. Resizing window recalculates grid
7. Open DevTools → Network tab → no CORS errors

- [ ] **Step 4: Final commit**

```bash
git add dist/ 2>/dev/null || true
# dist/ is gitignored — just verify the build exists
git status
```

`dist/` should show as untracked (gitignored). No changes to commit here — all source is already committed.

- [ ] **Step 5: Tag the milestone**

```bash
git tag v2.0.0-vue
git log --oneline -8
```

Expected: clean commit history with all tasks committed individually.

---

## Self-Review Checklist

- [x] **Spec coverage:** Vite scaffold ✓, Tailwind+DaisyUI ✓, `.env.local` config ✓, `useGridLayout` ✓, `usePlants` ✓, `AppHeader` ✓, `SummaryBar` ✓, `PlantCard` (4 tiers) ✓, `PlantGrid` (useElementSize+useGridLayout) ✓, `App.vue` ✓, `server.py` update ✓, prod build ✓
- [x] **No placeholders:** all code blocks are complete
- [x] **Type consistency:** `layout.value.cols/rows` used consistently; `cardHeight` is always a `Number`; `plants` is always `Array`; `useGridLayout` returns `computed` with `{ cols, rows }`
- [x] **Edge cases covered:** empty plants list (empty state in PlantGrid), missing API token (config screen in App.vue), photo load failure (photoFailed ref in PlantCard), `dist/` missing (server.py exits with error)
