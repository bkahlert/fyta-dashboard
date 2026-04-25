# FYTA-native types + synthetic battery_status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-rolled `Plant` interface and `createPlant()` adapter with Zod-inferred types from `PlantDetailSchema`, fetch detail for every plant in parallel, and add a synthetic `battery_status` derived from the battery percentage.

**Architecture:** The list endpoint (`GET /api/user-plant`) is called once per poll for plant IDs and `hubs_with_lost_connection` only; each plant's full data comes from its detail endpoint (`GET /api/user-plant/:id`) fetched in parallel. `PlantDetailSchema` gains a minimal `.transform()` that adds only truly derived fields (`attentionLevel`, `attentionRank`, `battery_status`). Everything else keeps FYTA's native names and nesting.

**Tech Stack:** Vue 3, Vite, Zod v4, VueUse (`useIntervalFn`), Vitest, TypeScript

---

## File map

| Action | File | Role |
|--------|------|------|
| Modify | `src/api/schemas.ts` | Add `ApiTimestamp`, `AttentionLevel`, `deriveStatus`, transform on `PlantDetailSchema`; make `sensor`/`hub`/`garden`/`measurements` nullish; export `Plant` |
| Modify | `src/api/schemas.test.ts` | Add tests for `PlantDetailResponseSchema` transform |
| Modify | `src/composables/usePlants.ts` | Rewrite: list → IDs + hubs; parallel detail fetches; own polling interval |
| Delete | `src/types/plant.ts` | Replaced by `z.infer<typeof PlantDetailSchema>` |
| Delete | `src/composables/useBatteryLevels.ts` | Battery now comes from detail fetch |
| Delete | `src/types/plant.test.ts` | File no longer exists |
| Modify | `src/App.vue` | Remove `useBatteryLevels`, `plantsWithBattery`; use FYTA-native hub field paths; remove own polling interval |
| Modify | `src/components/SensorStatus.vue` | Add `'battery'` type; add optional `value`/`unit` props rendered as `title` |
| Modify | `src/components/PlantCard.vue` | Use FYTA-native field paths; drop battery badge; add battery `SensorStatus` row |
| Modify | `src/components/PlantCard.stories.ts` | Replace `createPlant` with `makePlant` factory; use FYTA-native shape |

---

## Task 1: Schema — PlantDetailSchema transform (attentionLevel + battery_status)

**Files:**
- Modify: `src/api/schemas.ts`
- Modify: `src/api/schemas.test.ts`

- [ ] **Step 1: Write failing tests**

Add to the bottom of `src/api/schemas.test.ts`:

```ts
import { PlantDetailResponseSchema } from './schemas'

// Minimal raw detail response used across transform tests
const rawDetail = {
  plant: {
    id: 1,
    nickname: 'Monstera',
    scientific_name: 'Monstera deliciosa',
    genus: null,
    status: 2,
    plant_id: 201,
    family_id: null,
    thumb_path: null,
    origin_path: null,
    plant_thumb_path: null,
    plant_origin_path: null,
    received_data_at: null,
    gathering_data: false,
    is_illegal: false,
    not_supported: false,
    sensor_update_available: false,
    garden: { id: 1, name: 'Home' },
    sensor: {
      id: 'CB:2F:8B:D7:D2:B1',
      has_sensor: true,
      status: 1,
      version: '0.30.0',
      is_battery_low: false,
      received_data_at: '2024-01-01 10:00:00',
      created_at: '2023-01-01 00:00:00',
    },
    hub: {
      id: 1,
      hub_id: 'AA:AA:AA:27:7D:6A',
      hub_name: 'Hub',
      status: 1,
      received_data_at: '2024-01-01 10:00:00',
      reached_hub_at: '2024-01-01 10:00:00',
    },
    measurements: {
      ph: { status: null, values: { min: '4', max: '7', current: null }, unit: 'pH', absolute_values: { min: '0', max: '7.5', minText: '0', maxText: '7.5' } },
      temperature: { status: 2, values: { min_good: '17', max_good: '36', min_acceptable: '10', max_acceptable: '42', current: '18', currentFormatted: '18', optimal_hours: 22 }, unit: '°C/h', absolute_values: { min: '0', max: '50', minText: '0', maxText: '50' } },
      light: { status: 1, values: { min_good: '20', max_good: '450', min_acceptable: '18', max_acceptable: '675', current: '2', currentFormatted: '2', optimal_hours: 0 }, dli_values: { min_good: '0.25', max_good: '9', min_acceptable: '0.06', max_acceptable: '9' }, unit: 'μmol/h', dli_unit: 'mol/day', absolute_values: { min: '0', max: '700', minText: '0', maxText: '700' } },
      moisture: { status: 3, values: { min_good: '35', max_good: '70', min_acceptable: '25', max_acceptable: '80', current: '61', currentFormatted: '61' }, unit: '%/h', absolute_values: { min: '0', max: '85', minText: '0', maxText: '85' } },
      salinity: { status: 2, values: { min_good: '0.6', max_good: '1', min_acceptable: '0.4', max_acceptable: '1.2', current: '1', currentFormatted: '0.50' }, unit: 'mS/h', absolute_values: { min: '0', max: '1.4', minText: '0', maxText: '1.4' } },
      battery: '15',
    },
    temperature_unit: 1,
    know_hows: [],
  },
}

describe('PlantDetailResponseSchema transform', () => {
  it('attentionLevel is ok when moisture is perfect', () => {
    const { plant } = PlantDetailResponseSchema.parse(rawDetail)
    expect(plant.attentionLevel).toBe('ok')
  })

  it('attentionLevel is now when moisture is too_low', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, moisture: { ...rawDetail.plant.measurements.moisture, status: 1 } } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.attentionLevel).toBe('now')
  })

  it('battery_status is low for 15%', () => {
    const { plant } = PlantDetailResponseSchema.parse(rawDetail)
    expect(plant.battery_status).toBe('low')
  })

  it('battery_status is too_low for 0%', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, battery: '0' } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.battery_status).toBe('too_low')
  })

  it('battery_status is perfect for 20%', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, battery: '20' } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.battery_status).toBe('perfect')
  })

  it('battery_status is null when battery is null', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, battery: null } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.battery_status).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- schemas.test.ts
```

