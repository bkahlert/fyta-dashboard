# Vitest + Storybook Addon-Vitest Design

**Date:** 2026-04-22
**Branch:** feat/storybook

## Goal

Add Vitest as the project test runner and wire up `@storybook/addon-vitest` so that every existing Storybook story becomes a runnable Vitest test. The setup should support `play` functions added to stories in the future without requiring any additional infrastructure.

## Packages

| Package | Role |
|---|---|
| `vitest` | Test runner |
| `@storybook/addon-vitest` | Transforms stories into Vitest test cases via the `storybookTest()` Vite plugin |
| `happy-dom` | Simulated DOM environment (no browser download required) |

All three are `devDependencies`.

## Files

### New: `vitest.workspace.ts`

Declares a single Vitest project named `storybook`. Uses `environment: 'happy-dom'` (no `@vitest/browser`). The `storybookTest()` plugin from `@storybook/addon-vitest` scans `src/**/*.stories.ts` and emits a virtual test module per file; each named story export becomes one `test()` case.

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

### New: `.storybook/vitest.setup.ts`

Loads the Storybook preview annotations (global decorators, parameters) before the test suite runs, so stories render with the same context they have in the Storybook UI.

```ts
import { setProjectAnnotations } from '@storybook/vue3-vite'
import * as preview from './preview'

setProjectAnnotations([preview])
```

### Modified: `.storybook/main.ts`

Add `'@storybook/addon-vitest'` to the `addons` array.

### Modified: `package.json`

Add scripts:
```json
"test": "vitest",
"test:watch": "vitest --watch"
```

## Test behaviour

- Each named story export renders with its `args` in happy-dom.
- A test passes if the component mounts without throwing.
- When a `play` function is added to a story, it runs automatically as part of that story's test.
- Test names follow the pattern: `ComponentName > StoryName`.
- Current story count: AppHeader (3) + PlantCard (7) + PlantGrid (3) + SummaryBar (5) = **18 tests**.

## Tailwind / PostCSS note

The existing `viteFinal` in `.storybook/main.ts` strips `@tailwindcss/vite` and replaces it with the PostCSS plugin to work around a rolldown CSS loader issue. The `storybookTest()` plugin re-uses the same Vite config resolution path, so CSS processing in tests is consistent with the Storybook UI.

## Out of scope

- `@vitest/browser` / Playwright (can be adopted later if play functions need real layout)
- Snapshot tests
- Unit tests for non-component logic (composables, schemas)
