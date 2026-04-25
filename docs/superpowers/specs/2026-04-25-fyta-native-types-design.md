# Design: FYTA-native types + synthetic battery_status

Date: 2026-04-25

## Problem

The current data layer has two issues:

1. **Premature domain model.** `Plant` interface + `createPlant()` rename and flatten FYTA's API structure into our own shape. This drops the domain knowledge encoded in FYTA's nesting (e.g. `sensor.received_data_at` → `sensorLastSeen`) and will break if FYTA's structure reflects real constraints we haven't hit yet (e.g. multiple sensors per plant).

2. **Battery has no status tiers.** `measurements.battery` is a raw percentage string. Unlike moisture, light, temperature, and salinity — which all have server-computed `status` fields — battery has no `too_low / low / perfect` equivalent. We need to derive it ourselves.

## Decision

Keep FYTA's API structure as-is. Only add fields that are genuinely not in the API:
- `attentionLevel` / `attentionRank` — UI concept
- `battery_status` — derived from battery percentage using locally-defined thresholds
- Date objects — field-level coercion of FYTA timestamp strings

Everything else: FYTA's names, FYTA's nesting, FYTA's types.

## Data flow

```
GET /api/user-plant
  → extract: plant IDs, hubs_with_lost_connection
  → discard: all plant fields (fetched from detail instead)

GET /api/user-plant/:id  (parallel, one per plant)
  → parse with PlantDetailSchema (Zod, with transform)
  → produces: Plant[]
```

Poll interval: every 5 minutes (unchanged). Both fetches happen together on each poll.

## Schema changes

### PlantDetailSchema transform (additions only)

```ts
PlantDetailSchema = z.object({ /* FYTA fields verbatim */ })
  .transform((data) => ({
    ...data,
    attentionLevel: deriveAttentionLevel(data.measurements?.moisture?.status),
    attentionRank: ATTENTION_RANK[attentionLevel],
    battery_status: data.measurements?.battery != null
      ? deriveStatus(Number(data.measurements.battery), { min_acceptable: 1, min_good: 20 })
      : null,
  }))
```

`deriveStatus` is a local inline function within the transform:

```ts
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

Battery thresholds: `{ min_acceptable: 1, min_good: 20 }` → only `too_low / low / perfect` can fire.

### Date fields

Timestamp strings use a field-level transform:

```ts
z.string().nullable().transform(s => s ? new Date(s.replace(' ', 'T') + 'Z') : null)
```

Applied to: `sensor.received_data_at`, `hub.received_data_at`, `hub.reached_hub_at`, `sensor.created_at`.

### Plant type

```ts
export type Plant = z.infer<typeof PlantDetailSchema>
```

No separate interface. No `createPlant`. No `PlantInput`.

## Field access changes (template + component updates)

| Removed abstraction | FYTA-native replacement |
|---|---|
| `plant.sensorId` | `plant.sensor?.id` |
| `plant.sensorStatus` | `plant.sensor?.status` |
| `plant.sensorLastSeen` | `plant.sensor?.received_data_at` |
| `plant.sensorBatteryLow` | `plant.sensor?.is_battery_low` |
| `plant.sensorBatteryLevel` | `plant.measurements?.battery` |
| `plant.moisture_status` | `plant.measurements?.moisture?.status` |
| `plant.light_status` | `plant.measurements?.light?.status` |
| `plant.temperature_status` | `plant.measurements?.temperature?.status` |
| `plant.salinity_status` | `plant.measurements?.salinity?.status` |
| `plant.hubId` | `plant.hub?.hub_id` |
| `plant.hubStatus` | `plant.hub?.status` |
| `plant.hubLastSync` | `plant.hub?.received_data_at` |
| `plant.hubLastReached` | `plant.hub?.reached_hub_at` |

## SensorStatus component

Add two optional props: `value?: string | null`, `unit?: string`.  
Render `title="${value} ${unit}"` when both are present.

Callers pass `plant.measurements.moisture.values.currentFormatted` + `plant.measurements.moisture.unit`, and so on for each measurement type.

## Deletions

- `src/types/plant.ts` — entire file (Plant interface, PlantInput, createPlant, AttentionLevel)
- `src/composables/useBatteryLevels.ts` — entire file
- `App.vue` — `plantsWithBattery` computed, `useBatteryLevels` import/usage

## Schema robustness

Any deviation from the documented API observed in practice must be reflected in the schema. `.nullish()` handles null/absent values. `.catch(undefined)` is only added when a present-but-malformed value has actually been observed — not as a general defensive measure.

| Field | Observed deviation | Schema treatment |
|---|---|---|
| `sensor` | `null` for sensorless plants (seen in list endpoint) | `.nullish()` |
| `hub` | `null`/absent for sensorless plants (seen in list endpoint) | `.nullish()` |
| `garden` | `null`/absent in some responses (seen in list endpoint) | `.nullish()` |
| `measurements` | likely absent/null for sensorless plants | `.nullish()` on the whole object and all sub-fields |
| `wifi_status` | `null` for sensorless plants or plants without a hub | already handled via `WifiStatus` (maps null → `'none'`) |
| `sensor.received_data_at` | `null` observed | already `.nullable()` |

**Rule:** prefer `.nullish()` over hard-failing for observed null/absent deviations. Add `.catch(undefined)` only when a present-but-malformed value has actually caused a parse failure.

## What does NOT change

- `usePlants` composable surface (still exports `plants`, `lostHubs`, `error`, `isFetching`, `lastUpdated`, `execute`)
- `hubs_with_lost_connection` remains authoritative for hub connectivity (CLAUDE.md invariant)
- Poll interval, error handling, loading states
- All existing Zod enum schemas (`MeasurementStatus`, `SensorStatus`, `WifiStatus`, etc.)
- Storybook stories — updated to use FYTA-native field shapes

## Rationale for minimal abstraction

FYTA's API structure encodes real domain constraints. Renaming and flattening fields:
- Drops provenance (`sensor.received_data_at` tells you it's the sensor's timestamp)
- Breaks when constraints we haven't hit become visible (e.g. multiple sensors per plant)
- Creates a mapping layer that needs maintaining alongside the API

The only legitimate additions are values the API genuinely doesn't provide: attention level (UI concept), battery status (no server-computed equivalent), and typed dates (type safety, not renaming).
