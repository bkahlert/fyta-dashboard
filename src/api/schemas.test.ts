import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import fixture from './fixtures/user-plants.json'
import { UserPlantsResponseSchema } from './schemas'

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
