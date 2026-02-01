<script setup lang="ts">
import { ref, watch, nextTick} from 'vue'
import { VideoType } from '@/utils/subtitlesApi'
import { useSettingsStore } from '@/stores/settingsStore'
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
  CheckIcon,
  LinkIcon,
  SpeakerWaveIcon,
} from '@heroicons/vue/24/outline'
import {
  MessageType,
  sendMessageToBackground,
  type TranscribeBilibiliAudioMessage
} from '@/utils/messages'

const props = defineProps<{
  platformType: VideoType
  isLoading: boolean
  error: string | null
  subtitlesContent: string
  selectedSubtitle: any
  activeSubtitleIndex: number | null
}>()

const emit = defineEmits<{
  jumpToTime: [timeInMs: number]
  loadSubtitles: []
}>()

// 使用 defineModel 实现双向绑定
const autoScrollEnabled = defineModel<boolean>('autoScroll', { required: true })


// TODO: 双向绑定
// 视图状态
const internalError = ref<string | null>(props.error)
watch(
  () => props.error,
  (newVal) => {
    internalError.value = newVal
  }
)
const bilingualMode = ref(false)
const subtitlesRef = ref<HTMLElement | null>(null) // 字幕容器引用
const copySuccess = ref(false)
const isUserScrolling = ref(false) // 用户是否正在手动滚动
const userScrollTimer = ref<ReturnType<typeof setTimeout> | null>(null) // 用户滚动计时器

// 音频转录相关状态
const isTranscribing = ref(false)
const transcriptionProgress = ref('')

const settingsStore = useSettingsStore()


const toggleBilingual = () => {
  bilingualMode.value = !bilingualMode.value
}

const jumpToTime = (timeInMs: number) => {
  emit('jumpToTime', timeInMs)
}

const loadSubtitles = () => {
  emit('loadSubtitles')
}

// 处理用户手动滚动事件
const handleUserScroll = () => {
  // 标记用户正在手动滚动
  isUserScrolling.value = true

  // 清除之前的计时器
  if (userScrollTimer.value !== null) {
    clearTimeout(userScrollTimer.value)
  }

  // 设置新的计时器，1.5秒后恢复自动滚动
  userScrollTimer.value = setTimeout(() => {
    isUserScrolling.value = false
    userScrollTimer.value = null
  }, 1500)
}

// 滚动到当前字幕的函数
const scrollToCurrentSubtitle = (index: number) => {
  // 如果用户正在手动滚动，不执行自动滚动
  if (isUserScrolling.value) return

  const container = subtitlesRef.value
  if (!container) return

  const targetElement = container.querySelectorAll('.subtitle-item')[index] as HTMLElement
  if (!targetElement) return

  // 手动计算滚动位置以避免影响页面
  const containerRect = container.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()

  // 计算目标元素相对于容器的顶部偏移量
  const offsetTop = targetRect.top - containerRect.top

  // 计算使目标元素居中所需的滚动位置
  const newScrollTop = container.scrollTop + offsetTop - (container.clientHeight / 2) + (targetElement.clientHeight / 2)

  container.scrollTop = newScrollTop
}

// 复制文本到剪贴板
const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
    return Promise.resolve()
  } catch (err) {
    console.error('复制失败:', err)
    return Promise.reject(err)
  }
}

// 复制字幕功能
const copySubtitles = () => {
  if (props.subtitlesContent && props.subtitlesContent.trim() !== '') {
    copyToClipboard(props.subtitlesContent)
  }
}

// 转录音频功能
const transcribeAudio = async () => {
  if (props.platformType !== VideoType.BILIBILI) {
    alert('音频转录功能目前仅支持Bilibili')
    return
  }

  const settings = settingsStore.settings
  if (!settings.whisperApiKey) {
    alert('请先在设置中配置Whisper API Key')
    return
  }

  try {
    isTranscribing.value = true
    transcriptionProgress.value = '获取音频并开始转录...'

    // 发送转录消息到content script
    const message: TranscribeBilibiliAudioMessage = {
      type: MessageType.TRANSCRIBE_BILIBILI_AUDIO,
      data: {
        whisperApiKey: settings.whisperApiKey,
        whisperApiEndpoint: settings.whisperApiEndpoint
      }
    }

    await sendMessageToBackground(message)
  } catch (error) {
    console.error('转录音频失败:', error)
    transcriptionProgress.value = '转录失败: ' + (error as Error).message
    setTimeout(() => {
      transcriptionProgress.value = ''
      isTranscribing.value = false
    }, 3000)
  }
}

// 处理转录完成消息
const handleTranscriptionComplete = (data: any) => {
  transcriptionProgress.value = '转录完成'
  isTranscribing.value = false
  internalError.value = null // 清除错误状态，确保UI更新

  // 将转录字幕更新到store中，UI会自动响应
  if (data.subtitles && data.subtitles.length > 0) {
    console.log('转录字幕:', data.subtitles)

  }

  // 清除进度提示
  setTimeout(() => {
    transcriptionProgress.value = ''
  }, 2000)
}

