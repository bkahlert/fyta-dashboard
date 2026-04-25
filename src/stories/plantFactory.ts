import { ATTENTION_LEVELS } from '../api/schemas'
import type { Plant } from '../api/schemas'

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

export type MoistureStatus = 'too_low' | 'low' | 'perfect' | 'high' | 'too_high'

export const baseMeasurements: NonNullable<Plant['measurements']> = {
  ph: { status: null, values: { min: '4', max: '7', current: null }, unit: 'pH', absolute_values: { min: '0', max: '7.5', minText: '0', maxText: '7.5' } },
  temperature: { status: 'perfect', values: { min_good: '17', max_good: '36', min_acceptable: '10', max_acceptable: '42', current: '22', currentFormatted: '22', optimal_hours: 20 }, unit: '°C/h', absolute_values: { min: '0', max: '50', minText: '0', maxText: '50' } },
  light: { status: 'perfect', values: { min_good: '20', max_good: '450', min_acceptable: '18', max_acceptable: '675', current: '120', currentFormatted: '120', optimal_hours: 8 }, dli_values: { min_good: '0.25', max_good: '9', min_acceptable: '0.06', max_acceptable: '9' }, unit: 'μmol/h', dli_unit: 'mol/day', absolute_values: { min: '0', max: '700', minText: '0', maxText: '700' } },
  moisture: { status: 'perfect', values: { min_good: '35', max_good: '70', min_acceptable: '25', max_acceptable: '80', current: '55', currentFormatted: '55' }, unit: '%/h', absolute_values: { min: '0', max: '85', minText: '0', maxText: '85' } },
  salinity: { status: 'perfect', values: { min_good: '0.6', max_good: '1', min_acceptable: '0.4', max_acceptable: '1.2', current: '0.8', currentFormatted: '0.80' }, unit: 'mS/h', absolute_values: { min: '0', max: '1.4', minText: '0', maxText: '1.4' } },
  battery: '75',
}

export const baseSensor: NonNullable<Plant['sensor']> = {
  id: 'CB:2F:8B:D7:D2:B1',
  has_sensor: true,
  status: 'correct',
  version: '0.30.0',
  is_battery_low: false,
  received_data_at: new Date(Date.now() - 45 * 60 * 1000),
  created_at: new Date('2023-01-01'),
}

export function makePlant(overrides: DeepPartial<Plant> = {}): Plant {
  const base: Plant = {
    id: 1,
    nickname: 'Monstera',
    scientific_name: 'Monstera deliciosa',
    genus: null,
    status: 'good',
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
  const plant = { ...base, ...overrides } as Plant
  plant.attentionRank = ATTENTION_LEVELS.indexOf(plant.attentionLevel)
  return plant
}

export function makeMoisturePlant(
  id: number,
  moistureStatus: MoistureStatus,
  nickname: string,
  hub?: NonNullable<Plant['hub']>,
): Plant {
  const attentionLevel = moistureStatus === 'too_low' ? 'now' as const
    : moistureStatus === 'low' ? 'soon' as const
    : moistureStatus === 'too_high' ? 'skip' as const
    : 'ok' as const
  return makePlant({
    id,
    nickname,
    measurements: { ...baseMeasurements, moisture: { ...baseMeasurements.moisture, status: moistureStatus } },
    attentionLevel,
    hub: hub ?? null,
  })
}
