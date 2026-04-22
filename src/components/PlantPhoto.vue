<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  thumbPath?: null | string
  plantThumbPath?: null | string
  originPath?: null | string
  alt?: string
}>()

const primaryFailed = ref(false)
const fallbackFailed = ref(false)
const showLightbox = ref(false)

watch(showLightbox, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

function onPhotoError() {
  if (primaryFailed.value) {
    fallbackFailed.value = true
  } else {
    primaryFailed.value = true
  }
}

const photoUrl = computed(() => {
  const primary = props.thumbPath
    ? props.thumbPath.replace('https://api.prod.fyta-app.de', '/img-proxy')
    : null
  if (!primaryFailed.value && primary) return primary
  if (!fallbackFailed.value && props.plantThumbPath) return props.plantThumbPath
  return null
})

const largePhotoUrl = computed(() => {
  if (props.originPath) {
    return props.originPath.replace('https://api.prod.fyta-app.de', '/img-proxy')
  }
  return photoUrl.value
})
</script>

<template>
  <figure
    class="relative overflow-hidden shrink-0 bg-base-200 aspect-4/3"
    :class="{ 'cursor-pointer': photoUrl }"
    @click="photoUrl && (showLightbox = true)"
  >
    <img
      v-if="photoUrl"
      :src="photoUrl"
      :alt="alt ?? ''"
      class="w-full h-full object-cover"
      @error="onPhotoError"
    />
    <div v-else class="w-full h-full flex items-center justify-center opacity-20 select-none">
      <span class="text-5xl">🪴</span>
    </div>
    <slot />
  </figure>

  <Teleport to="body">
    <div
      v-if="showLightbox"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
      @click="showLightbox = false"
    >
      <img
        :src="largePhotoUrl ?? ''"
        :alt="alt ?? ''"
        class="max-w-[90vw] max-h-[90vh] object-contain rounded [clip-path:inset(0_1px_0_0)]"
      />
    </div>
  </Teleport>
</template>