Expected: several `TypeError` or schema parse failures — `attentionLevel` and `battery_status` don't exist yet.

- [ ] **Step 3: Add `AttentionLevel`, `deriveStatus`, and `.transform()` to `src/api/schemas.ts`**

Add after the existing status enum blocks (before the `MeasurementsTimelineSchema` line):

```ts
export type AttentionLevel = 'now' | 'ok' | 'soon'

const ATTENTION_FROM_MOISTURE: Record<MeasurementStatusValue, AttentionLevel> = {
  no_data: 'ok',
  too_low: 'now',
  low: 'soon',
  perfect: 'ok',
  high: 'soon',
  too_high: 'now',
}

const ATTENTION_RANK: Record<AttentionLevel, number> = { now: 0, soon: 1, ok: 2 }

function deriveStatus(
  value: number,
  t: { min_acceptable?: number; min_good?: number; max_good?: number; max_acceptable?: number },
): MeasurementStatusValue {
  if (t.min_acceptable != null && value < t.min_acceptable) return 'too_low'
  if (t.min_good != null && value < t.min_good) return 'low'
  if (t.max_acceptable != null && value > t.max_acceptable) return 'too_high'
  if (t.max_good != null && value > t.max_good) return 'high'
  return 'perfect'
}
```

Replace the existing `PlantDetailSchema` definition with:

```ts
export const PlantDetailSchema = z.object({
  id: z.number(),
  nickname: z.string().nullable(),
  scientific_name: z.string().nullable(),
  genus: z.string().nullable(),
  status: UserPlantStatus,
  plant_id: z.number().nullable(),
  family_id: z.number().nullable(),
  thumb_path: z.string().nullable(),
  origin_path: z.string().nullable(),
  plant_thumb_path: z.string().nullable(),
  plant_origin_path: z.string().nullable(),
  received_data_at: z.string().nullable(),
  gathering_data: z.boolean(),
  is_illegal: z.boolean(),
  not_supported: z.boolean(),
  sensor_update_available: z.boolean(),
  garden: z.object({ id: z.number(), name: z.string() }).nullish(),
  sensor: SensorSchema.extend({ created_at: z.string().nullable() }).nullish(),
  hub: HubSchema.nullish(),
  measurements: z.object({
    ph: PhMeasurementSchema,
    temperature: TemperatureMeasurementSchema,
    light: LightMeasurementSchema,
    moisture: MoistureMeasurementSchema,
    salinity: SalinityMeasurementSchema,
    battery: z.string().nullable(),
  }).nullish(),
  temperature_unit: TemperatureUnit,
  know_hows: z.array(z.unknown()),
}).transform((data) => {
  const moistureStatus = data.measurements?.moisture?.status ?? 'no_data'
  const attentionLevel = ATTENTION_FROM_MOISTURE[moistureStatus]
  const rawBattery = data.measurements?.battery
  const battery_status: MeasurementStatusValue | null =
    rawBattery != null ? deriveStatus(Number(rawBattery), { min_acceptable: 1, min_good: 20 }) : null
  return {
    ...data,
    attentionLevel,
    attentionRank: ATTENTION_RANK[attentionLevel],
    battery_status,
  }
})
```

Add at the bottom of the inferred types block:

```ts
export type Plant = z.infer<typeof PlantDetailSchema>
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- schemas.test.ts
```

