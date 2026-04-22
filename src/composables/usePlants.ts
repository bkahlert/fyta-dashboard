import {useFetch} from '@vueuse/core'
import {computed, ref, watch} from 'vue'
import {z} from 'zod'

import {type UserPlantsResponse, UserPlantsResponseSchema} from '../api/schemas'
import {createPlant, type Plant} from '../types/plant'

export function usePlants() {
  const lastUpdated = ref<Date | null>(null)

  const {data, error, execute, isFetching} = useFetch('/api/user-plant', {
    headers: {Accept: 'application/json'},
  }).json()

  watch(isFetching, (fetching) => {
    if (!fetching && data.value != null) lastUpdated.value = new Date()
  })

  const parsed = computed<null | UserPlantsResponse>(() => {
    const result = UserPlantsResponseSchema.safeParse(data.value)
    if (!result.success) {
      console.error('[usePlants] schema parse failed:', z.treeifyError(result.error))
      return null
    }
    return result.data
  })

  const plants = computed<Plant[]>(() =>
    parsed.value?.plants.map((p) => createPlant(p)) ?? [],
  )

  const lostHubs = computed(() => parsed.value?.hubs_with_lost_connection ?? [])

  return {error, execute, isFetching, lastUpdated, lostHubs, plants}
}
