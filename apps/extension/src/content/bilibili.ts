import SiderComponent from '@/content/views/SiderComponent.ce.vue'
import { injectCustomElement } from '@/content/TwindShadowWrapper'
import { onDOMReady } from '@/utils/domUtils'
import {
  registerRpcHandlers,
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

async function handleAudioTranscription(data: BilibiliAudioTranscriptionRequest) {
  console.log('[Tuple-GPT] 开始处理音频转录请求:', data)

  const transcriptionResult = await transcribeBilibiliAudio({
    whisperApiKey: data.whisperApiKey,
    whisperApiEndpoint: data.whisperApiEndpoint,
  })

  const subtitles = transcriptionToSubtitles(transcriptionResult)

  console.log('[Tuple-GPT] 音频转录完成，已发送', subtitles.length, '条字幕')

  return {
    transcriptionResult,
    subtitles,
  }
}

let componentInstance: Awaited<ReturnType<typeof injectComponent>>

registerRpcHandlers({
  async transcribeBilibiliAudio(data) {
    return handleAudioTranscription(data)
  },

  notifyUrlChanged(data) {
    console.log('[Tuple-GPT] URL 变化:', data.url)
    componentInstance?.refresh()
  },
})

onDOMReady(async () => {
  componentInstance = await injectComponent()
})
