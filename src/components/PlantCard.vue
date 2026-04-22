<script setup lang="ts">
import { BatteryLow, WifiOff } from 'lucide-vue-next'
import { computed } from 'vue'

import type { Plant } from '../types/plant'

import AttentionBadge from './AttentionBadge.vue'
import PlantPhoto from './PlantPhoto.vue'
import SensorStatus from './SensorStatus.vue'

const props = defineProps<{
  plant: Plant
}>()

const cardBorderClass = computed(() => {
  if (props.plant.attentionLevel === 'now') return 'border-2 border-error bg-base-200'
  if (props.plant.attentionLevel === 'soon') return 'border-2 border-warning bg-base-200'
  return 'border-2 border-base-300 bg-base-200'
})

// ── Wifi status ───────────────────────────────────────────────
// 'lost': lost connection to all hubs  →  error  (red)
// 'error': error connecting / lost within time range  →  warning (yellow)
const WIFI_BADGE_CLASS: Record<'error' | 'lost', string> = {
  lost: 'badge-error',
  error: 'badge-warning',
}

// ── Sensor meta ───────────────────────────────────────────────
function timeAgo(dateStr: null | string | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr.replace(' ', 'T'))
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'gerade eben'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `vor ${String(minutes)} Min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${String(hours)} Std`
  return `vor ${String(Math.floor(hours / 24))} T`
}
</script>

<template>
  <div class="card overflow-hidden h-full" :class="cardBorderClass">
    <PlantPhoto
      :thumb-path="plant.thumb_path"
      :plant-thumb-path="plant.plant_thumb_path"
      :origin-path="plant.origin_path"
      :alt="plant.nickname ?? undefined"
    >
      <!-- Top-left problem badges -->
      <div class="absolute top-1 left-1 flex gap-0.5">
        <span
          v-if="plant.wifi_status === 'lost' || plant.wifi_status === 'error'"
          class="badge badge-sm gap-0.5"
          :class="WIFI_BADGE_CLASS[plant.wifi_status]"
          ><WifiOff class="size-2.5"
        /></span>
        <span v-if="plant.sensorBatteryLow" class="badge badge-sm badge-warning gap-0.5"
          ><BatteryLow class="size-2.5"
        /></span>
      </div>
      <AttentionBadge :level="plant.attentionLevel" class="absolute top-1 right-1" />
      <!-- Name + species overlay -->
      <div
        class="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-base-200 via-base-200 to-transparent flex flex-col justify-end px-2 pb-1.5"
      >
        <h2 class="font-bold truncate leading-tight text-sm text-white">
          {{ plant.nickname ?? plant.scientific_name ?? 'Unbekannt' }}
        </h2>
        <p class="text-xs italic truncate leading-tight text-white/60">
          {{ plant.scientific_name ?? plant.common_name ?? '' }}
        </p>
      </div>
    </PlantPhoto>

    <!-- Body -->
    <div class="card-body min-h-0 overflow-hidden p-2">
      <div class="flex flex-wrap items-center gap-2 min-w-0">
        <SensorStatus
          type="moisture"
          :status="plant.moisture_status ?? 'no_data'"
          class="min-w-0"
        />
        <SensorStatus type="light" :status="plant.light_status ?? 'no_data'" class="min-w-0" />
        <SensorStatus type="temp" :status="plant.temperature_status ?? 'no_data'" class="min-w-0" />
        <SensorStatus
          type="salinity"
          :status="plant.salinity_status ?? plant.nutrients_status ?? 'no_data'"
          class="min-w-0"
        />
        <span
          class="basis-full text-right text-[10px]"
          :class="plant.sensorStatus === 'error' ? 'text-error' : 'text-base-content/40'"
          >{{ plant.sensorLastSeen ? timeAgo(plant.sensorLastSeen) : '' }}</span
        >
      </div>
    </div>
  </div>
</template>