// 处理转录错误消息
const handleTranscriptionError = (data: any) => {
  const errorMessage = '转录失败: ' + data.error
  transcriptionProgress.value = errorMessage
  isTranscribing.value = false
  internalError.value = errorMessage // 同时更新错误状态
  setTimeout(() => {
    transcriptionProgress.value = ''
  }, 3000)
}



// 监听当前激活的字幕索引变化，自动滚动到对应字幕
watch(() => props.activeSubtitleIndex, (newIndex) => {
  if (newIndex !== null && autoScrollEnabled.value) {
    nextTick(() => scrollToCurrentSubtitle(newIndex))
  }
})

// 注册消息监听器 (监听来自content script的postMessage)
window.addEventListener('message', (event) => {
  if (event.source !== window) return

  const message = event.data
  switch (message.type) {
    case MessageType.AUDIO_TRANSCRIPTION_COMPLETE:
      handleTranscriptionComplete(message.data)
      break
    case MessageType.AUDIO_TRANSCRIPTION_ERROR:
      handleTranscriptionError(message.data)
      break
  }
})
</script>

<template>
  <div>
    <!-- 字幕标题和双语切换 -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-base font-medium text-foreground">{{ platformType }}字幕</h2>
      <div class="flex items-center gap-2">
        <!-- 双语切换 -->
        <span class="text-sm text-foreground">双语</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" v-model="bilingualMode" class="sr-only peer" @change="toggleBilingual">
          <div
            class="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary">
          </div>
        </label>

        <!-- 自动滚动切换 -->
        <button @click="autoScrollEnabled = !autoScrollEnabled" class="p-2 rounded-lg hover:bg-accent"
          :title="autoScrollEnabled ? '已开启字幕跟随' : '已关闭字幕跟随'">
          <LinkIcon class="h-5 w-5" :class="[
            autoScrollEnabled ? 'text-primary' : 'text-muted-foreground',
            isUserScrolling && autoScrollEnabled ? 'animate-pulse' : ''
          ]" />
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="flex justify-center items-center py-10">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <!-- 错误提示 -->
    <div v-else-if="internalError" class="py-6 text-center">
      <div class="text-destructive mb-2">{{ internalError }}</div>
      <button @click="loadSubtitles"
        class="p-2 bg-primary text-primary-foreground rounded-md hover:brightness-110 flex items-center justify-center">
        <ArrowPathIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- 无字幕提示 -->
    <div v-else-if="!selectedSubtitle?.subtitles?.length" class="py-6 text-center">
      <div class="text-muted-foreground mb-2">未找到字幕</div>
      <button @click="loadSubtitles"
        class="p-2 bg-primary text-primary-foreground rounded-md hover:brightness-110 flex items-center justify-center">
        <ArrowPathIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- 字幕列表 -->
    <div v-else class="space-y-1 max-h-96 overflow-y-auto" style="scroll-behavior: smooth;" ref="subtitlesRef"
      @scroll="handleUserScroll">
      <div v-for="(subtitle, index) in selectedSubtitle?.subtitles || []"
        :key="`${subtitle.startTime}-${subtitle.endTime}`"
        class="flex gap-3 leading-relaxed py-1.5 px-2 rounded-md transition-colors duration-200 subtitle-item cursor-pointer"
        :class="[
          props.activeSubtitleIndex === index
            ? 'bg-accent'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        ]" @click="jumpToTime(subtitle.startTime)">
        <span class="font-mono w-12 flex-shrink-0" :class="[props.activeSubtitleIndex === index ? 'text-primary' : '']">{{
          subtitle.time }}</span>
        <div class="flex flex-col">
          <span>{{ subtitle.text }}</span>
          <span v-if="bilingualMode && subtitle.translatedText" class="text-muted-foreground/80 text-xs mt-1">
            {{ subtitle.translatedText }}
          </span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="mt-2 flex items-center gap-2">
      <!-- 复制按钮 -->
      <button @click="copySubtitles" class="p-2 rounded-lg hover:bg-accent" title="复制字幕">
        <CheckIcon v-if="copySuccess" class="h-5 w-5 text-green-500" />
        <ClipboardDocumentIcon v-else class="h-5 w-5 text-muted-foreground" />
      </button>

      <!-- 音频转录按钮 (仅Bilibili显示) -->
      <button v-if="platformType === VideoType.BILIBILI" @click="transcribeAudio" :disabled="isTranscribing"
        class="p-2 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed" title="转录音频为字幕">
        <div v-if="isTranscribing" class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        <SpeakerWaveIcon v-else class="h-5 w-5 text-muted-foreground" />
      </button>
    </div>

    <!-- 转录进度提示 -->
    <div v-if="transcriptionProgress" class="mt-2 text-sm text-muted-foreground">
      {{ transcriptionProgress }}
    </div>
  </div>
</template>

<style scoped></style>