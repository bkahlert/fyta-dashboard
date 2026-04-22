import { useFetch } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import type { FytaApiResponse, Plant } from '../types/plant'

// Most urgent first: dry → water-soon → overwatered → slightly-wet → ok → no-sensor
const URGENCY_ORDER = [1, 2, 5, 4, 3, 0] as const

export function usePlants() {
  const lastUpdated = ref<Date | null>(null)

  const { data, error, execute, isFetching } = useFetch('/api/user-plant', {
    headers: { Accept: 'application/json' },
  }).json<FytaApiResponse | Plant[]>()

  watch(isFetching, (fetching) => {
    if (!fetching && data.value != null) lastUpdated.value = new Date()
  })

  const plants = computed(() => flattenAndSort(data.value))

  return { error, execute, isFetching, lastUpdated, plants }
}

function flattenAndSort(data: unknown): Plant[] {
  if (data === null || typeof data !== 'object') return []

  let plants: Plant[] = []

  if (Array.isArray(data)) {
    plants = data as Plant[]
  } else {
    const response = data as FytaApiResponse
    if (Array.isArray(response.plants)) {
      plants = response.plants
    } else if (Array.isArray(response.gardens)) {
      for (const garden of response.gardens) {
        for (const plant of garden.plants ?? []) {
          plants.push({ ...plant, _garden: garden.name })
        }
      }
    }
  }

  return plants.toSorted(
    (a, b) =>
      URGENCY_ORDER.indexOf(a.moisture_status ?? 0) - URGENCY_ORDER.indexOf(b.moisture_status ?? 0),
  )
}
