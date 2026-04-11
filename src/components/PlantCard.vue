<!-- src/components/PlantCard.vue -->
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
      <div v-else class="w-full h-full flex items-center justify-center text-4xl opacity-20 select-none">
        🪴
      </div>
      <span
        v-if="badgeText"
        class="badge badge-xs absolute top-1 right-1"
        :class="badgeClass"
      >{{ badgeText }}</span>
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
      <div v-if="tier !== 'micro'" class="flex flex-col shrink-0" :class="tier === 'compact' ? 'gap-px' : 'gap-0.5'">
        <div v-for="[icon, code, type] in sensors" :key="icon" class="flex items-center gap-1">
          <span v-if="tier !== 'compact'" class="text-xs w-3 shrink-0 leading-none">{{ icon }}</span>
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

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  plant: { type: Object, required: true },
  cardHeight: { type: Number, default: 160 },
})

const photoFailed = ref(false)

// ── Content tier ──────────────────────────────────────────────
const tier = computed(() => {
  const h = props.cardHeight
  if (h >= 180) return 'full'
  if (h >= 120) return 'medium'
  if (h >= 80)  return 'compact'
  return 'micro'
})

// Photo height varies by tier to maximise body space at small sizes
const photoHeight = computed(() => {
  const h = props.cardHeight
  if (h < 80)  return 0                   // micro  : no photo
  if (h < 120) return Math.round(h * 0.20) // compact: thin strip (~20%)
  return Math.round(h * 0.35)              // medium/full: normal (~35%)
})

// Padding + gap shrink as cards get smaller to preserve content room
const bodyClass = computed(() => {
  if (tier.value === 'micro')   return 'p-1 gap-0.5'
  if (tier.value === 'compact') return 'p-1.5 gap-0.5'
  return 'p-2 gap-1'
})

// ── Sensor bar widths ─────────────────────────────────────────
const SENSOR_BARS = {
  0: 0, 1: 8, 2: 28, 3: 70, 4: 87, 5: 98,
}

// ── Per-sensor labels (German, sensor-specific) ───────────────
const SENSOR_LABELS = {
  moisture: { 0: '–', 1: 'Trocken', 2: 'Wenig',  3: 'OK',  4: 'Feucht', 5: 'Nass'   },
  light:    { 0: '–', 1: 'Dunkel',  2: 'Wenig',  3: 'OK',  4: 'Hell',   5: 'Grell'  },
  temp:     { 0: '–', 1: 'Kalt',    2: 'Kühl',   3: 'OK',  4: 'Warm',   5: 'Heiß'   },
  salinity: { 0: '–', 1: 'Mangel',  2: 'Wenig',  3: 'OK',  4: 'Hoch',   5: 'Zuviel' },
}

const MOISTURE_HEADLINE = {
  0: 'Kein Sensor',
  1: 'Braucht Wasser',
  2: 'Bald gießen',
  3: 'Gut versorgt',
  4: 'Leicht feucht',
  5: 'Überwässert',
}
const MOISTURE_EMOJI = { 0: '🪴', 1: '💧', 2: '💧', 3: '✅', 4: '🚿', 5: '🌊' }

// ── Sensor values ─────────────────────────────────────────────
const ms = computed(() => props.plant.moisture_status ?? 0)
const sensors = computed(() => [
  ['☀️',  props.plant.light_status ?? 0,                                     'light'],
  ['🌡️', props.plant.temperature_status ?? 0,                               'temp'],
  ['🧪',  props.plant.salinity_status ?? props.plant.nutrients_status ?? 0,  'salinity'],
])

// ── Photo URL ─────────────────────────────────────────────────
const photoUrl = computed(() => {
  const thumb = props.plant.thumb_path
    ? props.plant.thumb_path.replace('https://api.prod.fyta-app.de', '/img-proxy')
    : ''
  return thumb || props.plant.plant_thumb_path || ''
})

// ── CSS classes ───────────────────────────────────────────────
// border-2 on all cards for clear definition; status colour on urgent plants
const cardBorderClass = computed(() => {
  if (ms.value === 1) return 'border-2 border-error bg-base-200'
  if (ms.value === 2) return 'border-2 border-warning bg-base-200'
  return 'border-2 border-base-300 bg-base-200'
})

const nameSizeClass = computed(() =>
  tier.value === 'micro' ? 'text-xs' : 'text-sm'
)

const moistureColorClass = computed(() => {
  const m = ms.value
  if (m === 1) return 'text-error'
  if (m === 2 || m === 4) return 'text-warning'
  if (m === 3) return 'text-success'
  if (m === 5) return 'text-info'
  return 'text-base-content/40'
})

const badgeText = computed(() => {
  if (ms.value === 1) return '💧 Jetzt'
  if (ms.value === 2) return '💧 Bald'
  return ''
})
const badgeClass = computed(() =>
  ms.value === 1 ? 'badge-error' : 'badge-warning'
)

function barColorClass(code) {
  if (code === 1) return 'bg-error'
  if (code === 2 || code === 4) return 'bg-warning'
  if (code === 3) return 'bg-success'
  if (code === 5) return 'bg-info'
  return 'bg-base-content/20'
}

function labelColorClass(code) {
  if (code === 1) return 'text-error'
  if (code === 2 || code === 4) return 'text-warning'
  if (code === 3) return 'text-success'
  if (code === 5) return 'text-info'
  return 'text-base-content/40'
}
</script>
