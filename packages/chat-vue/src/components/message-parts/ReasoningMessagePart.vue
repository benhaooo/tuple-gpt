<template>
  <details class="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
    <summary
      class="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-muted-foreground"
    >
      <LightBulbIcon class="h-3.5 w-3.5 shrink-0" />
      <span>思考摘要</span>
    </summary>
    <div class="mt-1.5 whitespace-pre-wrap break-words text-[11px] leading-5 text-muted-foreground">
      {{ summary }}
    </div>
  </details>
</template>

<script setup lang="ts">
import { LightBulbIcon } from '@heroicons/vue/24/outline'

defineProps<{
  summary: string
}>()
</script>
