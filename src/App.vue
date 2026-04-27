<script setup lang="ts">
import { computed } from 'vue'

import AppHeader from './components/AppHeader.vue'
import PlantGrid from './components/PlantGrid.vue'
import { useAutoReload } from './composables/useAutoReload'
import { usePlants } from './composables/usePlants'

useAutoReload()

const { error, execute, isFetching, lastUpdated, lostHubs, plants } = usePlants()

const errorHubs = computed(() =>
  lostHubs.value.map((h) => ({
    id: h.hub_id,
    name: h.hub_name ?? h.hub_id,
  })),
)

const goodHubs = computed(() => {
  const lostIds = new Set(lostHubs.value.map((h) => h.hub_id))
  const byHub = new Map<string, { id: string; maxReached: Date | null; name: string }>()
  for (const p of plants.value) {
    if (!p.hub?.hub_id || lostIds.has(p.hub.hub_id)) continue
    const reached = p.hub.reached_hub_at ?? null
    const existing = byHub.get(p.hub.hub_id)
    if (!existing || (reached != null && (existing.maxReached == null || reached > existing.maxReached))) {
      byHub.set(p.hub.hub_id, { id: p.hub.hub_id, maxReached: reached, name: p.hub.hub_name ?? p.hub.hub_id })
    }
  }
  return [...byHub.values()].map((h) => ({ id: h.id, lastSync: h.maxReached, name: h.name }))
})
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden bg-base-100">
    <AppHeader :good-hubs="goodHubs" :is-loading="isFetching" :last-updated="lastUpdated" :plants="plants" @refresh="execute" />

    <div v-if="errorHubs.length > 0" class="bg-warning/10 border-b border-warning/30 px-4 py-1 shrink-0">
      <p v-for="h in errorHubs" :key="h.id" class="text-xs text-warning flex items-center gap-1.5">
        <span>⚠️</span>
        <span>Hub-Verbindung verloren: {{ h.name }}</span>
      </p>
    </div>

    <div v-if="isFetching && plants.length === 0" class="flex-1 flex items-center justify-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else-if="error && plants.length === 0" class="p-4">
      <div role="alert" class="alert alert-error text-sm">
        <span>Pflanzen konnten nicht geladen werden: {{ error }}</span>
      </div>
    </div>

    <PlantGrid v-else :plants="plants" />
  </div>
</template>
