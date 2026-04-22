<script setup lang="ts">
import type { AttentionLevel } from '../types/plant'

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
</template>
