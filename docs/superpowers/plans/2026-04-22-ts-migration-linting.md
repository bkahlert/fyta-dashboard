# TypeScript Migration + Linting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all JS source files to TypeScript with strict types, and wire up ESLint 9 flat config with typescript-eslint `strictTypeChecked`, eslint-plugin-vue, sonarjs, unicorn, perfectionist, and prettier.

**Architecture:** Shared domain types live in `src/types/plant.ts`. Composables become `.ts` with explicit generics. Vue SFCs use `<script setup lang="ts">` with typed `defineProps`/`defineEmits`. ESLint flat config at root wires all plugins; Prettier handles formatting. `vue-tsc` provides build-time type checking.

**Tech Stack:** TypeScript 5 (`strict` + `noUncheckedIndexedAccess`), Vue 3, Vite 8, ESLint 9 flat config, typescript-eslint `strictTypeChecked`, eslint-plugin-vue `flat/recommended`, eslint-plugin-sonarjs, eslint-plugin-unicorn, eslint-plugin-perfectionist, Prettier, vue-tsc.

---

## File Map

| Action | Path                                       | Responsibility                                          |
| ------ | ------------------------------------------ | ------------------------------------------------------- |
| Create | `src/types/plant.ts`                       | `SensorStatus`, `Plant`, `FytaApiResponse` shared types |
| Create | `eslint.config.ts`                         | ESLint 9 flat config (all plugins + overrides)          |
| Create | `.prettierrc`                              | Prettier formatting rules                               |
| Rename | `src/main.js` → `src/main.ts`              | App entry point                                         |
| Rename | `src/composables/useGridLayout.js` → `.ts` | Typed `MaybeRefOrGetter` params, `GridLayout` return    |
| Rename | `src/composables/usePlants.js` → `.ts`     | Typed fetch, `Plant[]` output                           |
| Rename | `vite.config.js` → `vite.config.ts`        | Typed Vite config                                       |
| Modify | `src/App.vue`                              | `lang="ts"` on `<script setup>`                         |
| Modify | `src/components/AppHeader.vue`             | `lang="ts"`, typed props + emits                        |
| Modify | `src/components/SummaryBar.vue`            | `lang="ts"`, typed props                                |
| Modify | `src/components/PlantCard.vue`             | `lang="ts"`, typed props, typed sensor tuples           |
| Modify | `src/components/PlantGrid.vue`             | `lang="ts"`, typed props                                |
| Modify | `src/components/*.stories.ts`              | Fix any type gaps revealed by strict mode               |
| Modify | `tsconfig.json`                            | Expand include, add `noUncheckedIndexedAccess`          |
| Modify | `package.json`                             | Add `type-check`, `lint`, `lint:fix`, `format` scripts  |

---

## Task 1: Install packages + expand tsconfig + add npm scripts

**Files:**

- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Install linting + formatting packages**

```bash
npm install -D \
  @eslint/js \
  typescript-eslint \
  eslint-plugin-vue \
  vue-eslint-parser \
  prettier \
  eslint-config-prettier \
  eslint-plugin-sonarjs \
  eslint-plugin-unicorn \
  eslint-plugin-perfectionist \
  vue-tsc
```

Expected: clean install, no peer dep conflicts.

- [ ] **Step 2: Expand tsconfig.json**

Replace `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["node"],
    "jsx": "preserve"
  },
  "include": [
    ".storybook/**/*",
    "src/**/*",
    "vite.config.ts",
    "eslint.config.ts"
  ]
}
```

- [ ] **Step 3: Add npm scripts to package.json**

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "storybook": "storybook dev -p 6006",
  "build-storybook": "storybook build",
  "type-check": "vue-tsc --noEmit",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write ."
}
```

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json tsconfig.json
git commit -m "chore: install lint/format packages, expand tsconfig"
```

---

## Task 2: Create shared Plant types

**Files:**

- Create: `src/types/plant.ts`

- [ ] **Step 1: Create `src/types/plant.ts`**

```typescript
export type SensorStatus = 0 | 1 | 2 | 3 | 4 | 5;

export interface Plant {
  id: number | string;
  nickname?: string;
  scientific_name?: string;
  common_name?: string;
  moisture_status?: SensorStatus;
  light_status?: SensorStatus;
  temperature_status?: SensorStatus;
  salinity_status?: SensorStatus;
  nutrients_status?: SensorStatus;
  thumb_path?: string;
  plant_thumb_path?: string;
  _garden?: string;
}

export interface FytaApiResponse {
  plants?: Plant[];
  gardens?: Array<{ name: string; plants?: Plant[] }>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/plant.ts
git commit -m "feat: add shared Plant types"
```

