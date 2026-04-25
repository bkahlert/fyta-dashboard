import { z } from 'zod'

// The API is documented at https://fyta-io.notion.site/FYTA-Public-API-d2f4c30306f74504924c9a40402a3afd
// which—due to the usage of JS—is no machine-readable.
// The is dump as Markdown in docs/fyta-api.md

// ── Status Enums ────────────────────────────────────────────────────────────
// Source: https://fyta-io.notion.site/FYTA-Public-API-d2f4c30306f74504924c9a40402a3afd

/** Overall status of a user-owned plant (`plant.status`). */
export const USER_PLANT_STATUSES = ['deleted', 'good', 'bad', 'no_sensor'] as const
export type UserPlantStatusValue = (typeof USER_PLANT_STATUSES)[number]

export const UserPlantStatus = z
  .union([
    z.literal(0), // deleted
    z.literal(1), // good
    z.literal(2), // bad
    z.literal(3), // no sensor
  ])
  .transform((n): UserPlantStatusValue => USER_PLANT_STATUSES[n])

/**
 * Measurement reading level for light, temperature, moisture, and salinity
 * (`light_status`, `temperature_status`, `moisture_status`, `salinity_status`).
 */
export const MEASUREMENT_STATUSES = [
  'no_data',
  'too_low',
  'low',
  'perfect',
  'high',
  'too_high',
] as const
export type MeasurementStatusValue = (typeof MEASUREMENT_STATUSES)[number]

export const MeasurementStatus = z
  .union([
    z.literal(0), // no data
    z.literal(1), // too low
    z.literal(2), // low
    z.literal(3), // perfect
    z.literal(4), // high
    z.literal(5), // too high
  ])
  .transform((n): MeasurementStatusValue => MEASUREMENT_STATUSES[n])

/**
 * Sensor connectivity status (`sensor.status`).
 * 0: plant has no sensor
 * 1: correct — last measurement ≤ 1.5 h ago, or sensor created ≤ 1.5 h ago
 * 2: error — measurement not sent, or last measurement > 1.5 h ago
 */
export const SENSOR_STATUSES = ['none', 'correct', 'error'] as const
export type SensorStatusValue = (typeof SENSOR_STATUSES)[number]

export const SensorStatus = z
  .union([
    z.literal(0), // none — no sensor attached
    z.literal(1), // correct — last reading ≤ 1.5 h ago
    z.literal(2), // error — no reading, or last reading > 1.5 h ago
  ])
  .transform((n): SensorStatusValue => SENSOR_STATUSES[n])

/**
 * Hub connectivity status (`hub.status`).
 * 1: correct — last measurement received ≤ 1.5 h ago
 * 2: error — last measurement received > 1.5 h ago
 */
export const HUB_STATUSES = ['correct', 'error'] as const
export type HubStatusValue = (typeof HUB_STATUSES)[number]

export const HubStatus = z
  .union([
    z.literal(1), // correct — last reading received ≤ 1.5 h ago
    z.literal(2), // error — last reading received > 1.5 h ago
  ])
  .transform((n): HubStatusValue => HUB_STATUSES[(n - 1) as 0 | 1])

/**
 * Wi-Fi connection status (`wifi_status`).
 * null: never connected, no hub, or plant has no sensor
 * 0: lost connection to all previously connected hubs
 * 1: connected to at least one hub
 * 2: error connecting hub, or connection lost within a specific time range
 */
export const WIFI_STATUSES = ['none', 'lost', 'connected', 'error'] as const
export type WifiStatusValue = (typeof WIFI_STATUSES)[number]

export const WifiStatus = z
  .union([
    z.null(), // never connected / no hub / no sensor → 'none'
    z.literal(0), // lost connection to all previously connected hubs → 'lost'
    z.literal(1), // connected to at least one hub → 'connected'
    z.literal(2), // error connecting hub OR connection lost within a specific time range → 'error'
  ])
  .transform(
    (n): WifiStatusValue => (n === null ? WIFI_STATUSES[0] : WIFI_STATUSES[(n + 1) as 1 | 2 | 3]),
  )

/** Temperature unit preference (`temperature_unit`). */
export const TEMPERATURE_UNITS = ['celsius', 'fahrenheit'] as const
export type TemperatureUnitValue = (typeof TEMPERATURE_UNITS)[number]

export const TemperatureUnit = z
  .union([
    z.literal(1), // Celsius
    z.literal(2), // Fahrenheit
  ])
  .transform((n): TemperatureUnitValue => TEMPERATURE_UNITS[(n - 1) as 0 | 1])

export const ATTENTION_LEVELS = ['now', 'soon', 'ok', 'skip'] as const
export type AttentionLevel = (typeof ATTENTION_LEVELS)[number]

