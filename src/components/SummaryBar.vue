<!-- src/components/SummaryBar.vue -->
<template>
  <div
    v-if="plants.length"
    class="flex gap-2 px-4 py-1.5 bg-base-200 border-b border-base-300 flex-wrap shrink-0"
  >
    <span class="badge badge-ghost badge-sm">
      {{ plants.length }} {{ plants.length !== 1 ? 'Pflanzen' : 'Pflanze' }}
    </span>
    <span v-if="critical" class="badge badge-error badge-sm gap-1">
      💧 {{ critical }} {{ critical > 1 ? 'brauchen' : 'braucht' }} jetzt Wasser
    </span>
    <span v-if="warn" class="badge badge-warning badge-sm gap-1">
      ⚠️ {{ warn }} bald gießen
    </span>
    <span v-if="ok" class="badge badge-success badge-sm gap-1">
      ✅ {{ ok }} gut versorgt
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  plants: { type: Array, required: true },
})

const critical = computed(() => props.plants.filter(p => (p.moisture_status ?? 0) === 1).length)
const warn     = computed(() => props.plants.filter(p => (p.moisture_status ?? 0) === 2).length)
const ok       = computed(() => props.plants.filter(p => (p.moisture_status ?? 0) === 3).length)
</script>
