// src/composables/usePlants.js
import { computed, ref, watch } from 'vue'
import { useFetch } from '@vueuse/core'

// Urgency order: too dry → water soon → overwatered → slightly wet → perfect → no sensor
const URGENCY_ORDER = [1, 2, 5, 4, 3, 0]

function flattenAndSort(data) {
  if (!data) return []

  let plants = []
  if (Array.isArray(data)) {
    plants = data
  } else if (Array.isArray(data.plants)) {
    plants = data.plants
  } else if (Array.isArray(data.gardens)) {
    data.gardens.forEach(g =>
      (g.plants ?? []).forEach(p => plants.push({ ...p, _garden: g.name }))
    )
  }

  return [...plants].sort((a, b) =>
    URGENCY_ORDER.indexOf(a.moisture_status ?? 0) -
    URGENCY_ORDER.indexOf(b.moisture_status ?? 0)
  )
}

export function usePlants() {
  const lastUpdated = ref(null)

  const { data, isFetching, error, execute } = useFetch(
    '/api/user-plant',
    {
      headers: {
        Accept: 'application/json',
      },
    }
  ).json()

  watch(isFetching, (fetching) => {
    if (!fetching && data.value) lastUpdated.value = new Date()
  })

  const plants = computed(() => flattenAndSort(data.value))

  return { plants, isFetching, error, execute, lastUpdated }
}
