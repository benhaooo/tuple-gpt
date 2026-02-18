import { BaseSubtitleManager, InitializeResult } from './BaseSubtitleManager'
import {
  VideoType,
  SubtitleInfo,
  SubtitleLanguageInfo,
  getYouTubeSubtitles,
  getVideoId
} from '../utils/subtitlesApi'

/**
 * YouTube 字幕管理器
 * 专门处理 YouTube 平台的字幕逻辑
 */
export class YouTubeSubtitleManager extends BaseSubtitleManager {
  private videoTitle: string = ''
  private currentVideoId: string | null = null

  /**
   * 初始化 YouTube 字幕管理器
   * 只返回可用语言列表和视频标题，不加载具体字幕
   */
  async initialize(): Promise<InitializeResult> {
    try {

      this.currentVideoId = this.getVideoId()
      if (!this.currentVideoId) {
        throw new Error('无法获取YouTube视频ID')
      }

      // 获取视频标题
      this.videoTitle = document.title.replace(' - YouTube', '').trim()

      console.log(`[Tuple-GPT] YouTube字幕初始化完成: ${this.videoTitle}`)

      // YouTube 暂时返回一个默认语言选项
      return {
        availableLanguages: [
          { lan: 'auto', lan_doc: '自动', subtitle_url: '' }
        ],
        videoTitle: this.videoTitle
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error('[Tuple-GPT] YouTube字幕初始化失败:', errorMessage)
      throw error
    }
  }



  /**
   * 根据语言加载字幕
   * 返回字幕信息
   */
  async loadSubtitlesByLanguage(language: SubtitleLanguageInfo): Promise<SubtitleInfo> {
    if (!this.currentVideoId) {
      throw new Error('视频ID未设置')
    }

    try {
      console.log(`[Tuple-GPT] 正在加载YouTube字幕: ${language.lan_doc}`)

      const subtitles = await getYouTubeSubtitles(this.currentVideoId, language.lan === 'auto' ? undefined : language.lan)

      if (subtitles.length === 0) {
        throw new Error('无法获取字幕或该视频没有字幕')
      }

      const subtitleInfo: SubtitleInfo = {
        lang: language.lan,
        subtitles
      }

      console.log(`[Tuple-GPT] YouTube字幕加载完成: ${language.lan_doc}, 共 ${subtitles.length} 条字幕`)

      return subtitleInfo

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error(`[Tuple-GPT] 加载YouTube字幕失败: ${errorMessage}`)
      throw error
    }
  }

}