<script setup lang="ts">
import {useIntervalFn} from '@vueuse/core'
import {computed} from 'vue'

import AppHeader from './components/AppHeader.vue'
import PlantGrid from './components/PlantGrid.vue'
import {usePlants} from './composables/usePlants'

const {error, execute, isFetching, lastUpdated, lostHubs, plants} = usePlants()

function hubSyncTime(dateStr: null | string | undefined): null | string {
  if (!dateStr) return null
  // API timestamps are UTC ("YYYY-MM-DD HH:mm:ss") — parse as UTC, display in local time
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
}

// Hubs that FYTA reports as having lost internet connectivity
const errorHubs = computed(() =>
  lostHubs.value.map(h => ({
    id: h.hub_id,
    name: h.hub_name ?? h.hub_id,
  })),
)

// Hubs seen in plant data that are NOT in the lost-connection list.
// reached_hub_at is per-plant (reflects last poll that had data for that sensor),
// so take the MAX across all plants sharing the same hub to get the true latest hub contact.
const goodHubs = computed(() => {
  const lostIds = new Set(lostHubs.value.map(h => h.hub_id))
  const byHub = new Map<string, { id: string; maxReached: string; name: string }>()
  for (const p of plants.value) {
    if (!p.hubId || lostIds.has(p.hubId)) continue
    const reached = p.hubLastReached ?? ''
    const existing = byHub.get(p.hubId)
    if (!existing || reached > existing.maxReached) {
      byHub.set(p.hubId, {id: p.hubId, maxReached: reached, name: p.hubName ?? p.hubId})
    }
  }
  return [...byHub.values()].map(h => ({
    id: h.id,
    lastSync: hubSyncTime(h.maxReached || null),
    name: h.name,
  }))
})

function refresh() {
  void execute()
}

useIntervalFn(() => {
  void execute()
}, 5 * 60 * 1000)
</script>

<template>
  <!-- Dashboard -->
  <div class="flex flex-col h-screen overflow-hidden bg-base-100">
    <AppHeader :good-hubs="goodHubs" :is-loading="isFetching" :last-updated="lastUpdated" :plants="plants" @refresh="refresh"/>

    <!-- Hub connectivity warning -->
    <div v-if="errorHubs.length > 0" class="bg-warning/10 border-b border-warning/30 px-4 py-1 shrink-0">
      <p v-for="h in errorHubs" :key="h.id" class="text-xs text-warning flex items-center gap-1.5">
        <span>⚠️</span>
        <span>Hub-Verbindung verloren: {{ h.name }}</span>
      </p>
    </div>

    <!-- Loading (initial) -->
    <div v-if="isFetching && plants.length === 0" class="flex-1 flex items-center justify-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error && plants.length === 0" class="p-4">
      <div role="alert" class="alert alert-error text-sm">
        <span>Pflanzen konnten nicht geladen werden: {{ error }}</span>
      </div>
    </div>

    <!-- Grid -->
    <PlantGrid v-else :plants="plants"/>
  </div>
</template>

