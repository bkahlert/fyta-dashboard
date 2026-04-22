<script setup lang="ts">
import {computed, ref} from 'vue'

import type {Plant, SensorStatus} from '../types/plant'

const props = defineProps<{
  cardHeight?: number
  plant: Plant
}>()

const cardHeightPx = computed(() => props.cardHeight ?? 160)
const photoFailed = ref(false)

// ── Content tier ──────────────────────────────────────────────
type Tier = 'compact' | 'full' | 'medium' | 'micro'

const tier = computed<Tier>(() => {
  const h = cardHeightPx.value
  if (h >= 180) return 'full'
  if (h >= 120) return 'medium'
  if (h >= 80) return 'compact'
  return 'micro'
})

const photoHeight = computed(() => {
  const h = cardHeightPx.value
  if (h < 80) return 0
  if (h < 120) return Math.round(h * 0.2)
  return Math.round(h * 0.35)
})

const bodyClass = computed(() => {
  if (tier.value === 'micro') return 'p-1 gap-0.5'
  if (tier.value === 'compact') return 'p-1.5 gap-0.5'
  return 'p-2 gap-1'
})

// ── Sensor data ────────────────────────────────────────────────
const SENSOR_BARS: Record<SensorStatus, number> = {
  0: 0,
  1: 8,
  2: 28,
  3: 70,
  4: 87,
  5: 98,
}

type SensorType = 'light' | 'moisture' | 'salinity' | 'temp'

const SENSOR_LABELS: Record<SensorType, Record<SensorStatus, string>> = {
  light: {0: '–', 1: 'Dunkel', 2: 'Wenig', 3: 'OK', 4: 'Hell', 5: 'Grell'},
  moisture: {0: '–', 1: 'Trocken', 2: 'Wenig', 3: 'OK', 4: 'Feucht', 5: 'Nass'},
  salinity: {0: '–', 1: 'Mangel', 2: 'Wenig', 3: 'OK', 4: 'Hoch', 5: 'Zuviel'},
  temp: {0: '–', 1: 'Kalt', 2: 'Kühl', 3: 'OK', 4: 'Warm', 5: 'Heiß'},
}

const MOISTURE_HEADLINE: Record<SensorStatus, string> = {
  0: 'Kein Sensor',
  1: 'Braucht Wasser',
  2: 'Bald gießen',
  3: 'Gut versorgt',
  4: 'Leicht feucht',
  5: 'Überwässert',
}

const MOISTURE_EMOJI: Record<SensorStatus, string> = {
  0: '🪴',
  1: '💧',
  2: '💧',
  3: '✅',
  4: '🚿',
  5: '🌊',
}

const ms = computed<SensorStatus>(() => (props.plant.moisture_status ?? 0))

type SensorRow = [icon: string, status: SensorStatus, type: SensorType]

const sensors = computed<SensorRow[]>(() => [
  ['☀️', (props.plant.light_status ?? 0), 'light'],
  ['🌡️', (props.plant.temperature_status ?? 0), 'temp'],
  [
    '🧪',
    (props.plant.salinity_status ?? props.plant.nutrients_status ?? 0),
    'salinity',
  ],
])

// ── Photo ─────────────────────────────────────────────────────
const photoUrl = computed(() => {
  const thumb = props.plant.thumb_path
      ? props.plant.thumb_path.replace('https://api.prod.fyta-app.de', '/img-proxy')
      : ''
  return thumb || (props.plant.plant_thumb_path ?? '')
})

// ── CSS helpers ───────────────────────────────────────────────
function statusColorClass(status: SensorStatus, variant: 'bg' | 'text'): string {
  const prefix = variant === 'text' ? 'text' : 'bg'
  if (status === 1) return `${prefix}-error`
  if (status === 2 || status === 4) return `${prefix}-warning`
  if (status === 3) return `${prefix}-success`
  if (status === 5) return `${prefix}-info`
  return variant === 'text' ? 'text-base-content/40' : 'bg-base-content/20'
}

