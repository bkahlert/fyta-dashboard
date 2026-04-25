<script setup lang="ts">
import { AlertTriangle, CheckCircle, Leaf, RefreshCw, Wifi } from 'lucide-vue-next'
import { computed } from 'vue'

import type { Plant } from '../types/plant'
import { formatRelativeTime, useRelativeTime } from '../composables/useRelativeTime'

import WateringCan from './icons/WateringCan.vue'

const props = defineProps<{
  goodHubs?: { id: string; lastSync: Date | null; name: string }[]
  isLoading?: boolean
  lastUpdated?: Date | null
  plants?: Plant[]
}>()

defineEmits<{ refresh: [] }>()

const timeAgo = useRelativeTime(computed(() => props.lastUpdated ?? null))

const count = computed(() => props.plants?.length ?? 0)
const now = computed(() => props.plants?.filter((p) => p.attentionLevel === 'now').length ?? 0)
const soon = computed(() => props.plants?.filter((p) => p.attentionLevel === 'soon').length ?? 0)
const ok = computed(() => props.plants?.filter((p) => p.attentionLevel === 'ok').length ?? 0)
</script>

<template>
  <header class="navbar bg-base-200 border-b border-base-300 min-h-12 px-4 shrink-0">
    <!-- Left: title -->
    <div class="navbar-start gap-2 min-w-0">
      <Leaf class="size-5 text-success shrink-0 select-none" />
      <h1 class="text-base font-bold tracking-tight truncate">
        {{ count > 0 ? `${count} Pflanze${count === 1 ? '' : 'n'}` : 'Meine Pflanzen' }}
      </h1>
    </div>

    <!-- Center: status badges -->
    <div v-if="count > 0" class="navbar-center flex items-center gap-1.5">
      <span v-if="now" class="badge badge-error badge-sm gap-1">
        <WateringCan class="size-3 shrink-0" />{{ now }} {{ now > 1 ? 'brauchen' : 'braucht' }} jetzt Wasser
      </span>
      <span v-if="soon" class="badge badge-warning badge-sm gap-1">
        <AlertTriangle class="size-3 shrink-0" />{{ soon }} bald gießen
      </span>
      <span v-if="ok" class="badge badge-success badge-sm gap-1">
        <CheckCircle class="size-3 shrink-0" />{{ ok }} gut versorgt
      </span>
    </div>

    <!-- Right: hub status + last update + refresh -->
    <div class="navbar-end gap-2">
      <!-- Hub connectivity -->
      <span
        v-for="h in goodHubs"
        :key="h.id"
        class="text-xs text-success flex items-center gap-1 whitespace-nowrap"
      >
        <Wifi class="size-3.5 shrink-0" />
        <span>Sync {{ formatRelativeTime(h.lastSync) }}</span>
      </span>

      <!-- Divider between hub sync and page refresh -->
      <div v-if="goodHubs && goodHubs.length > 0" class="w-px h-4 bg-base-300 shrink-0" />

      <!-- Page refresh group -->
      <button class="btn btn-xs btn-ghost flex items-center gap-1 px-1.5" :disabled="isLoading" @click="$emit('refresh')">
        <RefreshCw :class="{ 'animate-spin': isLoading }" class="size-3 shrink-0" />
        <span v-if="lastUpdated" class="text-xs text-base-content/50 whitespace-nowrap">{{ timeAgo }}</span>
      </button>
    </div>
  </header>
</template>
