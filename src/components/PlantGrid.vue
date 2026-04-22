<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { computed, onMounted, onUnmounted, ref } from 'vue'

import type { Plant } from '../types/plant'

import PlantCard from './PlantCard.vue'

const props = defineProps<{ plants: Plant[] }>()

const sorted = computed(() => props.plants.toSorted((a, b) => a.attentionRank - b.attentionRank))

// ── Pinch-to-zoom ─────────────────────────────────────────────
// `zoom` is the CSS zoom factor applied to the inner grid.
// To keep the grid filling the container at all zoom levels, we set
// the grid's CSS width to (100 / zoom)% — after zoom scaling that
// equals exactly 100% of the container width.  overflow-x:hidden on
// the outer div clips the wider-than-viewport layout box that appears
// when zoom < 1.
const zoom = useLocalStorage('plantgrid-zoom', 1.0)
const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5

const outerRef = ref<HTMLElement | null>(null)
let pinchStartDist = 0
let pinchStartZoom = 1.0

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    pinchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )
    pinchStartZoom = zoom.value
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length !== 2) return
  e.preventDefault()
  const dist = Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY,
  )
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * (dist / pinchStartDist)))
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) pinchStartDist = 0
}

function adjustZoom(delta: number) {
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value + delta))
}

function onWheel(e: WheelEvent) {
  if (!e.ctrlKey) return
  e.preventDefault()
  adjustZoom(e.deltaY < 0 ? 0.1 : -0.1)
}

onMounted(() => {
  outerRef.value?.addEventListener('touchmove', onTouchMove, { passive: false })
  outerRef.value?.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  outerRef.value?.removeEventListener('touchmove', onTouchMove)
  outerRef.value?.removeEventListener('wheel', onWheel)
})

const gridStyle = computed(() => ({
  zoom: zoom.value,
  // Inverse-width so that after zoom the grid fills exactly 100% of the container.
  // e.g. zoom 1.5 → width 66.7%; zoom 0.7 → width 142.9%
  width: `${(100 / zoom.value).toFixed(4)}%`,
}))
</script>

<template>
  <!--
    overflow-x:hidden clips the wider-than-viewport CSS layout box produced
    when zoom < 1 (inverse-width > 100%).  Vertical scrolling is preserved.
  -->
  <div class="relative flex-1 min-h-0">
    <div
      ref="outerRef"
      class="h-full overflow-x-hidden overflow-y-auto p-2"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <div
        v-if="sorted.length > 0"
        class="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2"
        :style="gridStyle"
      >
        <PlantCard v-for="plant in sorted" :key="plant.id" :plant="plant" />
      </div>
      <div v-else class="w-full h-full flex flex-col items-center justify-center gap-4 opacity-40">
        <span class="text-6xl select-none">🪴</span>
        <p class="text-sm">Keine Pflanzen gefunden. Zuerst welche in der FYTA-App anlegen.</p>
      </div>
    </div>

    <!-- Zoom controls (mouse users) -->
    <div class="absolute bottom-3 right-3 flex items-center gap-1 bg-base-300/80 backdrop-blur-sm rounded-full px-1 py-0.5 shadow">
      <button
        class="btn btn-xs btn-ghost btn-circle"
        title="Verkleinern (Strg+Scroll)"
        :disabled="zoom <= MIN_ZOOM"
        @click="adjustZoom(-0.2)"
      >−</button>
      <button
        class="btn btn-xs btn-ghost font-mono text-xs min-w-[3rem]"
        title="Zoom zurücksetzen"
        @click="zoom = 1"
      >{{ Math.round(zoom * 100) }}%</button>
      <button
        class="btn btn-xs btn-ghost btn-circle"
        title="Vergrößern (Strg+Scroll)"
        :disabled="zoom >= MAX_ZOOM"
        @click="adjustZoom(0.2)"
      >+</button>
    </div>
  </div>
</template>
