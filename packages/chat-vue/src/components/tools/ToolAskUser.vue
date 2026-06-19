<template>
  <div
    class="overflow-hidden rounded-3xl border bg-background/80 p-2 shadow-lg transition-all animate-slide-up-fade-in"
    :class="resolved ? 'border-input' : 'border-primary'"
  >
    <!-- 问题内容 -->
    <div class="px-3 pt-2 pb-2">
      <p v-if="question" class="text-sm whitespace-pre-wrap break-words text-foreground">
        {{ question }}
      </p>
    </div>

    <!-- 交互区域 -->
    <div class="px-3 pb-2">
      <template v-if="!resolved">
        <!-- 选项按钮 -->
        <div v-if="options.length" class="flex flex-wrap gap-2">
          <Button
            v-for="opt in options"
            :key="opt"
            size="default"
            variant="outline"
            class="h-9 px-4"
            :disabled="submitting"
            @click="submit(opt)"
          >
            {{ opt }}
          </Button>
        </div>

        <!-- 自由输入 -->
        <div v-else class="space-y-2">
          <Textarea
            v-model="freeText"
            rows="1"
            placeholder="输入你的回答..."
            class="min-h-20 max-h-56 w-full resize-none overflow-y-auto rounded-2xl border-0 bg-transparent px-3 pt-3 pb-2 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
            :disabled="submitting"
            @keydown.enter.exact.prevent="submitFreeText"
          />
          <div class="flex justify-end px-1 py-1">
            <Button
              size="icon-sm"
              class="size-8 rounded-full"
              :disabled="submitting || !freeText.trim()"
              @click="submitFreeText"
            >
              <PaperAirplaneIcon class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </template>

      <!-- 已回答状态 -->
      <p v-else class="text-sm text-muted-foreground">已回答：{{ resolvedAnswer }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { PaperAirplaneIcon } from '@heroicons/vue/24/solid'
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

<style scoped>
@keyframes slide-up-fade-in {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up-fade-in {
  animation: slide-up-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
