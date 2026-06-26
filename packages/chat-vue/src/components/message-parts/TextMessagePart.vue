<template>
  <div class="space-y-2">
    <MarkdownRenderer :content="text" />
    <div v-if="citations.length" class="flex flex-wrap gap-1.5">
      <a
        v-for="citation in citations"
        :key="formatCitationKey(citation)"
        :href="citation.url"
        target="_blank"
        rel="noreferrer"
        class="inline-flex max-w-full items-center gap-1 rounded-md border border-border/55 bg-background/65 px-1.5 py-0.5 text-[11px] leading-5 text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground"
        :title="citation.url"
      >
        <LinkIcon class="h-3 w-3 shrink-0 opacity-70" />
        <span class="truncate">{{ formatCitationLabel(citation) }}</span>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { LinkIcon } from '@heroicons/vue/24/outline'
import { MarkdownRenderer } from '@tuple-gpt/ai-ui'
import { formatCitationKey, formatCitationLabel } from './citation'
import type { Citation } from './types'

defineProps<{
  text: string
  citations: Citation[]
}>()
</script>
