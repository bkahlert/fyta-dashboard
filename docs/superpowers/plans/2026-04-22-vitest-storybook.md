# Vitest + Storybook Addon-Vitest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest as the test runner and wire up `@storybook/addon-vitest` so each of the 18 existing story exports runs as an automatic smoke test, with infrastructure in place for future `play` function interaction tests.

**Architecture:** A `vitest.workspace.ts` at the project root declares one test project named `storybook`, using `happy-dom` as the DOM environment. The `storybookTest()` Vite plugin from `@storybook/addon-vitest` scans `src/**/*.stories.ts` and emits a virtual test module per story file — each named export becomes a `test()` case. A setup file (`.storybook/vitest.setup.ts`) loads the Storybook preview annotations before each suite so global decorators and parameters are active.

**Tech Stack:** Vitest 4.x, @storybook/addon-vitest 10.x, happy-dom 20.x, Storybook 10 (`@storybook/vue3-vite`), Vue 3, Vite 8.

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json` (devDependencies + scripts)

- [ ] **Step 1: Install the three new devDependencies**

```bash
npm install --save-dev vitest@^4.1.5 @storybook/addon-vitest@^10.3.5 happy-dom@^20.9.0
```

Expected output: packages added to `node_modules` and `package-lock.json` updated. No peer-dependency warnings.

- [ ] **Step 2: Add test scripts to package.json**

Open `package.json`. In the `"scripts"` section, add after the `"lint:fix"` line:

```json
"test": "vitest",
"test:watch": "vitest --watch",
```

The scripts block should look like:
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
  "test": "vitest",
  "test:watch": "vitest --watch",
  "format": "prettier --write ."
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest, @storybook/addon-vitest, happy-dom"
```

---

### Task 2: Create vitest workspace config

**Files:**
- Create: `vitest.workspace.ts`

- [ ] **Step 1: Create `vitest.workspace.ts` at the project root**

```ts
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  {
    plugins: [storybookTest()],
    test: {
      name: 'storybook',
      environment: 'happy-dom',
      setupFiles: ['.storybook/vitest.setup.ts'],
    },
  },
])
```

`storybookTest()` with no arguments auto-resolves `.storybook/main.ts` and `src/**/*.stories.ts`.

- [ ] **Step 2: Verify TypeScript is happy**

```bash
npm run type-check
```

Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add vitest.workspace.ts
git commit -m "feat: add vitest workspace config with storybook project"
```

---

### Task 3: Create Storybook vitest setup file

**Files:**
- Create: `.storybook/vitest.setup.ts`

- [ ] **Step 1: Create `.storybook/vitest.setup.ts`**

```ts
import { setProjectAnnotations } from '@storybook/vue3-vite'

import * as preview from './preview'

setProjectAnnotations([preview])
```

This loads the global `preview.ts` (which imports `../src/style.css` and sets background parameters) before any story test runs.

- [ ] **Step 2: Commit**

```bash
git add .storybook/vitest.setup.ts
git commit -m "feat: add storybook vitest setup file"
```

---

### Task 4: Register the addon in Storybook

**Files:**
- Modify: `.storybook/main.ts`

- [ ] **Step 1: Add `@storybook/addon-vitest` to the addons array in `.storybook/main.ts`**

Current `.storybook/main.ts` (no `addons` key yet). Add one:

```ts
import type { StorybookConfig } from '@storybook/vue3-vite'

import tailwindcss from '@tailwindcss/postcss'

const config: StorybookConfig = {
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  addons: ['@storybook/addon-vitest'],
  stories: ['../src/**/*.stories.ts'],
  viteFinal(config) {
    config.plugins = (config.plugins ?? [])
      .flat(Infinity as 1)
      .filter(
        (p): p is NonNullable<typeof p> =>
          !(typeof p === 'object' && p !== null && 'name' in p && typeof p.name === 'string' && p.name.startsWith('@tailwindcss')),
      )
    config.css = { ...config.css, postcss: { plugins: [tailwindcss()] } }
    return config
  },
}

export default config
```

- [ ] **Step 2: Commit**

```bash
git add .storybook/main.ts
git commit -m "feat: register @storybook/addon-vitest addon"
```

---

### Task 5: Run tests and verify all 18 pass

**Files:** none changed

- [ ] **Step 1: Run the full test suite**

```bash
npm test -- --run
```

(`--run` disables watch mode for a single-shot run.)

Expected output (trimmed):
```
 storybook  18 tests passed
```

All four story files should appear, each with their named exports listed:
- `AppHeader > Default`, `AppHeader > Loading`, `AppHeader > WithTimestamp`
- `PlantCard > Full`, `PlantCard > Medium`, `PlantCard > Compact`, `PlantCard > Micro`, `PlantCard > NeedsWater`, `PlantCard > WaterSoon`, `PlantCard > NoPhoto`
- `PlantGrid > Empty`, `PlantGrid > ThreePlants`, `PlantGrid > TwelvePlants`
- `SummaryBar > Empty`, `SummaryBar > AllOk`, `SummaryBar > WithWarnings`, `SummaryBar > Critical`, `SummaryBar > Mixed`

- [ ] **Step 2: If any test fails, diagnose**

Common failure modes and fixes:

| Symptom | Fix |
|---|---|
| `Cannot find module '@storybook/addon-vitest/vitest-plugin'` | `npm install` was not run or cache is stale — rerun `npm install` |
| `Error: setProjectAnnotations is not a function` | Wrong import — ensure `import { setProjectAnnotations } from '@storybook/vue3-vite'` (not `@storybook/test`) |
| CSS import error in setup file | `happy-dom` handles CSS imports silently; if it doesn't, add `css: false` under `test:` in `vitest.workspace.ts` |
| `Cannot find module '../src/style.css'` from setup | The setup file is in `.storybook/` — the CSS path `'../src/style.css'` in `preview.ts` is resolved from there correctly; if Vitest complains, add `{ transform: {} }` to `test:` to treat CSS as empty modules |

- [ ] **Step 3: Commit the passing baseline**

```bash
git add -A
git commit -m "feat: 18 story smoke tests passing via @storybook/addon-vitest"
```
