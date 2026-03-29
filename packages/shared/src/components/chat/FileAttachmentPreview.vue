<template>
  <div v-if="attachments.length > 0" class="px-1 py-2 w-full overflow-hidden">
    <ScrollArea class="w-full">
      <div class="flex items-center gap-2 flex-nowrap">
        <AttachmentPreviewItem
          v-for="att in attachments"
          :key="att.id"
          :title="att.title"
          :subtitle="att.fileSize ? formatFileSize(att.fileSize) : undefined"
          class="flex-shrink-0"
          @remove="removeFile(att.id)"
        >
          <template #icon>
            <img
              v-if="att.category === 'image' && att.base64Data"
              :src="`data:${att.mimeType};base64,${att.base64Data}`"
              :alt="att.title"
              class="h-8 w-8 flex-shrink-0 rounded object-cover"
            />
            <DocumentIcon v-else-if="att.category === 'pdf'" class="h-4 w-4 flex-shrink-0 text-red-500" />
            <DocumentTextIcon v-else class="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </template>
        </AttachmentPreviewItem>
      </div>
      <ScrollBar orientation="horizontal" class="hidden" />
    </ScrollArea>
  </div>
</template>

<script setup lang="ts">
import { DocumentIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'
import { ScrollArea, ScrollBar } from '../ui/scroll-area'
import { useFileAttachments } from '../../composables/useFileAttachments'
import AttachmentPreviewItem from './AttachmentPreviewItem.vue'

const { attachments, removeFile, formatFileSize } = useFileAttachments()
</script>
