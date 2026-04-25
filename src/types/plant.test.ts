import { describe, expect, it } from 'vitest'

import { createPlant } from './plant'

const base = {
  id: 1,
  moisture_status: 'perfect' as const,
}

describe('createPlant', () => {
  describe('sensorId', () => {
    it('is set from sensor MAC address', () => {
      const plant = createPlant({ ...base, sensor: { id: 'CB:2F:8B:D7:D2:B1', status: 'correct' } })
      expect(plant.sensorId).toBe('CB:2F:8B:D7:D2:B1')
    })

    it('is undefined when sensor is null', () => {
      const plant = createPlant({ ...base, sensor: null })
      expect(plant.sensorId).toBeUndefined()
    })

    it('is undefined when sensor is absent', () => {
      const plant = createPlant({ ...base })
      expect(plant.sensorId).toBeUndefined()
    })
  })
})
