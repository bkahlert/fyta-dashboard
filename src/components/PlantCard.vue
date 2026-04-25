<script setup lang="ts">
import { computed } from 'vue'

import type { Plant } from '../api/schemas'
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
  if (props.plant.attentionLevel === 'skip') return 'border-2 border-blue-400/20 bg-base-200'
  return 'border-2 border-base-300 bg-base-200'
})

const lastSeenDate = computed(() => props.plant.sensor?.received_data_at ?? null)
const lastSeen = useRelativeTime(lastSeenDate)
const lastSeenClass = computed(() =>
  props.plant.sensor?.status === 'error' ? 'text-error' : 'text-base-content/40',
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
      <AttentionBadge :level="plant.attentionLevel" class="absolute top-1 right-1" />
      <div
        class="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-base-200 via-base-200 to-transparent flex flex-col justify-end px-2 pb-1.5"
      >
        <h2 class="font-bold truncate leading-tight text-sm text-white">
          {{ plant.nickname ?? plant.scientific_name ?? 'Unbekannt' }}
        </h2>
        <p class="text-xs italic truncate leading-tight text-white/60">
          {{ plant.scientific_name ?? '' }}
        </p>
      </div>
    </PlantPhoto>

    <div class="card-body min-h-0 overflow-hidden p-2">
      <div class="flex flex-wrap items-center gap-2 min-w-0">
        <SensorStatus
          type="moisture"
          :status="plant.measurements?.moisture?.status ?? 'no_data'"
          :value="plant.measurements?.moisture?.values?.currentFormatted"
          :unit="plant.measurements?.moisture?.unit"
          class="min-w-0"
        />
        <SensorStatus
          type="light"
          :status="plant.measurements?.light?.status ?? 'no_data'"
          :value="plant.measurements?.light?.values?.currentFormatted"
          :unit="plant.measurements?.light?.unit"
          class="min-w-0"
        />
        <SensorStatus
          type="temp"
          :status="plant.measurements?.temperature?.status ?? 'no_data'"
          :value="plant.measurements?.temperature?.values?.currentFormatted"
          :unit="plant.measurements?.temperature?.unit"
          class="min-w-0"
        />
        <SensorStatus
          type="salinity"
          :status="plant.measurements?.salinity?.status ?? 'no_data'"
          :value="plant.measurements?.salinity?.values?.currentFormatted"
          :unit="plant.measurements?.salinity?.unit"
          class="min-w-0"
        />
        <SensorStatus
          type="battery"
          :status="plant.battery_status ?? 'no_data'"
          :value="plant.measurements?.battery"
          unit="%"
          class="min-w-0"
        />
        <span class="basis-full text-right text-[10px]" :class="lastSeenClass">{{
          lastSeenDate !== null ? lastSeen : ''
        }}</span>
      </div>
    </div>
  </div>
</template>
