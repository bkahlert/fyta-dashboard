import { z } from "zod";

// ── Status Enums ────────────────────────────────────────────────────────────
// Source: https://fyta-io.notion.site/FYTA-Public-API-d2f4c30306f74504924c9a40402a3afd

export const UserPlantStatus = z.union([
  z.literal(0), // deleted
  z.literal(1), // good
  z.literal(2), // bad
  z.literal(3), // no sensor
]);

export const MeasurementStatus = z.union([
  z.literal(0), // no data
  z.literal(1), // too low
  z.literal(2), // low
  z.literal(3), // perfect
  z.literal(4), // high
  z.literal(5), // too high
]);

export const SensorStatus = z.union([
  z.literal(0), // none — plant has no sensor
  z.literal(1), // correct — last reading ≤ 1.5 h ago
  z.literal(2), // error — reading missing or > 1.5 h ago
]);

export const HubStatus = z.union([
  z.literal(1), // correct — last reading received ≤ 1.5 h ago
  z.literal(2), // error — last reading received > 1.5 h ago
]);

export const WifiStatus = z.union([
  z.null(),      // never connected / no hub / no sensor
  z.literal(0), // lost connection to all previously connected hubs
  z.literal(1), // connected to at least one hub
  z.literal(2), // error connecting hub OR connection lost within a specific time range
]);

export const TemperatureUnit = z.union([
  z.literal(1), // Celsius
  z.literal(2), // Fahrenheit
]);

export const MeasurementsTimelineSchema = z.enum(["hour", "day", "week", "month"]);

// ── Shared Building Blocks ──────────────────────────────────────────────────

const AbsoluteValues = z.object({
  min: z.string(),
  max: z.string(),
  minText: z.string(),
  maxText: z.string(),
});

const RangeValues = z.object({
  min_good: z.string(),
  max_good: z.string(),
  min_acceptable: z.string(),
  max_acceptable: z.string(),
  current: z.string().nullable(),
  currentFormatted: z.string().nullable(),
});

const SensorSchema = z.object({
  id: z.string(),
  has_sensor: z.boolean(),
  status: SensorStatus,
  uuid_android: z.string().nullable(),
  uuid_ios: z.string().nullable(),
  version: z.string(),
  is_battery_low: z.boolean(),
  received_data_at: z.string().nullable(),
});

const HubSchema = z.object({
  id: z.number(),
  hub_id: z.string(),
  status: HubStatus,
  received_data_at: z.string().nullable(),
  reached_hub_at: z.string().nullable(),
});

// ── Auth API ────────────────────────────────────────────────────────────────

export const LoginRequestSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
});

// ── GET /api/user-plant ─────────────────────────────────────────────────────

export const GardenSummarySchema = z.object({
  id: z.number(),
  garden_name: z.string(),
  origin_path: z.string().nullable(),
  thumb_path: z.string().nullable(),
  mac_address: z.string().nullable(),
});

export const PlantSummarySchema = z.object({
  garden: z.object({ id: z.number() }),
  sensor: SensorSchema,
  hub: HubSchema,
  // Fields documented in the list response but absent from the field table:
  id: z.number().optional(),
  nickname: z.string().nullable().optional(),
  scientific_name: z.string().nullable().optional(),
  common_name: z.string().nullable().optional(),
  status: UserPlantStatus.optional(),
  plant_id: z.number().nullable().optional(),
  thumb_path: z.string().nullable().optional(),
  plant_thumb_path: z.string().nullable().optional(),
  origin_path: z.string().nullable().optional(),
  wifi_status: WifiStatus.optional(), // absent on list items that have no hub
  // Sensor status fields returned inline on list items (undocumented but observed):
  moisture_status: MeasurementStatus.optional(),
  light_status: MeasurementStatus.optional(),
  temperature_status: MeasurementStatus.optional(),
  salinity_status: MeasurementStatus.optional(),
  nutrients_status: MeasurementStatus.optional(),
});

export const UserPlantsResponseSchema = z.object({
  gardens: z.array(GardenSummarySchema),
  plants: z.array(PlantSummarySchema),
});

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
});

const TemperatureMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues.extend({ optimal_hours: z.number() }),
  unit: z.string(),
  absolute_values: AbsoluteValues,
});

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
});

const MoistureMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues,
  unit: z.string(),
  absolute_values: AbsoluteValues,
});

const SalinityMeasurementSchema = z.object({
  status: MeasurementStatus,
  values: RangeValues,
  unit: z.string(),
  absolute_values: AbsoluteValues,
});

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
  garden: z.object({ id: z.number(), name: z.string() }),
  sensor: SensorSchema.extend({ created_at: z.string().nullable() }),
  hub: HubSchema,
  measurements: z.object({
    ph: PhMeasurementSchema,
    temperature: TemperatureMeasurementSchema,
    light: LightMeasurementSchema,
    moisture: MoistureMeasurementSchema,
    salinity: SalinityMeasurementSchema,
    battery: z.string().nullable(),
  }),
  temperature_unit: TemperatureUnit,
  know_hows: z.array(z.unknown()),
});

export const PlantDetailResponseSchema = z.object({
  plant: PlantDetailSchema,
});

// ── POST /api/user-plant/measurements/[plantID] ──────────────────────────────

export const MeasurementsRequestSchema = z.object({
  search: z.object({
    timeline: MeasurementsTimelineSchema,
  }),
});

const TimeseriesAbsoluteValues = z.object({
  min: z.string(),
  minText: z.string(),
  max: z.string(),
  maxText: z.string(),
});

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
});

// ── Inferred Types ──────────────────────────────────────────────────────────

export type GardenSummary = z.infer<typeof GardenSummarySchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type MeasurementsTimeline = z.infer<typeof MeasurementsTimelineSchema>;
export type PlantDetail = z.infer<typeof PlantDetailSchema>;
export type PlantDetailResponse = z.infer<typeof PlantDetailResponseSchema>;
export type PlantMeasurementsResponse = z.infer<typeof PlantMeasurementsResponseSchema>;
export type PlantSummary = z.infer<typeof PlantSummarySchema>;
export type UserPlantsResponse = z.infer<typeof UserPlantsResponseSchema>;
