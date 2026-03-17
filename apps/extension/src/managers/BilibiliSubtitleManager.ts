import { BaseSubtitleManager, type InitializeResult } from './BaseSubtitleManager'
import {
  VideoType,
  type SubtitleLanguageInfo,
  type VideoInfo,
  getVideoId,
  getBilibiliVideoInfo,
  getBilibiliAvailableLanguages,
  getBilibiliSubtitlesByUrl,
} from '../utils/subtitlesApi'

export class BilibiliSubtitleManager extends BaseSubtitleManager {
  private currentVideoId = ''
  private videoInfo: VideoInfo | null = null

  async initialize(): Promise<InitializeResult> {
    const nextVideoId = getVideoId(VideoType.BILIBILI)

    if (!nextVideoId) {
      throw new Error('无法获取Bilibili视频ID')
    }

    this.currentVideoId = nextVideoId
    this.videoInfo = await getBilibiliVideoInfo(this.currentVideoId)

    const availableLanguages = await getBilibiliAvailableLanguages(this.videoInfo)

    console.log(`[Tuple-GPT] B站字幕初始化完成: ${this.videoInfo.title}`)

    return {
      availableLanguages,
      videoTitle: this.videoInfo.title,
      videoId: this.currentVideoId,
    }
  }

  async loadSubtitlesByLanguage(subtitle: SubtitleLanguageInfo) {
    if (!subtitle.subtitle_url) {
      return []
    }

    return getBilibiliSubtitlesByUrl(subtitle.subtitle_url)
  }
}
