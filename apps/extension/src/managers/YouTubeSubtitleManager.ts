import { BaseSubtitleManager, type InitializeResult } from './BaseSubtitleManager'
import {
  VideoType,
  type SubtitleLanguageInfo,
  getYouTubeSubtitles,
  getVideoId,
} from '../utils/subtitlesApi'

export class YouTubeSubtitleManager extends BaseSubtitleManager {
  private videoTitle = ''
  private currentVideoId: string | null = null

  async initialize(): Promise<InitializeResult> {
    this.currentVideoId = getVideoId(VideoType.YOUTUBE)

    if (!this.currentVideoId) {
      throw new Error('无法获取YouTube视频ID')
    }

    this.videoTitle = document.title.replace(' - YouTube', '').trim()

    console.log(`[Tuple-GPT] YouTube字幕初始化完成: ${this.videoTitle}`)

    return {
      availableLanguages: [
        { lan: 'auto', lan_doc: '自动', subtitle_url: '' },
      ],
      videoTitle: this.videoTitle,
      videoId: this.currentVideoId,
    }
  }

  async loadSubtitlesByLanguage(language: SubtitleLanguageInfo) {
    if (!this.currentVideoId) {
      throw new Error('视频ID未设置')
    }

    console.log(`[Tuple-GPT] 正在加载YouTube字幕: ${language.lan_doc}`)

    const subtitles = await getYouTubeSubtitles(
      this.currentVideoId,
      language.lan === 'auto' ? undefined : language.lan,
    )

    if (subtitles.length === 0) {
      throw new Error('无法获取字幕或该视频没有字幕')
    }

    console.log(`[Tuple-GPT] YouTube字幕加载完成: ${language.lan_doc}, 共 ${subtitles.length} 条字幕`)

    return subtitles
  }
}