---

## Task 3: Set up ESLint and Prettier configs

**Files:**

- Create: `eslint.config.ts`
- Create: `.prettierrc`
- Create: `.prettierignore`

- [ ] **Step 1: Create `.prettierrc`**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 2: Create `.prettierignore`**

```
dist/
storybook-static/
node_modules/
home-assistant/
*.md
```

- [ ] **Step 3: Create `eslint.config.ts`**

```typescript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import prettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";
import unicorn from "eslint-plugin-unicorn";
import perfectionist from "eslint-plugin-perfectionist";

export default tseslint.config(
  {
    ignores: ["dist/", "storybook-static/", "node_modules/", "home-assistant/"],
  },

  eslint.configs.recommended,

  // TypeScript — type-aware strict rules
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // Vue SFCs
  ...pluginVue.configs["flat/recommended"],

  // Type-aware parser config for .vue files
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Type-aware parser config for .ts files
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Code quality
  sonarjs.configs.recommended,
  unicorn.configs.recommended,
  perfectionist.configs["recommended-natural"],

  // Prettier must be last — disables ESLint formatting rules
  prettier,

  // Project-level overrides
  {
    rules: {
      // Enforce TypeScript on all SFCs
      "vue/block-lang": ["error", { script: { lang: "ts" } }],
      // Enforce <script setup> API style
      "vue/component-api-style": ["error", ["script-setup"]],

      // unicorn: Vue uses null by convention (e.g. Date | null refs, prop defaults)
      "unicorn/no-null": "off",
      // unicorn: single-letter vars (p, g) are idiomatic in short callbacks
      "unicorn/prevent-abbreviations": "off",
      // unicorn: filename conventions — components are PascalCase, composables/configs are camelCase
      "unicorn/filename-case": [
        "error",
        {
          cases: { pascalCase: true, camelCase: true },
          ignore: [/\.stories\.ts$/, /eslint\.config\.ts/],
        },
      ],
      // unicorn: forEach is idiomatic in Vue template expressions
      "unicorn/no-array-for-each": "off",
      // unicorn: Array.from is fine; no need to force spread
      "unicorn/prefer-spread": "off",
    },
  },
);
```

- [ ] **Step 4: Verify ESLint config loads without error (no source files converted yet)**

```bash
npx eslint --print-config src/main.js 2>&1 | head -5
```

Expected: JSON config output (not an error).

- [ ] **Step 5: Commit**

```bash
git add eslint.config.ts .prettierrc .prettierignore
git commit -m "chore: add ESLint 9 flat config + Prettier"
```

---

## Task 4: Convert composables to TypeScript

**Files:**

- Rename: `src/composables/useGridLayout.js` → `src/composables/useGridLayout.ts`
- Rename: `src/composables/usePlants.js` → `src/composables/usePlants.ts`

- [ ] **Step 1: Replace `useGridLayout.js` with `useGridLayout.ts`**

```bash
git rm src/composables/useGridLayout.js
```

Create `src/composables/useGridLayout.ts`:

```typescript
import { computed, toValue } from "vue";
import type { MaybeRefOrGetter } from "vue";

export interface GridLayout {
  cols: number;
  rows: number;
}

export function useGridLayout(
  count: MaybeRefOrGetter<number>,
  availW: MaybeRefOrGetter<number>,
  availH: MaybeRefOrGetter<number>,
) {
  return computed<GridLayout>(() => {
    const n = toValue(count);
    const w = toValue(availW);
    const h = toValue(availH);

    if (n <= 0 || w <= 0 || h <= 0) return { cols: 1, rows: 1 };

    let bestCols = 1;
    let bestArea = 0;

    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const area = Math.min(w / cols, h / rows);
      if (area > bestArea) {
        bestArea = area;
        bestCols = cols;
      }
    }

    return { cols: bestCols, rows: Math.ceil(n / bestCols) };
  });
}
```

- [ ] **Step 2: Replace `usePlants.js` with `usePlants.ts`**

```bash
git rm src/composables/usePlants.js
```

Create `src/composables/usePlants.ts`:

