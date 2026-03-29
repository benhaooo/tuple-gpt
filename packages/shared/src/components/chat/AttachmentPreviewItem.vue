<template>
  <div class="flex items-center gap-2 rounded-lg border bg-muted/50 px-2.5 py-2 hover:bg-muted transition-colors max-w-[200px]">
    <!-- Icon slot -->
    <slot name="icon" />

    <!-- Title + subtitle -->
    <div class="min-w-0 flex-1">
      <div class="truncate text-xs font-medium">{{ title }}</div>
      <div v-if="subtitle" class="text-[10px] text-muted-foreground">
        {{ subtitle }}
      </div>
    </div>

    <!-- Remove button -->
    <button
      @click="$emit('remove')"
      class="flex-shrink-0 rounded-full p-0.5 hover:bg-destructive/10 transition-colors"
      title="移除"
    >
      <XMarkIcon class="h-3 w-3 text-muted-foreground hover:text-destructive" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'

defineProps<{
  title: string
  subtitle?: string
}>()

defineEmits<{
  (e: 'remove'): void
}>()
</script>
