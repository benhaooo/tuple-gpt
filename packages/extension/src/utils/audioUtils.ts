/**
 * 音频转录工具
 * 获取Bilibili音频并使用Whisper API转录成字幕
 */

import { SubtitleItem } from './subtitlesApi'

export interface TranscriptionOptions {
  whisperApiKey: string
  whisperApiEndpoint?: string
}

export interface TranscriptionResult {
  text: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

/**
 * 从Bilibili页面获取音频URL
 * @returns 音频URL和视频标题
 */
export async function getBilibiliAudioInfo(): Promise<{ audioUrl: string; title: string }> {
  try {
    // 获取页面HTML内容
    const html = document.getElementsByTagName('html')[0].innerHTML
    
    // 提取播放信息
    const playInfoMatch = html.match(/window\.__playinfo__=(.+?)<\/script/)
    if (!playInfoMatch || !playInfoMatch[1]) {
      throw new Error('无法找到视频播放信息')
    }
    
    const playInfo = JSON.parse(playInfoMatch[1])
    
    // 检查音频数据
    if (!playInfo.data?.dash?.audio || playInfo.data.dash.audio.length === 0) {
      throw new Error('该视频没有可用的音频流')
    }
    
    const audioUrl = playInfo.data.dash.audio[0].baseUrl
    if (!audioUrl) {
      throw new Error('无法获取音频URL')
    }
    
    // 获取视频标题
    const titleElement = document.querySelector('h1[title], .video-title, .bpx-player-top-title')
    let title = 'bilibili_audio'
    
    if (titleElement) {
      title = titleElement.textContent?.trim() || title
    } else {
      // 尝试从页面标题获取
      const pageTitle = document.title
      if (pageTitle && !pageTitle.includes('哔哩哔哩')) {
        title = pageTitle.replace(/\s*-\s*哔哩哔哩.*$/, '')
      }
    }
    
    // 清理文件名中的非法字符
    title = title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100)
    
    return { audioUrl, title }
  } catch (error) {
    console.error('获取Bilibili音频信息失败:', error)
    throw error
  }
}

/**
 * 获取Bilibili音频并转录为字幕
 * @param options 转录选项
 * @returns Promise<TranscriptionResult>
 */
export async function transcribeBilibiliAudio(options: TranscriptionOptions): Promise<TranscriptionResult> {
  try {
    const { audioUrl } = await getBilibiliAudioInfo()

    // 获取音频文件
    console.log('开始获取音频文件...')
    const response = await fetch(audioUrl)

    if (!response.ok) {
      throw new Error(`获取音频失败: ${response.status} ${response.statusText}`)
    }

    const audioBlob = await response.blob()

    // 转录音频
    console.log('开始音频转录...')
    return await transcribeAudioWithWhisper(audioBlob, {
      apiKey: options.whisperApiKey,
      apiEndpoint: options.whisperApiEndpoint || 'https://api.openai.com/v1/audio/transcriptions'
    })
  } catch (error) {
    console.error('音频转录失败:', error)
    throw error
  }
}

/**
 * 使用Whisper API转录音频
 * @param audioBlob 音频文件Blob
 * @param options API配置
 * @returns 转录结果
 */
export async function transcribeAudioWithWhisper(
  audioBlob: Blob, 
  options: { apiKey: string; apiEndpoint: string }
): Promise<TranscriptionResult> {
  try {
    // 创建FormData
    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.mp3')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')
    formData.append('timestamp_granularities[]', 'segment')
    
    // 调用Whisper API
    const response = await fetch(options.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`
      },
      body: formData
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Whisper API调用失败: ${response.status} ${response.statusText}\n${errorText}`)
    }
    
    const result = await response.json()
    
    return {
      text: result.text,
      segments: result.segments?.map((segment: any) => ({
        start: segment.start,
        end: segment.end,
        text: segment.text
      }))
    }
  } catch (error) {
    console.error('Whisper转录失败:', error)
    throw error
  }
}

/**
 * 将转录结果转换为字幕格式
 * @param transcriptionResult 转录结果
 * @returns 字幕数组
 */
export function transcriptionToSubtitles(transcriptionResult: TranscriptionResult): SubtitleItem[] {
  if (!transcriptionResult.segments || transcriptionResult.segments.length === 0) {
    // 如果没有分段信息，创建一个单一字幕项
    return [{
      time: '00:00',
      startTime: 0,
      endTime: 0,
      text: transcriptionResult.text || '转录内容为空'
    }]
  }

  return transcriptionResult.segments.map(segment => ({
    time: formatTime(segment.start),
    startTime: Math.round(segment.start * 1000), // 转换为毫秒并四舍五入
    endTime: Math.round(segment.end * 1000),     // 转换为毫秒并四舍五入
    text: segment.text.trim()
  }))
}

/**
 * 格式化时间为字幕时间格式
 * @param seconds 秒数
 * @returns 格式化的时间字符串
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}



/**
 * 验证Whisper API密钥格式
 * @param apiKey API密钥
 * @returns 是否有效
 */
export function validateWhisperApiKey(apiKey: string): boolean {
  return apiKey.startsWith('sk-') && apiKey.length > 20
}
