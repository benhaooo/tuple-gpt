<template>
  <div class="group relative flex items-center">
    <Button
      v-if="!renaming"
      variant="ghost"
      class="h-9 w-full justify-start gap-2 px-3 text-sm font-normal group-hover:bg-accent group-hover:text-accent-foreground dark:group-hover:bg-accent/50"
      :class="(selected || menuOpen) && 'bg-accent text-accent-foreground hover:bg-accent'"
      @click="$emit('select')"
    >
      <ProviderAvatar :provider="provider" :size="18" />
      <span class="min-w-0 flex-1 truncate text-left">{{ provider.name }}</span>
      <span
        v-if="!custom || !menuOpen"
        class="ml-auto h-2 w-2 flex-shrink-0 rounded-full transition-opacity"
        :class="[
          provider.apiKey ? 'bg-emerald-500' : 'bg-muted-foreground/30',
          custom && 'group-hover:opacity-0',
        ]"
      />
    </Button>

    <div
      v-else
      class="flex h-9 w-full items-center gap-2 rounded-md border border-ring bg-background px-3 ring-[3px] ring-ring/50"
    >
      <ProviderAvatar :provider="provider" :size="18" />
      <input
        ref="renameInput"
        v-model="renameValue"
        class="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
        :maxlength="60"
        @keydown.enter.prevent="commit"
        @keydown.esc.prevent="$emit('rename-cancel')"
        @blur="commit"
      />
    </div>

    <DropdownMenu v-if="custom && !renaming" v-model:open="menuOpen">
      <DropdownMenuTrigger as-child>
        <Button
          variant="ghost"
          size="icon-sm"
          class="absolute right-1 size-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="更多操作"
        >
          <EllipsisHorizontalIcon class="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" class="min-w-32">
        <DropdownMenuItem @select="onRenameSelect">
          <PencilSquareIcon class="h-4 w-4" />
          重命名
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" @select="$emit('delete')">
          <TrashIcon class="h-4 w-4" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { EllipsisHorizontalIcon, PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { Provider } from '@tuple-gpt/chat-core'
import ProviderAvatar from './ProviderAvatar.vue'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tuple-gpt/ui-vue'

const props = withDefaults(
  defineProps<{
    provider: Provider
    selected?: boolean
    custom?: boolean
    renaming?: boolean
  }>(),
  { selected: false, custom: false, renaming: false },
)

const emit = defineEmits<{
  select: []
  'rename-start': []
  'rename-commit': [value: string]
  'rename-cancel': []
  delete: []
}>()

const menuOpen = ref(false)
const renameValue = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.renaming,
  async active => {
    if (active) {
      renameValue.value = props.provider.name
      await nextTick()
      renameInput.value?.focus()
      renameInput.value?.select()
    }
  },
)

function commit() {
  if (!props.renaming) return
  emit('rename-commit', renameValue.value)
}

function onRenameSelect() {
  menuOpen.value = false
  emit('rename-start')
}
</script>