Expected: all tests in `PlantDetailResponseSchema transform` pass. Existing `UserPlantsResponseSchema` tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/api/schemas.ts src/api/schemas.test.ts
git commit -m "feat(schemas): add PlantDetailSchema transform with attentionLevel and battery_status"
```

---

## Task 2: Schema — nullish fields + ApiTimestamp date transforms

**Files:**
- Modify: `src/api/schemas.ts`
- Modify: `src/api/schemas.test.ts`

- [ ] **Step 1: Write failing test for null sensor/hub/measurements**

Add inside the `PlantDetailResponseSchema transform` describe block in `schemas.test.ts`:

```ts
it('parses when sensor, hub, garden, and measurements are null', () => {
  const input = {
    plant: {
      ...rawDetail.plant,
      garden: null,
      sensor: null,
      hub: null,
      measurements: null,
    },
  }
  const result = PlantDetailResponseSchema.safeParse(input)
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.plant.sensor).toBeNull()
  expect(result.data.plant.hub).toBeNull()
  expect(result.data.plant.battery_status).toBeNull()
  expect(result.data.plant.attentionLevel).toBe('ok')
})

it('parses sensor.received_data_at as a Date', () => {
  const { plant } = PlantDetailResponseSchema.parse(rawDetail)
  expect(plant.sensor?.received_data_at).toBeInstanceOf(Date)
})

