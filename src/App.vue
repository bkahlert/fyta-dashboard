<!-- src/App.vue -->
<template>
  <!-- Dashboard -->
  <div class="flex flex-col h-screen overflow-hidden bg-base-100">
    <AppHeader
      :is-loading="isFetching"
      :last-updated="lastUpdated"
      @refresh="refresh"
    />
    <SummaryBar :plants="plants" />

    <!-- Loading (initial) -->
    <div v-if="isFetching && !plants.length" class="flex-1 flex items-center justify-center">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <!-- Error -->
    <div v-else-if="error && !plants.length" class="p-4">
      <div role="alert" class="alert alert-error text-sm">
        <span>Pflanzen konnten nicht geladen werden: {{ error }}</span>
      </div>
    </div>

    <!-- Grid -->
    <PlantGrid v-else :plants="plants" />
  </div>
</template>

<script setup>
import { useIntervalFn } from '@vueuse/core'
import { usePlants } from './composables/usePlants.js'
import AppHeader from './components/AppHeader.vue'
import SummaryBar from './components/SummaryBar.vue'
import PlantGrid from './components/PlantGrid.vue'

const { plants, isFetching, error, execute, lastUpdated } = usePlants()

function refresh() { execute() }

useIntervalFn(execute, 5 * 60 * 1000)
</script>
