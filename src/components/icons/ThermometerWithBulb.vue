<script setup lang="ts">
import { Thermometer } from 'lucide-vue-next'
import { useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })
const attrs = useAttrs()
</script>

<template>
  <span class="relative inline-flex" v-bind="attrs">
    <Thermometer class="size-full" :stroke-width="attrs['stroke-width']" />
    <svg viewBox="0 0 24 24" fill="currentColor" class="absolute inset-0 size-full text-error">
      <circle cx="12" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  </span>
</template>