it('parses hub.reached_hub_at as a Date', () => {
  const { plant } = PlantDetailResponseSchema.parse(rawDetail)
  expect(plant.hub?.reached_hub_at).toBeInstanceOf(Date)
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test -- schemas.test.ts
```

Expected: the null-fields test fails (sensor/hub currently non-nullable in detail schema); date tests fail (currently strings).

- [ ] **Step 3: Add `ApiTimestamp` and apply it to timestamp fields**

In `src/api/schemas.ts`, add after the status enum blocks:

```ts
const ApiTimestamp = z
  .string()
  .nullable()
  .transform((s): Date | null => {
    if (!s) return null
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
    return Number.isNaN(d.getTime()) ? null : d
  })
```

Update `SensorSchema` to use `ApiTimestamp`:

```ts
const SensorSchema = z.object({
  id: z.string(),
  has_sensor: z.boolean(),
  status: SensorStatus,
  uuid_android: z.string().nullable().optional(),
  uuid_ios: z.string().nullable().optional(),
  version: z.string(),
  is_battery_low: z.boolean(),
  received_data_at: ApiTimestamp,
})
```

Update `HubSchema` to use `ApiTimestamp`:

```ts
export const HubSchema = z.object({
  id: z.number(),
  hub_id: z.string(),
  hub_name: z.string().optional(),
  status: HubStatus,
  received_data_at: ApiTimestamp,
  reached_hub_at: ApiTimestamp,
})
```

In `PlantDetailSchema`, update the sensor extension and top-level `received_data_at`:

```ts
received_data_at: ApiTimestamp,
// ...
sensor: SensorSchema.extend({ created_at: ApiTimestamp }).nullish(),
hub: HubSchema.nullish(),
garden: z.object({ id: z.number(), name: z.string() }).nullish(),
measurements: z.object({ ... }).nullish(),   // already done in Task 1
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test -- schemas.test.ts
```

Expected: all tests pass, including new null-field and Date tests.

- [ ] **Step 5: Commit**

```bash
git add src/api/schemas.ts src/api/schemas.test.ts
git commit -m "feat(schemas): make sensor/hub/garden/measurements nullish; parse timestamps as Date"
```

---

## Task 3: Rewrite `usePlants` to fetch list + parallel details

**Files:**
- Modify: `src/composables/usePlants.ts`

- [ ] **Step 1: Rewrite `src/composables/usePlants.ts`**

Replace the entire file:

```ts
import { useIntervalFn } from '@vueuse/core'
import { ref } from 'vue'
import { z } from 'zod'

import { type Plant, PlantDetailResponseSchema, UserPlantsResponseSchema } from '../api/schemas'

export function usePlants() {
  const lastUpdated = ref<Date | null>(null)
  const isFetching = ref(false)
  const error = ref<unknown>(null)
  const plants = ref<Plant[]>([])
  const lostHubs = ref<Array<{ hub_id: string; hub_name?: string }>>([])

  async function execute() {
    isFetching.value = true
    error.value = null
    try {
      const listRes = await fetch('/api/user-plant', { headers: { Accept: 'application/json' } })
      const listRaw = (await listRes.json()) as unknown
      const listResult = UserPlantsResponseSchema.safeParse(listRaw)
      if (!listResult.success) {
        console.error('[usePlants] list parse failed:', z.treeifyError(listResult.error))
        return
      }
      lostHubs.value = listResult.data.hubs_with_lost_connection
      const ids = listResult.data.plants.map((p) => p.id)

      const settled = await Promise.allSettled(
        ids.map(async (id): Promise<Plant | null> => {
          const res = await fetch(`/api/user-plant/${id}`, { headers: { Accept: 'application/json' } })
          const raw = (await res.json()) as unknown
          const result = PlantDetailResponseSchema.safeParse(raw)
          if (!result.success) {
            console.error(`[usePlants] detail parse failed for plant ${id}:`, z.treeifyError(result.error))
            return null
          }
          return result.data.plant
        }),
      )
      plants.value = settled
        .filter((r): r is PromiseFulfilledResult<Plant | null> => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((p): p is Plant => p !== null)
      lastUpdated.value = new Date()
    } catch (e) {
      error.value = e
    } finally {
      isFetching.value = false
    }
  }

  void execute()
  useIntervalFn(() => void execute(), 5 * 60 * 1000)

  return { error, execute, isFetching, lastUpdated, lostHubs, plants }
}
```

- [ ] **Step 2: Verify the dev server loads plants**

```bash
npm run dev
```

Open the dashboard in a browser. Plants should load within a few seconds (N+1 requests instead of 1 — expect a noticeable but acceptable delay). Check the browser network tab for parallel `/api/user-plant/:id` requests. Check the browser console for any parse errors.

- [ ] **Step 3: Commit**

```bash
git add src/composables/usePlants.ts
git commit -m "feat(usePlants): fetch detail for all plants in parallel"
```

---

## Task 4: Delete obsolete files and update `App.vue`

**Files:**
- Delete: `src/types/plant.ts`
- Delete: `src/types/plant.test.ts` (if it exists)
- Delete: `src/composables/useBatteryLevels.ts`
- Modify: `src/App.vue`

- [ ] **Step 1: Rewrite `src/App.vue`**

Replace the entire file:

```vue
<script setup lang="ts">
import { computed } from 'vue'

import AppHeader from './components/AppHeader.vue'
import PlantGrid from './components/PlantGrid.vue'
import { usePlants } from './composables/usePlants'

const { error, execute, isFetching, lastUpdated, lostHubs, plants } = usePlants()

const errorHubs = computed(() =>
  lostHubs.value.map((h) => ({
    id: h.hub_id,
    name: h.hub_name ?? h.hub_id,
  })),
)

const goodHubs = computed(() => {
  const lostIds = new Set(lostHubs.value.map((h) => h.hub_id))
  const byHub = new Map<string, { id: string; maxReached: Date | null; name: string }>()
  for (const p of plants.value) {
    if (!p.hub?.hub_id || lostIds.has(p.hub.hub_id)) continue
    const reached = p.hub.reached_hub_at ?? null
    const existing = byHub.get(p.hub.hub_id)
    if (!existing || (reached != null && (existing.maxReached == null || reached > existing.maxReached))) {
      byHub.set(p.hub.hub_id, { id: p.hub.hub_id, maxReached: reached, name: p.hub.hub_name ?? p.hub.hub_id })
    }
  }
  return [...byHub.values()].map((h) => ({ id: h.id, lastSync: h.maxReached, name: h.name }))
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-base-100">
    <AppHeader :good-hubs="goodHubs" :is-loading="isFetching" :last-updated="lastUpdated" :plants="plants" @refresh="execute" />

    <div v-if="errorHubs.length > 0" class="bg-warning/10 border-b border-warning/30 px-4 py-1 shrink-0">
      <p v-for="h in errorHubs" :key="h.id" class="text-xs text-warning flex items-center gap-1.5">
        <span>⚠️</span>
        <span>Hub-Verbindung verloren: {{ h.name }}</span>
      </p>
    </div>

    <div v-if="isFetching && plants.length === 0" class="flex-1 flex items-center justify-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="error && plants.length === 0" class="p-4">
      <div role="alert" class="alert alert-error text-sm">
        <span>Pflanzen konnten nicht geladen werden: {{ error }}</span>
      </div>
    </div>

    <PlantGrid v-else :plants="plants" />
  </div>
</template>
```

- [ ] **Step 2: Delete obsolete files**

```bash
rm src/types/plant.ts src/composables/useBatteryLevels.ts
# plant.test.ts only if it exists:
rm -f src/types/plant.test.ts
```

- [ ] **Step 3: Check TypeScript for remaining import errors**

```bash
npm run build 2>&1 | head -60
```

Expected errors at this point: `SensorStatus.vue` imports `MeasurementStatus` from `'../types/plant'` — fix that import in Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git rm src/types/plant.ts src/composables/useBatteryLevels.ts
git rm -f src/types/plant.test.ts 2>/dev/null || true
git commit -m "feat: remove plant abstraction layer and battery levels composable"
```

---

## Task 5: Update `SensorStatus.vue` — battery type + value/unit title

**Files:**
- Modify: `src/components/SensorStatus.vue`

- [ ] **Step 1: Rewrite `src/components/SensorStatus.vue`**

Replace the entire file:

```vue
<script lang="ts">
export { MEASUREMENT_STATUSES } from '../api/schemas'
export const SENSOR_TYPES = ['battery', 'light', 'moisture', 'salinity', 'temp'] as const
export type SensorType = (typeof SENSOR_TYPES)[number]
</script>

<script setup lang="ts">
import type { Component } from 'vue'

import {
  Battery,
  BatteryFull,
  BatteryLow,
  Check,
  Cloudy,
  Droplet,
  DropletOff,
  Droplets,
  Flame,
  Leaf,
  Rose,
  Snowflake,
  Sprout,
  Sun,
  SunDim,
  Thermometer,
  ThermometerSnowflake,
  ThermometerSun,
  Waves,
} from 'lucide-vue-next'
import { computed } from 'vue'

import type { MeasurementStatusValue } from '../api/schemas'

const props = defineProps<{
  status: MeasurementStatusValue
  type: SensorType
  unit?: string
  value?: null | string
}>()

interface SensorEntry {
  cls: string
  icon: Component
  strokeWidth?: number
}

const sensorConfig: Record<SensorType, Record<MeasurementStatusValue, SensorEntry>> = {
  battery: {
    no_data:  { icon: Battery,     cls: 'text-base-content/50' },
    too_low:  { icon: Battery,     cls: 'text-error' },
    low:      { icon: BatteryLow,  cls: 'text-warning' },
    perfect:  { icon: BatteryFull, cls: 'text-success' },
    high:     { icon: BatteryFull, cls: 'text-success' },
    too_high: { icon: BatteryFull, cls: 'text-success' },
  },
  light: {
    no_data:  { icon: Sun,     cls: 'text-base-content/50' },
    too_low:  { icon: Cloudy,  cls: 'text-zinc-400' },
    low:      { icon: SunDim,  cls: 'text-amber-400/80' },
    perfect:  { icon: Sun,     cls: 'text-amber-400' },
    high:     { icon: Sun,     cls: 'text-amber-300', strokeWidth: 2.5 },
    too_high: { icon: Sun,     cls: 'text-amber-200', strokeWidth: 3.5 },
  },
  moisture: {
    no_data:  { icon: Droplets,   cls: 'text-base-content/50' },
    too_low:  { icon: DropletOff, cls: 'text-sky-200', strokeWidth: 3 },
    low:      { icon: Droplet,    cls: 'text-sky-400' },
    perfect:  { icon: Droplets,   cls: 'text-sky-400' },
    high:     { icon: Droplets,   cls: 'text-sky-400', strokeWidth: 3.5 },
    too_high: { icon: Waves,      cls: 'text-sky-400', strokeWidth: 3.5 },
  },
  salinity: {
    no_data:  { icon: Rose,   cls: 'text-base-content/50' },
    too_low:  { icon: Sprout, cls: 'text-emerald-700/80' },
    low:      { icon: Leaf,   cls: 'text-emerald-500/75' },
    perfect:  { icon: Rose,   cls: 'text-red-500/70' },
    high:     { icon: Rose,   cls: 'text-orange-700', strokeWidth: 1.5 },
    too_high: { icon: Rose,   cls: 'text-amber-900' },
  },
  temp: {
    no_data:  { icon: Thermometer,        cls: 'text-base-content/50' },
    too_low:  { icon: Snowflake,          cls: 'text-sky-200' },
    low:      { icon: ThermometerSnowflake, cls: 'text-sky-400' },
    perfect:  { icon: Thermometer,        cls: 'text-yellow-400' },
    high:     { icon: ThermometerSun,     cls: 'text-amber-400' },
    too_high: { icon: Flame,              cls: 'text-orange-500' },
  },
}

const sensorLabels: Record<SensorType, Record<MeasurementStatusValue, string>> = {
  battery: {
    no_data:  '',
    too_low:  'Leer',
    low:      'Schwach',
    perfect:  'OK',
    high:     'OK',
    too_high: 'OK',
  },
  light: {
    no_data:  '',
    too_low:  'Dunkel',
    low:      'Wenig',
    perfect:  'OK',
    high:     'Hell',
    too_high: 'Grell',
  },
  moisture: {
    no_data:  '',
    too_low:  'Trocken',
    low:      'Wenig',
    perfect:  'OK',
    high:     'Feucht',
    too_high: 'Nass',
  },
  salinity: {
    no_data:  '',
    too_low:  'Mangel',
    low:      'Wenig',
    perfect:  'OK',
    high:     'Hoch',
    too_high: 'Zuviel',
  },
  temp: {
    no_data:  '',
    too_low:  'Kalt',
    low:      'Kühl',
    perfect:  'OK',
    high:     'Warm',
    too_high: 'Heiß',
  },
}

const entry  = computed(() => sensorConfig[props.type][props.status])
const icon   = computed(() => entry.value.icon)
const cls    = computed(() => entry.value.cls)
const isOk   = computed(() => props.status === 'perfect')
const label  = computed(() => sensorLabels[props.type][props.status])
const title  = computed(() =>
  props.value != null && props.unit ? `${props.value} ${props.unit}` : undefined,
)
</script>

<template>
  <span class="inline-flex items-center gap-1" :class="cls" :title="title">
    <span class="indicator">
      <Check v-if="isOk" class="indicator-item size-2 text-success" />
      <component :is="icon" class="size-3 shrink-0" :stroke-width="entry.strokeWidth ?? 2" />
    </span>
    <span v-if="!isOk && label" class="text-xs leading-tight truncate">{{ label }}</span>
  </span>
</template>
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run build 2>&1 | grep -E 'error|warning' | head -20
```

Expected: no errors from `SensorStatus.vue`. May still see errors from `PlantCard.vue` (fixed in Task 6).

- [ ] **Step 3: Commit**

```bash
git add src/components/SensorStatus.vue
git commit -m "feat(SensorStatus): add battery type and value/unit title prop"
```

---

## Task 6: Update `PlantCard.vue` — FYTA-native fields + battery row

**Files:**
- Modify: `src/components/PlantCard.vue`

- [ ] **Step 1: Rewrite `src/components/PlantCard.vue`**

Replace the entire file:

```vue
<script setup lang="ts">
import { computed } from 'vue'

import type { Plant } from '../api/schemas'
import { useRelativeTime } from '../composables/useRelativeTime'

import AttentionBadge from './AttentionBadge.vue'
import PlantPhoto from './PlantPhoto.vue'
import SensorStatus from './SensorStatus.vue'

const props = defineProps<{
  plant: Plant
}>()

const cardBorderClass = computed(() => {
  if (props.plant.attentionLevel === 'now') return 'border-2 border-error bg-base-200'
  if (props.plant.attentionLevel === 'soon') return 'border-2 border-warning bg-base-200'
  return 'border-2 border-base-300 bg-base-200'
})

const lastSeenDate = computed(() => props.plant.sensor?.received_data_at ?? null)
const lastSeen = useRelativeTime(lastSeenDate)
const lastSeenClass = computed(() =>
  props.plant.sensor?.status === 'error' ? 'text-error' : 'text-base-content/40',
)
</script>

<template>
  <div class="card overflow-hidden h-full" :class="cardBorderClass">
    <PlantPhoto
      :thumb-path="plant.thumb_path"
      :plant-thumb-path="plant.plant_thumb_path"
      :origin-path="plant.origin_path"
      :alt="plant.nickname ?? undefined"
    >
      <AttentionBadge :level="plant.attentionLevel" class="absolute top-1 right-1" />
      <div
        class="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-base-200 via-base-200 to-transparent flex flex-col justify-end px-2 pb-1.5"
      >
        <h2 class="font-bold truncate leading-tight text-sm text-white">
          {{ plant.nickname ?? plant.scientific_name ?? 'Unbekannt' }}
        </h2>
        <p class="text-xs italic truncate leading-tight text-white/60">
          {{ plant.scientific_name ?? plant.common_name ?? '' }}
        </p>
      </div>
    </PlantPhoto>

    <div class="card-body min-h-0 overflow-hidden p-2">
      <div class="flex flex-wrap items-center gap-2 min-w-0">
        <SensorStatus
          type="moisture"
          :status="plant.measurements?.moisture?.status ?? 'no_data'"
          :value="plant.measurements?.moisture?.values?.currentFormatted"
          :unit="plant.measurements?.moisture?.unit"
          class="min-w-0"
        />
        <SensorStatus
          type="light"
          :status="plant.measurements?.light?.status ?? 'no_data'"
          :value="plant.measurements?.light?.values?.currentFormatted"
          :unit="plant.measurements?.light?.unit"
          class="min-w-0"
        />
        <SensorStatus
          type="temp"
          :status="plant.measurements?.temperature?.status ?? 'no_data'"
          :value="plant.measurements?.temperature?.values?.currentFormatted"
          :unit="plant.measurements?.temperature?.unit"
          class="min-w-0"
        />
        <SensorStatus
          type="salinity"
          :status="plant.measurements?.salinity?.status ?? 'no_data'"
          :value="plant.measurements?.salinity?.values?.currentFormatted"
          :unit="plant.measurements?.salinity?.unit"
          class="min-w-0"
        />
        <SensorStatus
          type="battery"
          :status="plant.battery_status ?? 'no_data'"
          :value="plant.measurements?.battery"
          unit="%"
          class="min-w-0"
        />
        <span class="basis-full text-right text-[10px]" :class="lastSeenClass">{{
          lastSeenDate !== null ? lastSeen : ''
        }}</span>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run build 2>&1 | grep -E 'error' | head -20
```

Expected: no TypeScript errors. The `plant.common_name` field may not exist in `PlantDetailSchema` — if so, remove that line from the template.

- [ ] **Step 3: Check the dashboard in the browser**

```bash
npm run dev
```

Verify:
- All five sensor rows render (moisture, light, temp, salinity, battery)
- Battery row shows `Leer` / `Schwach` / nothing (OK) based on percentage
- Hovering a sensor row shows the value + unit as tooltip
- Red border still appears for attention plants
- Timestamp still shows and turns red for `sensor.status === 'error'`

- [ ] **Step 4: Commit**

```bash
git add src/components/PlantCard.vue
git commit -m "feat(PlantCard): use FYTA-native field paths, battery as SensorStatus row"
```

---

## Task 7: Update `PlantCard.stories.ts` — FYTA-native Plant shape

**Files:**
- Modify: `src/components/PlantCard.stories.ts`

- [ ] **Step 1: Rewrite `src/components/PlantCard.stories.ts`**

Replace the entire file:

```ts
import type { Meta, StoryObj } from '@storybook/vue3-vite'

import type { Plant } from '../api/schemas'
import { MEASUREMENT_STATUSES } from '../api/schemas'
import PlantCard from './PlantCard.vue'

const meta: Meta<typeof PlantCard> = { component: PlantCard }
export default meta
type Story = StoryObj<typeof PlantCard>

const card = () => ({ template: '<div style="width:200px"><story /></div>' })

// ── Factory ────────────────────────────────────────────────────

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

const THUMB = 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Filodendron.jpg'

const baseMeasurements: NonNullable<Plant['measurements']> = {
  ph: { status: null, values: { min: '4', max: '7', current: null }, unit: 'pH', absolute_values: { min: '0', max: '7.5', minText: '0', maxText: '7.5' } },
  temperature: { status: 'perfect', values: { min_good: '17', max_good: '36', min_acceptable: '10', max_acceptable: '42', current: '22', currentFormatted: '22', optimal_hours: 20 }, unit: '°C/h', absolute_values: { min: '0', max: '50', minText: '0', maxText: '50' } },
  light: { status: 'perfect', values: { min_good: '20', max_good: '450', min_acceptable: '18', max_acceptable: '675', current: '120', currentFormatted: '120', optimal_hours: 8 }, dli_values: { min_good: '0.25', max_good: '9', min_acceptable: '0.06', max_acceptable: '9' }, unit: 'μmol/h', dli_unit: 'mol/day', absolute_values: { min: '0', max: '700', minText: '0', maxText: '700' } },
  moisture: { status: 'perfect', values: { min_good: '35', max_good: '70', min_acceptable: '25', max_acceptable: '80', current: '55', currentFormatted: '55' }, unit: '%/h', absolute_values: { min: '0', max: '85', minText: '0', maxText: '85' } },
  salinity: { status: 'perfect', values: { min_good: '0.6', max_good: '1', min_acceptable: '0.4', max_acceptable: '1.2', current: '0.8', currentFormatted: '0.80' }, unit: 'mS/h', absolute_values: { min: '0', max: '1.4', minText: '0', maxText: '1.4' } },
  battery: '75',
}

const baseSensor: NonNullable<Plant['sensor']> = {
  id: 'CB:2F:8B:D7:D2:B1',
  has_sensor: true,
  status: 'correct',
  version: '0.30.0',
  is_battery_low: false,
  received_data_at: new Date(Date.now() - 45 * 60 * 1000),
  created_at: new Date('2023-01-01'),
}

function makePlant(overrides: DeepPartial<Plant> = {}): Plant {
  const base: Plant = {
    id: 1,
    nickname: 'Monstera',
    scientific_name: 'Monstera deliciosa',
    genus: null,
    status: 'good',
    plant_id: 201,
    family_id: null,
    thumb_path: THUMB,
    origin_path: null,
    plant_thumb_path: null,
    plant_origin_path: null,
    received_data_at: null,
    gathering_data: false,
    is_illegal: false,
    not_supported: false,
    sensor_update_available: false,
    garden: null,
    sensor: baseSensor,
    hub: null,
    measurements: baseMeasurements,
    temperature_unit: 'celsius',
    know_hows: [],
    attentionLevel: 'ok',
    attentionRank: 2,
    battery_status: 'perfect',
  }
  return { ...base, ...overrides } as Plant
}

// ── Stories ────────────────────────────────────────────────────

export const Default: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 1,
      nickname: 'Monstera',
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'perfect' }, light: { ...baseMeasurements.light, status: 'low' }, temperature: { ...baseMeasurements.temperature, status: 'too_high' }, salinity: { ...baseMeasurements.salinity, status: 'high' } },
      attentionLevel: 'ok',
      battery_status: 'perfect',
    }),
  },
}

export const NeedsWater: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 2,
      nickname: 'Fikus',
      scientific_name: 'Ficus lyrata',
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'too_low' } },
      attentionLevel: 'now',
      attentionRank: 0,
      battery_status: 'perfect',
    }),
  },
}

export const WaterSoon: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 3,
      nickname: 'Efeutute',
      scientific_name: 'Epipremnum aureum',
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'low' } },
      attentionLevel: 'soon',
      attentionRank: 1,
      battery_status: 'perfect',
    }),
  },
}

export const Overwatered: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 4,
      nickname: 'Basilikum',
      scientific_name: 'Ocimum basilicum',
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'too_high' }, salinity: { ...baseMeasurements.salinity, status: 'too_high' } },
      attentionLevel: 'now',
      attentionRank: 0,
      battery_status: 'perfect',
    }),
  },
}

export const NoSensor: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 5,
      nickname: 'Kaktus',
      scientific_name: 'Echinopsis pachanoi',
      sensor: null,
      measurements: null,
      attentionLevel: 'ok',
      battery_status: null,
    }),
  },
}

export const SensorError: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 6,
      nickname: 'Aloe Vera',
      scientific_name: 'Aloe barbadensis',
      sensor: { ...baseSensor, status: 'error', received_data_at: new Date(Date.now() - 3 * 60 * 60 * 1000) },
      battery_status: 'perfect',
    }),
  },
}

export const BatteryLow: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 7,
      nickname: 'Orchidee',
      scientific_name: 'Phalaenopsis amabilis',
      sensor: { ...baseSensor, is_battery_low: true },
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'low' }, battery: '5' },
      attentionLevel: 'soon',
      battery_status: 'low',
    }),
  },
}

export const BatteryEmpty: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 12,
      nickname: 'Eingang Ficus',
      scientific_name: 'Ficus retusa',
      sensor: { ...baseSensor, status: 'error', is_battery_low: true, received_data_at: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000) },
      measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: 'no_data' }, light: { ...baseMeasurements.light, status: 'no_data' }, temperature: { ...baseMeasurements.temperature, status: 'no_data' }, salinity: { ...baseMeasurements.salinity, status: 'no_data' }, battery: '0' },
      attentionLevel: 'ok',
      battery_status: 'too_low',
    }),
  },
}

export const NoPhoto: Story = {
  decorators: [card],
  args: {
    plant: makePlant({
      id: 9,
      nickname: 'Monstera',
      thumb_path: null,
      plant_thumb_path: null,
      battery_status: 'perfect',
    }),
  },
}

export const AllMoistureStates: Story = {
  render: () => ({
    components: { PlantCard },
    setup: () => ({
      plants: MEASUREMENT_STATUSES.map((ms, i) =>
        makePlant({
          id: i,
          nickname: ms.replace('_', ' '),
          sensor: ms === 'no_data' ? null : baseSensor,
          measurements: ms === 'no_data' ? null : {
            ...baseMeasurements,
            moisture: { ...baseMeasurements.moisture, status: ms },
            light: { ...baseMeasurements.light, status: ms },
            temperature: { ...baseMeasurements.temperature, status: ms },
            salinity: { ...baseMeasurements.salinity, status: ms },
          },
          attentionLevel: ms === 'too_low' || ms === 'too_high' ? 'now' : ms === 'low' || ms === 'high' ? 'soon' : 'ok',
          battery_status: ms === 'no_data' ? null : 'perfect',
        }),
      ),
    }),
    template: `
      <div style="display:flex;flex-wrap:wrap;gap:16px;padding:16px">
        <div v-for="plant in plants" :key="plant.id" style="width:200px">
          <PlantCard :plant="plant"/>
        </div>
      </div>
    `,
  }),
}
```

- [ ] **Step 2: Start Storybook and verify all stories render**

```bash
npm run storybook
```

Open Storybook in a browser. Check each story renders without errors. Pay attention to:
- `NoSensor` — all sensor statuses show `no_data` icons, no battery row label
- `BatteryEmpty` — battery row shows `BatteryWarning` icon in red with label "Leer"
- `BatteryLow` — battery row shows `BatteryLow` icon in amber with label "Schwach"
- `AllMoistureStates` — grid of all status variants renders correctly

- [ ] **Step 3: Commit**

```bash
git add src/components/PlantCard.stories.ts
git commit -m "feat(stories): update PlantCard stories to FYTA-native Plant shape"
```

---

## Self-review notes

- **`plant.common_name`**: `PlantDetailSchema` does not include `common_name`. If present in PlantCard template it will cause a TS error — remove that line from the template in Task 6.
- **`plant.nutrients_status`**: The list schema had this field; the detail schema does not. `PlantCard.vue` previously used it as a fallback for salinity. Remove the fallback — `measurements.salinity.status` is authoritative in the detail.
- **`SensorStatus` stories** (`SensorStatus.stories.ts`): still reference the old `SensorType` which now includes `'battery'`. No change needed — adding a type to the union is backwards-compatible.
- **`AppHeader` props**: `AppHeader` receives `:plants="plants"`. If `AppHeader` typed its `plants` prop against the old `Plant` interface, update that import to `Plant` from `'../api/schemas'`.
- **`PlantGrid` props**: Same concern — update its `plants` prop type import if needed.