const ATTENTION_RANK = Object.fromEntries(
  ATTENTION_LEVELS.map((level, i) => [level, i]),
) as Record<AttentionLevel, number>

function computeAttention(data: { measurements?: { moisture?: { status: MeasurementStatusValue } | null } | null }): AttentionLevel {
  const moisture = data.measurements?.moisture?.status ?? 'no_data'
  if (moisture === 'too_low') return 'now'
  if (moisture === 'low') return 'soon'
  if (moisture === 'too_high') return 'skip'
  return 'ok'
}

// The FYTA API returns salinity status inverted: high readings indicate low nutrients and vice versa.
const SALINITY_STATUS_INVERT: Record<MeasurementStatusValue, MeasurementStatusValue> = {
  no_data: 'no_data',
  too_low: 'too_high',
  low: 'high',
  perfect: 'perfect',
  high: 'low',
  too_high: 'too_low',
}

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

const ApiTimestamp = z
  .string()
  .nullable()
  .transform((s): Date | null => {
    if (!s) return null
    const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
    return Number.isNaN(d.getTime()) ? null : d
  })

export const MeasurementsTimelineSchema = z.enum(['hour', 'day', 'week', 'month'])

// ── Shared Building Blocks ──────────────────────────────────────────────────

const AbsoluteValues = z.object({
  min: z.string(),
  max: z.string(),
  minText: z.string(),
  maxText: z.string(),
})

const RangeValues = z.object({
  min_good: z.string(),
  max_good: z.string(),
  min_acceptable: z.string(),
  max_acceptable: z.string(),
  current: z.string().nullable(),
  currentFormatted: z.string().nullable(),
})

const SensorSchema = z.object({
  id: z.string(),
  has_sensor: z.boolean(),
  status: SensorStatus,
  // uuid_android / uuid_ios absent in list responses — only in detail responses
  uuid_android: z.string().nullable().optional(),
  uuid_ios: z.string().nullable().optional(),
  version: z.string(),
  is_battery_low: z.boolean(),
  received_data_at: ApiTimestamp,
})

export const HubSchema = z.object({
  id: z.number(),
  hub_id: z.string(),
  hub_name: z.string().optional(),
  status: HubStatus,
  received_data_at: ApiTimestamp,
  reached_hub_at: ApiTimestamp,
})

// ── Auth API ────────────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string(),
})

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
})

// ── GET /api/user-plant ─────────────────────────────────────────────────────

export const GardenSummarySchema = z.object({
  id: z.number(),
  garden_name: z.string(),
  origin_path: z.string().nullable(),
  thumb_path: z.string().nullable(),
  mac_address: z.string().nullable(),
})

export const PlantSummarySchema = z.object({
  // garden/sensor/hub are null for plants with no sensor attached:
  // eslint-disable-next-line unicorn/prefer-top-level-await, unicorn/no-useless-undefined
  garden: z.object({ id: z.number() }).nullish().catch(undefined),
  // eslint-disable-next-line unicorn/prefer-top-level-await, unicorn/no-useless-undefined
  sensor: SensorSchema.nullish().catch(undefined),
  // eslint-disable-next-line unicorn/prefer-top-level-await, unicorn/no-useless-undefined
  hub: HubSchema.nullish().catch(undefined),
  // Fields documented in the list response but absent from the field table:
  id: z.number(),
  nickname: z.string().nullish(),
  scientific_name: z.string().nullish(),
  common_name: z.string().nullish(),
  status: UserPlantStatus.optional(),
  plant_id: z.number().nullish(),
  thumb_path: z.string().nullish(),
  plant_thumb_path: z.string().nullish(),
  origin_path: z.string().nullish(),
  wifi_status: WifiStatus.optional(),
  // Sensor status fields returned inline on list items (undocumented but observed):
  // null when plant has no sensor (status 3 = no sensor):
  moisture_status: MeasurementStatus.nullish(),
  light_status: MeasurementStatus.nullish(),
  temperature_status: MeasurementStatus.nullish(),
  salinity_status: MeasurementStatus.nullish(),
  nutrients_status: MeasurementStatus.nullish(),
})

export const UserPlantsResponseSchema = z.object({
  gardens: z.array(GardenSummarySchema),
  hubs_with_lost_connection: z
    .array(
      z
        .object({
          hub_id: z.string(),
          hub_name: z.string().optional(),
        })
        .passthrough(),
    )
    .default([]),
  plants: z.array(PlantSummarySchema),
})

// ── GET /api/user-plant/[plantID] ───────────────────────────────────────────

const PhMeasurementSchema = z.object({
  status: MeasurementStatus.nullable(), // API returns null when no pH data available
  values: z.object({
    min: z.string(),
    max: z.string(),
    current: z.string().nullable(),
  }),
  unit: z.string(),
  absolute_values: AbsoluteValues,
})

const TemperatureMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues.extend({ optimal_hours: z.number() }),
  unit: z.string(),
  absolute_values: AbsoluteValues,
})

const LightMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues.extend({ optimal_hours: z.number() }),
  dli_values: z.object({
    min_good: z.string(),
    max_good: z.string(),
    min_acceptable: z.string(),
    max_acceptable: z.string(),
  }),
  unit: z.string(),
  dli_unit: z.string(),
  absolute_values: AbsoluteValues,
})

const MoistureMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues,
  unit: z.string(),
  absolute_values: AbsoluteValues,
})

const SalinityMeasurementSchema = z.object({
  status: MeasurementStatus.transform(s => SALINITY_STATUS_INVERT[s]),
  values: RangeValues,
  unit: z.string(),
  absolute_values: AbsoluteValues,
})

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
  received_data_at: ApiTimestamp,
  gathering_data: z.boolean(),
  is_illegal: z.boolean(),
  not_supported: z.boolean(),
  sensor_update_available: z.boolean(),
  garden: z.object({ id: z.number(), name: z.string() }).nullish(),
  sensor: SensorSchema.extend({ created_at: ApiTimestamp }).nullish(),
  hub: HubSchema.nullish(),
  measurements: z.object({
    ph: PhMeasurementSchema,
    temperature: TemperatureMeasurementSchema,
    light: LightMeasurementSchema,
    moisture: MoistureMeasurementSchema,
    salinity: SalinityMeasurementSchema,
    battery: z.union([z.string(), z.number()]).transform(v => String(v)).nullable(),
  }).nullish(),
  temperature_unit: TemperatureUnit,
  know_hows: z.array(z.unknown()),
}).transform((data) => {
  const attentionLevel = computeAttention(data)
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

export const PlantDetailResponseSchema = z.object({
  plant: PlantDetailSchema,
})

// ── POST /api/user-plant/measurements/[plantID] ──────────────────────────────

export const MeasurementsRequestSchema = z.object({
  search: z.object({
    timeline: MeasurementsTimelineSchema,
  }),
})

const TimeseriesAbsoluteValues = z.object({
  min: z.string(),
  minText: z.string(),
  max: z.string(),
  maxText: z.string(),
})

export const PlantMeasurementsResponseSchema = z.object({
  measurements: z.array(
    z.object({
      light: z.number(),
      temperature: z.number(),
      soil_moisture: z.number(),
      soil_moisture_anomaly: z.boolean(),
      soil_fertility: z.number(),
      soil_fertility_anomaly: z.boolean(),
      date_utc: z.string(),
    }),
  ),
  dli_light: z.array(
    z.object({
      dli_light: z.number(),
      date_utc: z.string(),
    }),
  ),
  absolute_values: z.object({
    light: TimeseriesAbsoluteValues,
    dli_light: TimeseriesAbsoluteValues,
    temperature: TimeseriesAbsoluteValues,
    soil_moisture: TimeseriesAbsoluteValues,
    soil_fertility: TimeseriesAbsoluteValues,
  }),
  thresholds: z.object({
    ph_min: z.number(),
    ph_max: z.number(),
    temperature_min_good: z.number(),
    temperature_max_good: z.number(),
    temperature_min_acceptable: z.number(),
    temperature_max_acceptable: z.number(),
    light_min_good: z.number(),
    light_max_good: z.number(),
    light_min_acceptable: z.number(),
    light_max_acceptable: z.number(),
    dli_light_min_good: z.number(),
    dli_light_max_good: z.number(),
    dli_light_min_acceptable: z.number(),
    dli_light_max_acceptable: z.number(),
    moisture_min_good: z.number(),
    moisture_max_good: z.number(),
    moisture_min_acceptable: z.number(),
    moisture_max_acceptable: z.number(),
    salinity_min_good: z.number(),
    salinity_max_good: z.number(),
    salinity_min_acceptable: z.number(),
    salinity_max_acceptable: z.number(),
  }),
})

// ── Inferred Types ──────────────────────────────────────────────────────────

export type GardenSummary = z.infer<typeof GardenSummarySchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type LoginResponse = z.infer<typeof LoginResponseSchema>
export type MeasurementsTimeline = z.infer<typeof MeasurementsTimelineSchema>
export type Plant = z.infer<typeof PlantDetailSchema>
export type PlantDetailResponse = z.infer<typeof PlantDetailResponseSchema>
export type PlantMeasurementsResponse = z.infer<typeof PlantMeasurementsResponseSchema>
export type PlantSummary = z.infer<typeof PlantSummarySchema>
export type UserPlantsResponse = z.infer<typeof UserPlantsResponseSchema>
