<!-- src/App.vue -->
<template>
  <!-- Config missing -->
  <div v-if="!apiToken" class="min-h-screen flex items-center justify-center p-6 bg-base-100">
    <div class="card bg-base-200 shadow-xl w-full max-w-lg">
      <div class="card-body gap-4">
        <span class="text-5xl select-none">🌿</span>
        <h1 class="card-title text-xl">Einrichtung erforderlich</h1>
        <div role="alert" class="alert alert-warning text-sm">
          <span>
            Erstelle eine <code class="font-mono">.env.local</code> Datei mit:<br />
            <code class="font-mono">VITE_API_TOKEN=your-token-here</code><br />
            Token erhalten unter <strong>web.fyta.de → API Token</strong>
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Dashboard -->
  <div v-else class="flex flex-col h-screen overflow-hidden bg-base-100">
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

const apiToken = import.meta.env.VITE_API_TOKEN

const { plants, isFetching, error, execute, lastUpdated } = usePlants()

function refresh() { execute() }

useIntervalFn(execute, 5 * 60 * 1000)
</script>
