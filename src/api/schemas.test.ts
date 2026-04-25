import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import detailFixture from './fixtures/user-plant.json'
import fixture from './fixtures/user-plants.json'
import { PlantDetailResponseSchema, UserPlantsResponseSchema } from './schemas'

describe('UserPlantsResponseSchema', () => {
  it('parses the live API fixture without errors', () => {
    const result = UserPlantsResponseSchema.safeParse(fixture)
    if (!result.success) {
      console.error(z.treeifyError(result.error))
    }
    expect(result.success).toBe(true)
  })

  describe('plant with sensor and hub', () => {
    it('parses measurement statuses', () => {
      const result = UserPlantsResponseSchema.safeParse(fixture)
      expect(result.success).toBe(true)
      if (!result.success) return
      const plant = result.data.plants.find((p) => p.id === 73_317)
      expect(plant?.moisture_status).toBe('low')
      expect(plant?.light_status).toBe('low')
      expect(plant?.temperature_status).toBe('perfect')
      expect(plant?.salinity_status).toBe('too_low')
      expect(plant?.nutrients_status).toBe('too_low')
    })

    it('parses thumb paths', () => {
      const result = UserPlantsResponseSchema.safeParse(fixture)
      expect(result.success).toBe(true)
      if (!result.success) return
      const plant = result.data.plants.find((p) => p.id === 73_317)
      expect(plant?.thumb_path).toContain('api.prod.fyta-app.de')
      expect(plant?.plant_thumb_path).toContain('s3.eu-central-1.amazonaws.com')
    })
  })

  describe('plant without sensor (status 3 / isNoBeam)', () => {
    it('accepts null sensor, hub, and measurement statuses', () => {
      const result = UserPlantsResponseSchema.safeParse(fixture)
      expect(result.success).toBe(true)
      if (!result.success) return
      const plant = result.data.plants.find((p) => p.id === 73_337)
      expect(plant?.sensor).toBeNull()
      expect(plant?.hub).toBeNull()
      expect(plant?.salinity_status).toBeNull()
      expect(plant?.nutrients_status).toBeNull()
      expect(plant?.moisture_status).toBe('no_data')
    })
  })
})

describe('PlantDetailResponseSchema (live fixture)', () => {
  it('parses the live API fixture without errors', () => {
    const result = PlantDetailResponseSchema.safeParse(detailFixture)
    if (!result.success) {
      console.error(z.treeifyError(result.error))
    }
    expect(result.success).toBe(true)
  })

  it('salinity status is inverted (raw 5 → too_low)', () => {
    const result = PlantDetailResponseSchema.safeParse(detailFixture)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.plant.measurements?.salinity.status).toBe('too_low')
  })

  it('battery_status is null when battery is null', () => {
    const result = PlantDetailResponseSchema.safeParse(detailFixture)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.plant.battery_status).toBeNull()
  })
})

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
  it('salinity status is inverted (API too_high → too_low, API too_low → too_high)', () => {
    const tooHighInput = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, salinity: { ...rawDetail.plant.measurements.salinity, status: 5 } } } }
    expect(PlantDetailResponseSchema.parse(tooHighInput).plant.measurements?.salinity.status).toBe('too_low')

    const tooLowInput = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, salinity: { ...rawDetail.plant.measurements.salinity, status: 1 } } } }
    expect(PlantDetailResponseSchema.parse(tooLowInput).plant.measurements?.salinity.status).toBe('too_high')

    const perfectInput = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, salinity: { ...rawDetail.plant.measurements.salinity, status: 3 } } } }
    expect(PlantDetailResponseSchema.parse(perfectInput).plant.measurements?.salinity.status).toBe('perfect')
  })

  it('attentionLevel is ok when moisture is perfect', () => {
    const { plant } = PlantDetailResponseSchema.parse(rawDetail)
    expect(plant.attentionLevel).toBe('ok')
  })

  it('attentionLevel is now when moisture is too_low', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, moisture: { ...rawDetail.plant.measurements.moisture, status: 1 } } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.attentionLevel).toBe('now')
  })

  it('attentionLevel is soon when moisture is low', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, moisture: { ...rawDetail.plant.measurements.moisture, status: 2 } } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.attentionLevel).toBe('soon')
  })

  it('attentionLevel is ok when moisture is high', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, moisture: { ...rawDetail.plant.measurements.moisture, status: 4 } } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.attentionLevel).toBe('ok')
  })

  it('attentionLevel is skip when moisture is too_high', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, moisture: { ...rawDetail.plant.measurements.moisture, status: 5 } } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.attentionLevel).toBe('skip')
  })

  it('attentionRank of skip is greater than ok', () => {
    const okInput = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, moisture: { ...rawDetail.plant.measurements.moisture, status: 3 } } } }
    const skipInput = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, moisture: { ...rawDetail.plant.measurements.moisture, status: 5 } } } }
    const { plant: okPlant } = PlantDetailResponseSchema.parse(okInput)
    const { plant: skipPlant } = PlantDetailResponseSchema.parse(skipInput)
    expect(skipPlant.attentionRank).toBeGreaterThan(okPlant.attentionRank)
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

  it('battery_status is low when battery is a number (API returns numbers)', () => {
    const input = { plant: { ...rawDetail.plant, measurements: { ...rawDetail.plant.measurements, battery: 15 } } }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.battery_status).toBe('low')
    expect(plant.measurements?.battery).toBe('15')
  })

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

  it('parses sensor.received_data_at as null for invalid date string', () => {
    const input = {
      plant: {
        ...rawDetail.plant,
        sensor: { ...rawDetail.plant.sensor, received_data_at: 'not-a-date' },
      },
    }
    const { plant } = PlantDetailResponseSchema.parse(input)
    expect(plant.sensor?.received_data_at).toBeNull()
  })

  it('parses hub.received_data_at as a Date', () => {
    const { plant } = PlantDetailResponseSchema.parse(rawDetail)
    expect(plant.hub?.received_data_at).toBeInstanceOf(Date)
  })
})