const cardBorderClass = computed(() => {
  if (ms.value === 1) return 'border-2 border-error bg-base-200'
  if (ms.value === 2) return 'border-2 border-warning bg-base-200'
  return 'border-2 border-base-300 bg-base-200'
})

const nameSizeClass = computed(() => (tier.value === 'micro' ? 'text-xs' : 'text-sm'))

const moistureColorClass = computed(() => statusColorClass(ms.value, 'text'))

const badgeText = computed(() => {
  if (ms.value === 1) return '💧 Jetzt'
  if (ms.value === 2) return '💧 Bald'
  return ''
})

const badgeClass = computed(() => (ms.value === 1 ? 'badge-error' : 'badge-warning'))

const barColorClass = (status: SensorStatus) => statusColorClass(status, 'bg')
const labelColorClass = (status: SensorStatus) => statusColorClass(status, 'text')
</script>

<template>
  <div class="card overflow-hidden h-full" :class="cardBorderClass">
    <!-- Photo — hidden on micro tier, small strip on compact -->
    <figure
        v-if="photoHeight > 0"
        class="relative overflow-hidden shrink-0 bg-base-300"
        :style="{ height: photoHeight + 'px' }"
    >
      <img
          v-if="photoUrl && !photoFailed"
          :src="photoUrl"
          :alt="plant.nickname ?? ''"
          class="w-full h-full object-cover"
          @error="photoFailed = true"
      />
      <div
          v-else
          class="w-full h-full flex items-center justify-center text-4xl opacity-20 select-none"
      >
        🪴
      </div>
      <span v-if="badgeText" class="badge badge-xs absolute top-1 right-1" :class="badgeClass">{{
          badgeText
        }}</span>
    </figure>

    <!-- Body -->
    <div class="card-body min-h-0 flex flex-col overflow-hidden" :class="bodyClass">
      <!-- Name -->
      <h2 class="font-bold truncate leading-tight shrink-0" :class="nameSizeClass">
        {{ plant.nickname ?? plant.scientific_name ?? 'Unbekannt' }}
      </h2>

      <!-- Species — full and medium tiers only -->
      <p
          v-if="tier === 'full' || tier === 'medium'"
          class="text-xs opacity-50 italic truncate leading-tight shrink-0"
      >
        {{ plant.scientific_name ?? plant.common_name ?? '' }}
      </p>

      <!-- Moisture status -->
      <div class="flex items-center gap-1 min-w-0 shrink-0">
        <span class="shrink-0 leading-none" :class="tier === 'micro' ? 'text-xs' : 'text-sm'">
          {{ MOISTURE_EMOJI[ms] ?? '💧' }}
        </span>
        <span class="font-bold truncate text-xs" :class="moistureColorClass">
          {{ MOISTURE_HEADLINE[ms] }}
        </span>
      </div>

      <!-- Spacer: fills slack, collapses to 0 when space is tight -->
      <div class="flex-1 min-h-0"></div>

      <!-- Sensor bars
           full/medium : icon + bar + label  (full rows)
           compact     : bar only            (1px, no icon, no label)
           micro       : hidden entirely
      -->
      <div
          v-if="tier !== 'micro'"
          class="flex flex-col shrink-0"
          :class="tier === 'compact' ? 'gap-px' : 'gap-0.5'"
      >
        <div v-for="[icon, code, type] in sensors" :key="icon" class="flex items-center gap-1">
          <span v-if="tier !== 'compact'" class="text-xs w-3 shrink-0 leading-none">{{
              icon
            }}</span>
          <div
              class="flex-1 rounded-full bg-base-300/60 overflow-hidden"
              :class="tier === 'compact' ? 'h-px' : 'h-0.5'"
          >
            <div
                class="h-full rounded-full transition-all duration-700"
                :class="barColorClass(code)"
                :style="{ width: SENSOR_BARS[code] + '%' }"
            ></div>
          </div>
          <span
              v-if="tier !== 'compact'"
              class="text-xs shrink-0 whitespace-nowrap text-right"
              :class="labelColorClass(code)"
          >
            {{ SENSOR_LABELS[type][code] ?? '' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