```typescript
import { computed, ref, watch } from "vue";
import { useFetch } from "@vueuse/core";
import type { FytaApiResponse, Plant } from "../types/plant";

// Most urgent first: dry → water-soon → overwatered → slightly-wet → ok → no-sensor
const URGENCY_ORDER = [1, 2, 5, 4, 3, 0] as const;

function flattenAndSort(data: unknown): Plant[] {
  if (data === null || typeof data !== "object") return [];

  let plants: Plant[] = [];

  if (Array.isArray(data)) {
    plants = data as Plant[];
  } else {
    const response = data as FytaApiResponse;
    if (Array.isArray(response.plants)) {
      plants = response.plants;
    } else if (Array.isArray(response.gardens)) {
      for (const garden of response.gardens) {
        for (const plant of garden.plants ?? []) {
          plants.push({ ...plant, _garden: garden.name });
        }
      }
    }
  }

  return [...plants].sort(
    (a, b) =>
      URGENCY_ORDER.indexOf(a.moisture_status ?? 0) -
      URGENCY_ORDER.indexOf(b.moisture_status ?? 0),
  );
}

export function usePlants() {
  const lastUpdated = ref<Date | null>(null);

  const { data, isFetching, error, execute } = useFetch("/api/user-plant", {
    headers: { Accept: "application/json" },
  }).json<FytaApiResponse | Plant[]>();

  watch(isFetching, (fetching) => {
    if (!fetching && data.value != null) lastUpdated.value = new Date();
  });

  const plants = computed(() => flattenAndSort(data.value));

  return { plants, isFetching, error, execute, lastUpdated };
}
```

- [ ] **Step 3: Run type-check to verify composables**

```bash
npx vue-tsc --noEmit 2>&1 | grep -E "(useGrid|usePlants|error)" | head -20
```

Expected: no errors for those two files.

- [ ] **Step 4: Commit**

```bash
git add src/composables/useGridLayout.ts src/composables/usePlants.ts
git commit -m "feat: convert composables to TypeScript"
```

---

## Task 5: Convert vite.config.js and main.js

**Files:**

- Rename: `vite.config.js` → `vite.config.ts`
- Rename: `src/main.js` → `src/main.ts`

- [ ] **Step 1: Replace `vite.config.js` with `vite.config.ts`**

```bash
git rm vite.config.js
```

Create `vite.config.ts`:

```typescript
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const authHeader = (proxyReq: {
    setHeader: (k: string, v: string) => void;
  }) => {
    proxyReq.setHeader(
      "Authorization",
      `Bearer ${env["FYTA_API_TOKEN"] ?? ""}`,
    );
  };

  return {
    plugins: [vue(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: "https://web.fyta.de",
          changeOrigin: true,
          secure: true,
          configure: (proxy) => {
            proxy.on("proxyReq", authHeader);
          },
        },
        "/img-proxy": {
          target: "https://api.prod.fyta-app.de",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/img-proxy/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", authHeader);
          },
        },
      },
    },
  };
});
```

- [ ] **Step 2: Replace `src/main.js` with `src/main.ts`**

```bash
git rm src/main.js
```

Create `src/main.ts`:

```typescript
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";

createApp(App).mount("#app");
```

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts src/main.ts
git commit -m "feat: convert vite.config and main entry to TypeScript"
```

---

## Task 6: Convert App.vue, AppHeader.vue, SummaryBar.vue

**Files:**

- Modify: `src/App.vue`
- Modify: `src/components/AppHeader.vue`
- Modify: `src/components/SummaryBar.vue`

- [ ] **Step 1: Update `src/App.vue`**

Replace the `<script setup>` block:

```vue
<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core";
import { usePlants } from "./composables/usePlants";
import AppHeader from "./components/AppHeader.vue";
import SummaryBar from "./components/SummaryBar.vue";
import PlantGrid from "./components/PlantGrid.vue";

const { plants, isFetching, error, execute, lastUpdated } = usePlants();

function refresh() {
  execute();
}

