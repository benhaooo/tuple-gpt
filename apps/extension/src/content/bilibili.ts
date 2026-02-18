import SiderComponent from '@/content/views/SiderComponent.ce.vue'
import { injectCustomElement } from '@/content/TwindShadowWrapper'
import { VideoType } from '@/utils/subtitlesApi'
import {
  MessageType,
  type AudioTranscriptionCompleteMessage,
} from '@/utils/messages'
import {
  transcribeBilibiliAudio,
  transcriptionToSubtitles,
} from '@/utils/audioUtils'
import { onDOMReady } from '@/utils/domUtils'
import '@/styles/variables.css'
/**
 * 将Vue自定义元素注入到B站页面的指定位置。
 * 该元素会自动创建并使用Shadow DOM来隔离样式。
 * 目标：.right-container-inner内且在.up-panel-container后面（第二个位置）
 * @returns 返回组件实例
 */
async function injectComponent() {
  const elementId = 'tuple-gpt-bilibili'

  const mountPoint = await injectCustomElement({
    containerSelector: '.danmaku-wrap',
    tagName: 'tuple-gpt-sider',
    elementId: elementId,
    component: SiderComponent,
    position: 'prepend',
    targetElementSelector: '.danmaku-wrap',
    props: {
      platformType: VideoType.BILIBILI
    }
  })

  return mountPoint
}


// 处理音频转录请求
async function handleAudioTranscription(data: any) {
  console.log('[Tuple-GPT] 开始处理音频转录请求:', data)

  const transcriptionResult = await transcribeBilibiliAudio({
    whisperApiKey: data.whisperApiKey,
    whisperApiEndpoint: data.whisperApiEndpoint
  })

  console.log('[Tuple-GPT] 转录原始结果:', transcriptionResult)

  const subtitles = transcriptionToSubtitles(transcriptionResult)
  console.log('[Tuple-GPT] 转换后的字幕:', subtitles)

  // 发送转录完成消息
  const completeMessage: AudioTranscriptionCompleteMessage = {
    type: MessageType.AUDIO_TRANSCRIPTION_COMPLETE,
    data: {
      transcriptionResult,
      subtitles
    }
  }

  // 发送到所有监听器
  window.postMessage(completeMessage, '*')
  console.log('[Tuple-GPT] 音频转录完成，已发送', subtitles.length, '条字幕')
}

// 存储组件实例
let componentInstance: Awaited<ReturnType<typeof injectComponent>>

// 监听来自 background 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Tuple-GPT] 收到来自 background 的消息:', message)

  // 处理 URL 变化通知
  if (message.type === 'URL_CHANGE_NOTIFICATION') {
    console.log('[Tuple-GPT] URL 变化:', message.data?.url)
    componentInstance?.refresh()
  }

  sendResponse({ success: true })
  return true
})

onDOMReady(async () => {
  componentInstance = await injectComponent()
}) 