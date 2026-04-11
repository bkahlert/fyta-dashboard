<!-- src/components/AppHeader.vue -->
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
      <button
        class="btn btn-sm btn-ghost gap-1"
        :disabled="isLoading"
        @click="$emit('refresh')"
      >
        <span :class="{ 'animate-spin': isLoading }" class="inline-block">↻</span>
        Aktualisieren
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useTimeAgo } from '@vueuse/core'

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: null },
})
defineEmits(['refresh'])

const timeAgo = useTimeAgo(computed(() => props.lastUpdated), {
  messages: {
    justNow: 'Gerade eben',
    past: n => `vor ${n}`,
    future: n => `in ${n}`,
    month: n => `${n} Monat${n !== 1 ? 'en' : ''}`,
    year:  n => `${n} Jahr${n !== 1 ? 'en' : ''}`,
    day:   n => `${n} Tag${n !== 1 ? 'en' : ''}`,
    week:  n => `${n} Woche${n !== 1 ? 'n' : ''}`,
    hour:  n => `${n} Stunde${n !== 1 ? 'n' : ''}`,
    minute: n => `${n} Minute${n !== 1 ? 'n' : ''}`,
    second: n => `${n} Sekunde${n !== 1 ? 'n' : ''}`,
    invalid: 'Ungültig',
  },
})
</script>
