import SiderComponent from '@/content/views/SiderComponent.ce.vue'
import { injectCustomElement } from '@/content/TwindShadowWrapper'
import { onDOMReady } from '@/utils/domUtils'
import {
  registerRpcHandlers,
  transcriptionWindowMessageType,
  type AudioTranscriptionCompleteWindowMessage,
  type AudioTranscriptionErrorWindowMessage,
  type BilibiliAudioTranscriptionRequest,
} from '@/utils/messages'
import { VideoType } from '@/utils/subtitlesApi'
import {
  transcribeBilibiliAudio,
  transcriptionToSubtitles,
} from '@/utils/audioUtils'
import '@/styles/variables.css'

async function injectComponent() {
  const elementId = 'tuple-gpt-bilibili'

  const mountPoint = await injectCustomElement({
    containerSelector: '.danmaku-wrap',
    tagName: 'tuple-gpt-sider',
    elementId,
    component: SiderComponent,
    position: 'prepend',
    targetElementSelector: '.danmaku-wrap',
    props: {
      platformType: VideoType.BILIBILI,
    },
  })

  return mountPoint
}

function postTranscriptionComplete(message: AudioTranscriptionCompleteWindowMessage): void {
  window.postMessage(message, '*')
}

function postTranscriptionError(message: AudioTranscriptionErrorWindowMessage): void {
  window.postMessage(message, '*')
}

async function handleAudioTranscription(data: BilibiliAudioTranscriptionRequest): Promise<void> {
  console.log('[Tuple-GPT] 开始处理音频转录请求:', data)

  const transcriptionResult = await transcribeBilibiliAudio({
    whisperApiKey: data.whisperApiKey,
    whisperApiEndpoint: data.whisperApiEndpoint,
  })

  const subtitles = transcriptionToSubtitles(transcriptionResult)

  postTranscriptionComplete({
    type: transcriptionWindowMessageType.complete,
    data: {
      transcriptionResult,
      subtitles,
    },
  })

  console.log('[Tuple-GPT] 音频转录完成，已发送', subtitles.length, '条字幕')
}

let componentInstance: Awaited<ReturnType<typeof injectComponent>>

registerRpcHandlers({
  async transcribeBilibiliAudio(data) {
    try {
      await handleAudioTranscription(data)

      return { success: true }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : '音频转录失败'

      postTranscriptionError({
        type: transcriptionWindowMessageType.error,
        data: {
          error: message,
        },
      })

      return {
        success: false,
        error: message,
      }
    }
  },

  notifyUrlChanged(data) {
    console.log('[Tuple-GPT] URL 变化:', data.url)
    componentInstance?.refresh()

    return { success: true }
  },
})

onDOMReady(async () => {
  componentInstance = await injectComponent()
})
