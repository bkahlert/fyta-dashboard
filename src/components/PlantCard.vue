<script setup lang="ts">
import { BatteryLow, BatteryWarning } from 'lucide-vue-next'
import { computed } from 'vue'

import type { Plant } from '../types/plant'
import { useRelativeTime } from '../composables/useRelativeTime'

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

// ── Sensor name ───────────────────────────────────────────────
// Derived from MAC address: strip colons, take last 3 hex chars → e.g. "CB:2F:8B:D7:D2:B1" → "Beam 2B1"
const sensorName = computed(() =>
  props.plant.sensorId
    ? 'Beam ' + props.plant.sensorId.replace(/:/g, '').slice(-3).toUpperCase()
    : undefined,
)

const batteryTitle = computed(() => {
  const level = props.plant.sensorBatteryLevel
  const name = sensorName.value
  if (level != null && name) return `${level}% (${name})`
  if (level != null) return `${level}%`
  return name
})

const batteryEmpty = computed(() => props.plant.sensorBatteryLevel === 0)

// ── Sensor meta ───────────────────────────────────────────────
const lastSeenDate = computed<Date | null>(() => {
  const d = props.plant.sensorLastSeen
  if (!d) return null
  const parsed = new Date(d.replace(' ', 'T') + 'Z')
  return Number.isNaN(parsed.getTime()) ? null : parsed
})
const lastSeen = useRelativeTime(lastSeenDate)
const lastSeenClass = computed(() =>
  props.plant.sensorStatus === 'error' ? 'text-error' : 'text-base-content/40',
)
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
          v-if="plant.sensorBatteryLow"
          class="badge badge-sm gap-0.5"
          :class="batteryEmpty ? 'badge-error' : 'badge-warning'"
          :title="batteryTitle"
        >
          <BatteryWarning v-if="batteryEmpty" class="size-2.5" />
          <BatteryLow v-else class="size-2.5" />
        </span>
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
        <span class="basis-full text-right text-[10px]" :class="lastSeenClass">{{
          lastSeenDate !== null ? lastSeen : ''
        }}</span>
      </div>
    </div>
  </div>
</template>