useIntervalFn(execute, 5 * 60 * 1000);
</script>
```

- [ ] **Step 2: Update `src/components/AppHeader.vue`**

Replace the `<script setup>` block:

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useTimeAgo } from "@vueuse/core";

const props = defineProps<{
  isLoading?: boolean;
  lastUpdated?: Date | null;
}>();

defineEmits<{ refresh: [] }>();

const timeAgo = useTimeAgo(
  computed(() => props.lastUpdated ?? undefined),
  {
    messages: {
      justNow: "Gerade eben",
      past: (n) => `vor ${n}`,
      future: (n) => `in ${n}`,
      month: (n) => `${n} Monat${n !== "1" ? "en" : ""}`,
      year: (n) => `${n} Jahr${n !== "1" ? "en" : ""}`,
      day: (n) => `${n} Tag${n !== "1" ? "en" : ""}`,
      week: (n) => `${n} Woche${n !== "1" ? "n" : ""}`,
      hour: (n) => `${n} Stunde${n !== "1" ? "n" : ""}`,
      minute: (n) => `${n} Minute${n !== "1" ? "n" : ""}`,
      second: (n) => `${n} Sekunde${n !== "1" ? "n" : ""}`,
      invalid: "Ungültig",
    },
  },
);
</script>
```

- [ ] **Step 3: Update `src/components/SummaryBar.vue`**

Replace the `<script setup>` block:

```vue
<script setup lang="ts">
import { computed } from "vue";
import type { Plant } from "../types/plant";

const props = defineProps<{ plants: Plant[] }>();

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

- [ ] **Step 4: Run type-check**

```bash
npx vue-tsc --noEmit 2>&1 | grep -v "^$" | head -30
```

Expected: no errors for the three files above (PlantCard/PlantGrid not yet converted — errors there are expected).

- [ ] **Step 5: Commit**

```bash
git add src/App.vue src/components/AppHeader.vue src/components/SummaryBar.vue
git commit -m "feat: convert App, AppHeader, SummaryBar to TypeScript"
```

---

## Task 7: Convert PlantCard.vue

**Files:**

- Modify: `src/components/PlantCard.vue`

- [ ] **Step 1: Replace `<script setup>` in `PlantCard.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import type { Plant, SensorStatus } from "../types/plant";

const props = defineProps<{
  plant: Plant;
  cardHeight?: number;
}>();

const cardHeightPx = computed(() => props.cardHeight ?? 160);
const photoFailed = ref(false);

// ── Content tier ──────────────────────────────────────────────
type Tier = "full" | "medium" | "compact" | "micro";

const tier = computed<Tier>(() => {
  const h = cardHeightPx.value;
  if (h >= 180) return "full";
  if (h >= 120) return "medium";
  if (h >= 80) return "compact";
  return "micro";
});

const photoHeight = computed(() => {
  const h = cardHeightPx.value;
  if (h < 80) return 0;
  if (h < 120) return Math.round(h * 0.2);
  return Math.round(h * 0.35);
});

const bodyClass = computed(() => {
  if (tier.value === "micro") return "p-1 gap-0.5";
  if (tier.value === "compact") return "p-1.5 gap-0.5";
  return "p-2 gap-1";
});

// ── Sensor data ────────────────────────────────────────────────
const SENSOR_BARS: Record<SensorStatus, number> = {
  0: 0,
  1: 8,
  2: 28,
  3: 70,
  4: 87,
  5: 98,
};

type SensorType = "moisture" | "light" | "temp" | "salinity";

const SENSOR_LABELS: Record<SensorType, Record<SensorStatus, string>> = {
  moisture: {
    0: "–",
    1: "Trocken",
    2: "Wenig",
    3: "OK",
    4: "Feucht",
    5: "Nass",
  },
  light: { 0: "–", 1: "Dunkel", 2: "Wenig", 3: "OK", 4: "Hell", 5: "Grell" },
  temp: { 0: "–", 1: "Kalt", 2: "Kühl", 3: "OK", 4: "Warm", 5: "Heiß" },
  salinity: {
    0: "–",
    1: "Mangel",
    2: "Wenig",
    3: "OK",
    4: "Hoch",
    5: "Zuviel",
  },
};

const MOISTURE_HEADLINE: Record<SensorStatus, string> = {
  0: "Kein Sensor",
  1: "Braucht Wasser",
  2: "Bald gießen",
  3: "Gut versorgt",
  4: "Leicht feucht",
  5: "Überwässert",
};

const MOISTURE_EMOJI: Record<SensorStatus, string> = {
  0: "🪴",
  1: "💧",
  2: "💧",
  3: "✅",
  4: "🚿",
  5: "🌊",
};

const ms = computed<SensorStatus>(
  () => (props.plant.moisture_status ?? 0) as SensorStatus,
);

