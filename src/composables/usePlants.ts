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
    if (isFetching.value) return
    isFetching.value = true
    error.value = null
    try {
      const listRes = await fetch('/api/user-plant', { headers: { Accept: 'application/json' } })
      if (!listRes.ok) throw new Error(`List fetch failed: ${listRes.status}`)
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
          if (!res.ok) throw new Error(`Plant ${id} fetch failed: ${res.status}`)
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
