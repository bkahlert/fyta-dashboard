import { useIntervalFn } from '@vueuse/core'
import { ref, watch } from 'vue'

import type { Plant } from '../types/plant'

type PlantId = Plant['id']

export function useBatteryLevels(plants: Readonly<{ value: Plant[] }>) {
  const levels = ref<Map<PlantId, null | number>>(new Map())

  async function fetchAll() {
    const withSensors = plants.value.filter((p) => p.sensorId)
    if (withSensors.length === 0) return
    const entries = await Promise.all(
      withSensors.map(async (p): Promise<[PlantId, null | number]> => {
        try {
          const res = await fetch(`/api/user-plant/${p.id}`, {
            headers: { Accept: 'application/json' },
          })
          const data = (await res.json()) as { plant?: { measurements?: { battery?: null | string } } }
          const raw = data?.plant?.measurements?.battery
          return [p.id, raw != null ? Number(raw) : null]
        } catch {
          return [p.id, null]
        }
      }),
    )
    levels.value = new Map(entries)
  }

  // Fetch once as soon as the plant list is available
  watch(
    () => plants.value.length,
    (len) => {
      if (len > 0 && levels.value.size === 0) void fetchAll()
    },
    { immediate: true },
  )

  useIntervalFn(() => void fetchAll(), 10 * 60 * 1000)

  return { batteryLevels: levels, fetchBatteryLevels: fetchAll }
}
