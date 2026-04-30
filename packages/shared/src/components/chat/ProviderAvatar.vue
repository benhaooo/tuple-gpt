<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-background"
    :style="avatarStyle"
    :title="provider.name"
  >
    <img
      v-if="iconSrc"
      :src="iconSrc"
      :alt="provider.name"
      class="block h-full w-full object-cover"
      draggable="false"
    />
    <span
      v-else
      class="flex h-full w-full items-center justify-center font-semibold leading-none"
      :style="{
        backgroundColor,
        color: foregroundColor,
        fontSize: `${Math.max(MIN_PROVIDER_INITIAL_FONT_SIZE, Math.round(size * PROVIDER_INITIAL_FONT_RATIO))}px`,
      }"
    >
      {{ initial }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Provider } from '@tuple-gpt/chat-core'
import { generateAvatarColor, getAvatarForegroundColor, getAvatarInitial } from '../../utils/avatar'
import { resolveProviderIcon } from '../../config/aiIcons'

const PROVIDER_INITIAL_FONT_RATIO = 0.46
const MIN_PROVIDER_INITIAL_FONT_SIZE = 10

const props = withDefaults(
  defineProps<{
    provider: Provider
    size?: number
  }>(),
  {
    size: 20,
  },
)

const iconSrc = computed(() => resolveProviderIcon(props.provider))
const initial = computed(() => getAvatarInitial(props.provider.name))
const backgroundColor = computed(() => generateAvatarColor(props.provider.name))
const foregroundColor = computed(() => getAvatarForegroundColor(backgroundColor.value))
const avatarStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))
</script>
