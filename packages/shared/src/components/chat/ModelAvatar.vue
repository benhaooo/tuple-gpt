<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-background text-muted-foreground"
    :style="avatarStyle"
    :title="modelId || 'Unknown model'"
  >
    <img
      v-if="iconSrc"
      :src="iconSrc"
      :alt="modelId"
      class="block h-full w-full object-cover"
      draggable="false"
    />
    <CpuChipIcon
      v-else
      class="shrink-0"
      :style="{ width: `${iconSize}px`, height: `${iconSize}px` }"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CpuChipIcon } from '@heroicons/vue/24/outline'
import { resolveModelIcon } from '../../config/aiIcons'

const MODEL_FALLBACK_ICON_RATIO = 0.72
const MIN_MODEL_FALLBACK_ICON_SIZE = 10

const props = withDefaults(
  defineProps<{
    modelId?: string
    size?: number
  }>(),
  {
    size: 18,
  },
)

const iconSrc = computed(() => resolveModelIcon(props.modelId))
const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))
const iconSize = computed(() =>
  Math.max(MIN_MODEL_FALLBACK_ICON_SIZE, Math.round(props.size * MODEL_FALLBACK_ICON_RATIO)),
)
</script>
