<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import type { Plant } from '../api/schemas'

import PlantCard from './PlantCard.vue'

const props = defineProps<{ plants: Plant[] }>()

const sorted = computed(() =>
  props.plants.toSorted(
    (a, b) =>
      a.attentionRank - b.attentionRank || (a.nickname ?? '').localeCompare(b.nickname ?? '', 'de'),
  ),
)

const outerRef = ref<HTMLElement | null>(null)
const innerRef = ref<HTMLElement | null>(null)
const zoom = ref(1.0)

// Incremented on each fitZoom() call so earlier in-flight runs abort when a
// newer call supersedes them (e.g. rapid resize events).
let fitId = 0

async function fitZoom() {
  const id = ++fitId
  const outer = outerRef.value
  const inner = innerRef.value
  if (!outer || !inner || sorted.value.length === 0) {
    zoom.value = 1
    return
  }

  // Suppress the scrollbar for the duration of the search. Without this,
  // Chrome fires ResizeObserver every time the scrollbar appears/disappears
  // (content-box width changes), which increments fitId and aborts the search.
  outer.style.overflowY = 'hidden'

  let lo = 0.3
  let hi = 3.0
  // Available height = outer minus its p-2 padding (8px top + 8px bottom).
  // Computed once: outer.clientHeight is stable while overflow is suppressed.
  const availH = outer.clientHeight - 16

  for (let i = 0; i < 15; i++) {
    if (fitId !== id) {
      outer.style.overflowY = ''
      return
    }
    zoom.value = (lo + hi) / 2
    await nextTick()
    // inner.offsetHeight is the pre-zoom layout height; multiplied by zoom it
    // gives the true rendered height. This is immune to the Chrome quirk where
    // getBoundingClientRect() clips to the parent's overflow:hidden bounds, and
    // to the quirk where scrollHeight returns the pre-zoom height under
    // overflow:hidden instead of the rendered height.
    if (inner.offsetHeight * zoom.value > availH) {
      hi = zoom.value
    } else {
      lo = zoom.value
    }
  }

  outer.style.overflowY = ''
  if (fitId === id) zoom.value = lo
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver(() => requestAnimationFrame(fitZoom))
  if (outerRef.value) resizeObserver.observe(outerRef.value)
  nextTick(fitZoom)
})

onUnmounted(() => resizeObserver?.disconnect())

watch(sorted, fitZoom, { flush: 'post' })

const gridStyle = computed(() => ({
  zoom: zoom.value,
}))
</script>

<template>
  <div ref="outerRef" class="relative flex-1 overflow-x-hidden overflow-y-auto p-2 min-h-0">
    <div
      v-if="sorted.length > 0"
      ref="innerRef"
      class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2"
      :style="gridStyle"
    >
      <PlantCard v-for="plant in sorted" :key="plant.id" :plant="plant" />
    </div>
    <div v-else class="w-full h-full flex flex-col items-center justify-center gap-4 opacity-40">
      <span class="text-6xl select-none">🪴</span>
      <p class="text-sm">Keine Pflanzen gefunden. Zuerst welche in der FYTA-App anlegen.</p>
    </div>
  </div>
</template>
