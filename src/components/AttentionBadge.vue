<script setup lang="ts">
import { Moon } from 'lucide-vue-next'

import type { AttentionLevel } from '../api/schemas'

import WateringCan from './icons/WateringCan.vue'

defineProps<{ level: AttentionLevel }>()
</script>

<template>
  <span v-if="level === 'now'" class="badge badge-sm badge-error font-semibold gap-1">
    <WateringCan class="size-3 shrink-0" />Jetzt
  </span>
  <span v-else-if="level === 'soon'" class="badge badge-sm badge-warning font-semibold gap-1">
    <WateringCan class="size-3 shrink-0" />Bald
  </span>
  <span v-else-if="level === 'skip'" class="badge badge-sm font-semibold gap-1 bg-blue-900/20 text-blue-300/70 border-blue-400/20">
    <Moon class="size-3 shrink-0" />In Ruhe lassen
  </span>
</template>