type SensorRow = [icon: string, status: SensorStatus, type: SensorType];

const sensors = computed<SensorRow[]>(() => [
  ["☀️", (props.plant.light_status ?? 0) as SensorStatus, "light"],
  ["🌡️", (props.plant.temperature_status ?? 0) as SensorStatus, "temp"],
  [
    "🧪",
    (props.plant.salinity_status ??
      props.plant.nutrients_status ??
      0) as SensorStatus,
    "salinity",
  ],
]);

// ── Photo ─────────────────────────────────────────────────────
const photoUrl = computed(() => {
  const thumb = props.plant.thumb_path
    ? props.plant.thumb_path.replace(
        "https://api.prod.fyta-app.de",
        "/img-proxy",
      )
    : "";
  return thumb || props.plant.plant_thumb_path || "";
});

// ── CSS helpers ───────────────────────────────────────────────
function statusColorClass(
  status: SensorStatus,
  variant: "text" | "bg",
): string {
  const prefix = variant === "text" ? "text" : "bg";
  if (status === 1) return `${prefix}-error`;
  if (status === 2 || status === 4) return `${prefix}-warning`;
  if (status === 3) return `${prefix}-success`;
  if (status === 5) return `${prefix}-info`;
  return variant === "text" ? "text-base-content/40" : "bg-base-content/20";
}

const cardBorderClass = computed(() => {
  if (ms.value === 1) return "border-2 border-error bg-base-200";
  if (ms.value === 2) return "border-2 border-warning bg-base-200";
  return "border-2 border-base-300 bg-base-200";
});

const nameSizeClass = computed(() =>
  tier.value === "micro" ? "text-xs" : "text-sm",
);

const moistureColorClass = computed(() => statusColorClass(ms.value, "text"));

const badgeText = computed(() => {
  if (ms.value === 1) return "💧 Jetzt";
  if (ms.value === 2) return "💧 Bald";
  return "";
});

const badgeClass = computed(() =>
  ms.value === 1 ? "badge-error" : "badge-warning",
);

const barColorClass = (status: SensorStatus) => statusColorClass(status, "bg");
const labelColorClass = (status: SensorStatus) =>
  statusColorClass(status, "text");
</script>
```

The `<template>` block stays the same except update the `v-for` destructuring to use the new tuple shape, and update function calls to use renamed helpers:

In the template, replace:

- `:class="barColorClass(code)"` — no change needed (same name)
- `:class="labelColorClass(code)"` — no change needed
- `{{ SENSOR_LABELS[type][code] ?? '' }}` — no change needed
- `{{ MOISTURE_HEADLINE[ms] }}` — no change needed
- `{{ MOISTURE_EMOJI[ms] ?? '💧' }}` — no change needed

- [ ] **Step 2: Run type-check**

```bash
npx vue-tsc --noEmit 2>&1 | grep "PlantCard" | head -20
```

Expected: no errors for PlantCard.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlantCard.vue
git commit -m "feat: convert PlantCard to TypeScript"
```

---

## Task 8: Convert PlantGrid.vue

**Files:**

- Modify: `src/components/PlantGrid.vue`

- [ ] **Step 1: Replace `<script setup>` in `PlantGrid.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useElementSize } from "@vueuse/core";
import { useGridLayout } from "../composables/useGridLayout";
import type { Plant } from "../types/plant";
import PlantCard from "./PlantCard.vue";

const props = defineProps<{ plants: Plant[] }>();

const gridEl = ref<HTMLElement | null>(null);
const { width, height } = useElementSize(gridEl);

const GAP = 8;
const PADDING = 16;

const availW = computed(() => Math.max(0, width.value - PADDING));
const availH = computed(() => Math.max(0, height.value - PADDING));

const layout = useGridLayout(
  computed(() => props.plants.length),
  availW,
  availH,
);

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

- [ ] **Step 2: Run type-check — should now be clean**

```bash
npx vue-tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlantGrid.vue
git commit -m "feat: convert PlantGrid to TypeScript"
```

---

## Task 9: Fix stories for strict types

**Files:**

- Modify: `src/components/AppHeader.stories.ts`
- Modify: `src/components/SummaryBar.stories.ts`
- Modify: `src/components/PlantCard.stories.ts`
- Modify: `src/components/PlantGrid.stories.ts`

- [ ] **Step 1: Update `AppHeader.stories.ts`**

The `args` default `lastUpdated: null` is fine since the prop is `Date | null | undefined`. No changes needed if type-check passes.

Run to verify:

```bash
npx vue-tsc --noEmit 2>&1 | grep "stories"
```

Expected: no errors.

- [ ] **Step 2: Update `PlantCard.stories.ts` to use `Plant` type**

```typescript
import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { Plant } from "../types/plant";
import PlantCard from "./PlantCard.vue";

