<script setup lang="ts">
import type {UseTimeAgoMessages} from '@vueuse/core'

import {useTimeAgo} from '@vueuse/core'
import {computed} from 'vue'

const props = defineProps<{
  isLoading?: boolean
  lastUpdated?: Date | null
}>()

defineEmits<{ refresh: [] }>()

const timeAgoMessages: UseTimeAgoMessages = {
  day: (n: number) => `${String(n)} Tag${n === 1 ? '' : 'en'}`,
  future: (n: string) => `in ${n}`,
  hour: (n: number) => `${String(n)} Stunde${n === 1 ? '' : 'n'}`,
  invalid: 'Ungültig',
  justNow: 'Gerade eben',
  minute: (n: number) => `${String(n)} Minute${n === 1 ? '' : 'n'}`,
  month: (n: number) => `${String(n)} Monat${n === 1 ? '' : 'en'}`,
  past: (n: string) => `vor ${n}`,
  second: (n: number) => `${String(n)} Sekunde${n === 1 ? '' : 'n'}`,
  week: (n: number) => `${String(n)} Woche${n === 1 ? '' : 'n'}`,
  year: (n: number) => `${String(n)} Jahr${n === 1 ? '' : 'en'}`,
}

const timeAgo = useTimeAgo(
    computed(() => props.lastUpdated ?? new Date(0)),
    {
      messages: timeAgoMessages,
    },
)
</script>

<template>
  <header class="navbar bg-base-200 border-b border-base-300 min-h-12 px-4 shrink-0">
    <div class="flex-1 flex items-center gap-2">
      <span class="text-xl select-none">🌿</span>
      <h1 class="text-base font-bold tracking-tight">Meine Pflanzen</h1>
    </div>
    <div class="flex-none flex items-center gap-3">
      <span v-if="lastUpdated" class="text-xs text-base-content/60">
        {{ timeAgo }}
      </span>
      <button class="btn btn-sm btn-ghost gap-1" :disabled="isLoading" @click="$emit('refresh')">
        <span :class="{ 'animate-spin': isLoading }" class="inline-block">↻</span>
        Aktualisieren
      </button>
    </div>
  </header>
</template>
