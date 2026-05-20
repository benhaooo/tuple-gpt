<template>
  <div class="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 space-y-2">
    <div class="flex items-center gap-1.5 text-xs font-medium text-amber-700">
      <ChatBubbleLeftRightIcon class="h-3.5 w-3.5 shrink-0" />
      <span>Agent 在等你回答</span>
    </div>

    <p v-if="question" class="text-sm whitespace-pre-wrap break-words text-foreground">
      {{ question }}
    </p>

    <template v-if="!resolved">
      <div v-if="options.length" class="flex flex-wrap gap-1.5">
        <Button
          v-for="opt in options"
          :key="opt"
          size="sm"
          variant="outline"
          class="h-7 px-2.5 text-xs"
          :disabled="submitting"
          @click="submit(opt)"
        >
          {{ opt }}
        </Button>
      </div>

      <div v-else class="flex items-end gap-1.5">
        <Textarea
          v-model="freeText"
          rows="2"
          placeholder="输入你的回答..."
          class="min-h-[56px] flex-1 resize-none text-sm"
          :disabled="submitting"
          @keydown.enter.exact.prevent="submitFreeText"
        />
        <Button
          size="sm"
          class="h-8 px-3 text-xs"
          :disabled="submitting || !freeText.trim()"
          @click="submitFreeText"
        >
          提交
        </Button>
      </div>
    </template>

    <p v-else class="text-xs text-muted-foreground">已回答：{{ resolvedAnswer }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import { Button, Textarea } from '@tuple-gpt/ui-vue'

const props = defineProps<{
  toolCallId: string
  arguments: string
  result?: string
}>()

const emit = defineEmits<{
  (e: 'submit', payload: { toolCallId: string; result: string }): void
}>()

const parsedArgs = computed(() => {
  try {
    return JSON.parse(props.arguments) as { question?: string; options?: string[] }
  } catch {
    return {}
  }
})

const question = computed(() => parsedArgs.value.question ?? '')
const options = computed(() => parsedArgs.value.options ?? [])
const resolved = computed(() => props.result !== undefined)
const resolvedAnswer = computed(() => props.result ?? '')

const freeText = ref('')
const submitting = ref(false)

function submit(answer: string) {
  if (submitting.value) return
  submitting.value = true
  emit('submit', { toolCallId: props.toolCallId, result: answer })
}

function submitFreeText() {
  const trimmed = freeText.value.trim()
  if (!trimmed) return
  submit(trimmed)
}
</script>