const healthyPlant: Plant = {
  id: 1,
  nickname: "Monstera",
  scientific_name: "Monstera deliciosa",
  moisture_status: 3,
  light_status: 3,
  temperature_status: 3,
  salinity_status: 3,
  thumb_path:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Monstera_deliciosa3.jpg/320px-Monstera_deliciosa3.jpg",
};

const thirstyPlant: Plant = {
  ...healthyPlant,
  id: 2,
  nickname: "Fikus",
  scientific_name: "Ficus lyrata",
  moisture_status: 1,
  light_status: 2,
};

const warnPlant: Plant = {
  ...healthyPlant,
  id: 3,
  nickname: "Efeutute",
  scientific_name: "Epipremnum aureum",
  moisture_status: 2,
};

const meta: Meta<typeof PlantCard> = {
  component: PlantCard,
  decorators: [
    () => ({ template: '<div style="width:200px"><story /></div>' }),
  ],
  args: {
    plant: healthyPlant,
    cardHeight: 200,
  },
};

export default meta;
type Story = StoryObj<typeof PlantCard>;

export const Full: Story = { args: { cardHeight: 220 } };
export const Medium: Story = { args: { cardHeight: 140 } };
export const Compact: Story = { args: { cardHeight: 90 } };
export const Micro: Story = { args: { cardHeight: 60 } };
export const NeedsWater: Story = {
  args: { plant: thirstyPlant, cardHeight: 220 },
};
export const WaterSoon: Story = { args: { plant: warnPlant, cardHeight: 220 } };
export const NoPhoto: Story = {
  args: {
    plant: { ...healthyPlant, thumb_path: "", plant_thumb_path: "" },
    cardHeight: 220,
  },
};
```

- [ ] **Step 3: Update `SummaryBar.stories.ts` to use `Plant` type**

```typescript
import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { Plant, SensorStatus } from "../types/plant";
import SummaryBar from "./SummaryBar.vue";

const make = (moisture_status: SensorStatus): Plant => ({
  id: Math.random(),
  moisture_status,
});

const meta: Meta<typeof SummaryBar> = { component: SummaryBar };
export default meta;
type Story = StoryObj<typeof SummaryBar>;

export const Empty: Story = { args: { plants: [] } };
export const AllOk: Story = {
  args: { plants: Array.from({ length: 6 }, () => make(3)) },
};
export const WithWarnings: Story = {
  args: { plants: [make(3), make(3), make(3), make(2), make(2)] },
};
export const Critical: Story = {
  args: { plants: [make(1), make(1), make(3), make(3)] },
};
export const Mixed: Story = {
  args: { plants: [make(1), make(2), make(3), make(3), make(4), make(5)] },
};
```

- [ ] **Step 4: Update `PlantGrid.stories.ts` to use `Plant` type**

```typescript
import type { Meta, StoryObj } from "@storybook/vue3-vite";
import type { Plant, SensorStatus } from "../types/plant";
import PlantGrid from "./PlantGrid.vue";

const makePlant = (
  id: number,
  moisture_status: SensorStatus,
  nickname: string,
): Plant => ({
  id,
  nickname,
  scientific_name: "Monstera deliciosa",
  moisture_status,
  light_status: 3,
  temperature_status: 3,
  salinity_status: 3,
  thumb_path: "",
});

const FEW: Plant[] = [
  makePlant(1, 1, "Fikus"),
  makePlant(2, 2, "Monstera"),
  makePlant(3, 3, "Efeutute"),
];

const MANY: Plant[] = [
  makePlant(1, 1, "Fikus"),
  makePlant(2, 2, "Monstera"),
  makePlant(3, 3, "Efeutute"),
  makePlant(4, 3, "Bogenhanf"),
  makePlant(5, 4, "Aloe Vera"),
  makePlant(6, 3, "Geldbaum"),
  makePlant(7, 2, "Orchidee"),
  makePlant(8, 3, "Palme"),
  makePlant(9, 1, "Kaktus"),
  makePlant(10, 3, "Farn"),
  makePlant(11, 3, "Tillandsie"),
  makePlant(12, 5, "Basilikum"),
];

