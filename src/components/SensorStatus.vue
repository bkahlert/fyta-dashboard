<script lang="ts">
export { MEASUREMENT_STATUSES } from '../api/schemas'
export const SENSOR_TYPES = ['battery', 'light', 'moisture', 'salinity', 'temp'] as const
export type SensorType = (typeof SENSOR_TYPES)[number]
</script>

<script setup lang="ts">
import type { Component } from 'vue'

import {
  Battery,
  BatteryFull,
  BatteryLow,
  Check,
  Cloudy,
  Droplet,
  DropletOff,
  Droplets,
  Flame,
  Leaf,
  Rose,
  Snowflake,
  Sprout,
  Sun,
  SunDim,
  Thermometer,
  ThermometerSnowflake,
  ThermometerSun,
  Waves,
} from 'lucide-vue-next'
import { computed } from 'vue'

import type { MeasurementStatusValue } from '../api/schemas'
import ThermometerWithBulb from './icons/ThermometerWithBulb.vue'

const props = defineProps<{
  status: MeasurementStatusValue
  type: SensorType
  unit?: string
  value?: null | string
}>()

interface SensorEntry {
  cls: string
  icon: Component
  strokeWidth?: number
}

const sensorConfig: Record<SensorType, Record<MeasurementStatusValue, SensorEntry>> = {
  battery: {
    no_data: { icon: Battery, cls: 'text-base-content/50' },
    too_low: { icon: Battery, cls: 'text-error' },
    low: { icon: BatteryLow, cls: 'text-warning' },
    perfect: { icon: BatteryFull, cls: 'text-success' },
    high: { icon: BatteryFull, cls: 'text-success' },
    too_high: { icon: BatteryFull, cls: 'text-success' },
  },
  light: {
    no_data: { icon: Sun, cls: 'text-base-content/50' },
    too_low: { icon: Cloudy, cls: 'text-zinc-400' },
    low: { icon: SunDim, cls: 'text-amber-400/80' },
    perfect: { icon: Sun, cls: 'text-amber-400' },
    high: { icon: Sun, cls: 'text-amber-300', strokeWidth: 2.5 },
    too_high: { icon: Sun, cls: 'text-amber-200', strokeWidth: 3.5 },
  },
  moisture: {
    no_data: { icon: Droplets, cls: 'text-base-content/50' },
    too_low: { icon: DropletOff, cls: 'text-sky-200', strokeWidth: 3 },
    low: { icon: Droplet, cls: 'text-sky-400' },
    perfect: { icon: Droplets, cls: 'text-sky-400' },
    high: { icon: Droplets, cls: 'text-sky-400', strokeWidth: 3.5 },
    too_high: { icon: Waves, cls: 'text-sky-400', strokeWidth: 3.5 },
  },
  salinity: {
    no_data: { icon: Rose, cls: 'text-base-content/50' },
    too_low: { icon: Sprout, cls: 'text-emerald-700/80' },
    low: { icon: Leaf, cls: 'text-emerald-500/75' },
    perfect: { icon: Rose, cls: 'text-red-500/70' },
    high: { icon: Rose, cls: 'text-orange-700', strokeWidth: 1.5 },
    too_high: { icon: Rose, cls: 'text-amber-900' },
  },
  temp: {
    no_data: { icon: Thermometer, cls: 'text-base-content/50' },
    too_low: { icon: Snowflake, cls: 'text-sky-200' },
    low: { icon: ThermometerSnowflake, cls: 'text-sky-400' },
    perfect: { icon: ThermometerWithBulb, cls: 'text-base-content/55', strokeWidth: 2.5 },
    high: { icon: ThermometerSun, cls: 'text-amber-400' },
    too_high: { icon: Flame, cls: 'text-orange-500' },
  },
}

const sensorLabels: Record<SensorType, Record<MeasurementStatusValue, string>> = {
  battery: {
    no_data: '',
    too_low: 'Leer',
    low: 'Schwach',
    perfect: 'OK',
    high: 'OK',
    too_high: 'OK',
  },
  light: {
    no_data: '',
    too_low: 'Dunkel',
    low: 'Wenig',
    perfect: 'OK',
    high: 'Hell',
    too_high: 'Grell',
  },
  moisture: {
    no_data: '',
    too_low: 'Trocken',
    low: 'Wenig',
    perfect: 'OK',
    high: 'Feucht',
    too_high: 'Nass',
  },
  salinity: {
    no_data: '',
    too_low: 'Mangel',
    low: 'Wenig',
    perfect: 'OK',
    high: 'Hoch',
    too_high: 'Zuviel',
  },
  temp: {
    no_data: '',
    too_low: 'Kalt',
    low: 'Kühl',
    perfect: 'OK',
    high: 'Warm',
    too_high: 'Heiß',
  },
}

const entry = computed(() => sensorConfig[props.type][props.status])
const icon = computed(() => entry.value.icon)
const cls = computed(() => entry.value.cls)
const isOk = computed(() => props.status === 'perfect')
const label = computed(() => sensorLabels[props.type][props.status])
const title = computed(() =>
  props.value != null && props.unit ? `${props.value} ${props.unit}` : undefined,
)
</script>

<template>
  <span class="inline-flex items-center gap-1" :class="cls" :title="title">
    <span class="indicator">
      <Check v-if="isOk" class="indicator-item size-2 text-success" />
      <component :is="icon" class="size-3 shrink-0" :stroke-width="entry.strokeWidth ?? 2" />
    </span>
    <span v-if="!isOk && label" class="text-xs leading-tight truncate">{{ label }}</span>
  </span>
</template>
