<!-- src/components/PlantGrid.vue -->
<template>
  <div ref="gridEl" class="flex-1 overflow-hidden p-2 min-h-0">
    <div
      v-if="plants.length"
      class="grid w-full h-full gap-2"
      :style="gridStyle"
    >
      <PlantCard
        v-for="plant in plants"
        :key="plant.id"
        :plant="plant"
        :card-height="cardHeight"
      />
      <!-- Empty placeholder slots to keep grid shape -->
      <div v-for="i in emptySlots" :key="`empty-${i}`" />
    </div>
    <div v-else class="w-full h-full flex flex-col items-center justify-center gap-4 opacity-40">
      <span class="text-6xl select-none">🪴</span>
      <p class="text-sm">Keine Pflanzen gefunden. Zuerst welche in der FYTA-App anlegen.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useGridLayout } from '../composables/useGridLayout.js'
import PlantCard from './PlantCard.vue'

const props = defineProps({
  plants: { type: Array, required: true },
})

const gridEl = ref(null)
const { width, height } = useElementSize(gridEl)

// gap-2 = 8px; p-2 = 8px padding each side
const GAP = 8
const PADDING = 16 // p-2 on each axis (8px × 2)

const availW = computed(() => Math.max(0, width.value  - PADDING))
const availH = computed(() => Math.max(0, height.value - PADDING))

const layout = useGridLayout(
  computed(() => props.plants.length),
  availW,
  availH,
)

// Actual card height accounting for gaps between rows
const cardHeight = computed(() => {
  const { rows } = layout.value
  if (!rows || availH.value <= 0) return 160
  const totalGaps = (rows - 1) * GAP
  return Math.floor((availH.value - totalGaps) / rows)
})

const emptySlots = computed(() => {
  const { cols, rows } = layout.value
  return Math.max(0, cols * rows - props.plants.length)
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${layout.value.cols}, 1fr)`,
  gridTemplateRows:    `repeat(${layout.value.rows}, 1fr)`,
}))
</script>