const meta: Meta<typeof PlantGrid> = {
  component: PlantGrid,
  decorators: [
    () => ({
      template:
        '<div style="height:600px;display:flex;flex-direction:column"><story /></div>',
    }),
  ],
};

export default meta;
type Story = StoryObj<typeof PlantGrid>;

export const Empty: Story = { args: { plants: [] } };
export const ThreePlants: Story = { args: { plants: FEW } };
export const TwelvePlants: Story = { args: { plants: MANY } };
```

- [ ] **Step 5: Run full type-check**

```bash
npm run type-check
```

Expected: `0 errors`.

- [ ] **Step 6: Commit**

```bash
git add src/components/AppHeader.stories.ts src/components/SummaryBar.stories.ts src/components/PlantCard.stories.ts src/components/PlantGrid.stories.ts
git commit -m "feat: add Plant types to stories"
```

---

## Task 10: Run linter and fix all reported issues

**Files:** any that have lint violations

- [ ] **Step 1: Run lint and capture output**

```bash
npm run lint 2>&1 | tee /tmp/lint-output.txt | head -80
```

- [ ] **Step 2: Auto-fix what ESLint can fix automatically**

```bash
npm run lint:fix
```

- [ ] **Step 3: Format all files with Prettier**

```bash
npm run format
```

- [ ] **Step 4: Run lint again to see what remains**

```bash
npm run lint 2>&1 | head -60
```

For any remaining errors, fix them manually. Common issues and fixes:

**`@typescript-eslint/no-unsafe-assignment` on computed refs:** TypeScript infers `Ref<unknown>` from `useFetch`. Add explicit generic: `.json<FytaApiResponse | Plant[]>()` — already done in usePlants.ts.

**`unicorn/prefer-at`:** Replace `arr[arr.length - 1]` with `arr.at(-1)`. Not present in this codebase but fix if flagged.

**`sonarjs/cognitive-complexity`:** If a function is too complex, extract a helper. PlantCard's `statusColorClass` is already extracted for this reason.

**`perfectionist/sort-imports`:** Auto-fixed by `lint:fix`.

**`vue/block-lang`:** Any `.vue` file without `lang="ts"` — should be resolved by Tasks 6–8.

- [ ] **Step 5: Run type-check + lint in sequence**

```bash
npm run type-check && npm run lint
```

Expected: both exit 0.

- [ ] **Step 6: Commit all lint fixes**

```bash
git add -A
git commit -m "fix: resolve all ESLint and TypeScript errors"
```

---

## Task 11: Verify Storybook still builds + final commit

- [ ] **Step 1: Verify Storybook builds**

```bash
npm run build-storybook 2>&1 | tail -5
```

Expected: `Storybook build completed successfully`.

- [ ] **Step 2: Verify app builds**

```bash
npm run build 2>&1 | tail -5
```

Expected: `built in Xms` with no errors.

- [ ] **Step 3: Final commit if any files changed**

```bash
git status
git add -A
git commit -m "chore: verify builds pass after TS migration"
```

---

## Self-Review

**Spec coverage:**

- ✅ All JS files converted to TS
- ✅ `noUncheckedIndexedAccess` in tsconfig
- ✅ `typescript-eslint/strictTypeChecked` (array index → `T | undefined`)
- ✅ `eslint-plugin-vue` with `flat/recommended`
- ✅ `prettier` + `eslint-config-prettier`
- ✅ `eslint-plugin-sonarjs` (cognitive complexity, duplicates)
- ✅ `eslint-plugin-unicorn` (modern JS idioms)
- ✅ `eslint-plugin-perfectionist` (import sorting)
- ✅ `vue-tsc` type-check script
- ✅ Stories updated to use typed `Plant` / `SensorStatus`
- ✅ Storybook and app build verification

**Type consistency check:**

- `SensorStatus`, `Plant`, `FytaApiResponse` defined in Task 2, used identically in Tasks 4–9 ✅
- `GridLayout` defined and returned in `useGridLayout.ts`, consumed correctly in `PlantGrid.vue` ✅
- `SensorType` used only within `PlantCard.vue` — no external consumers ✅
- `statusColorClass` introduced in Task 7 replaces `barColorClass`/`labelColorClass` — template calls updated ✅
