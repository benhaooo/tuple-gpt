import { SubtitleLanguageInfo, SubtitleItem } from '../utils/subtitlesApi'

/**
 * 初始化结果接口
 */
export interface InitializeResult {
  availableLanguages: SubtitleLanguageInfo[]
  videoTitle: string
  videoId: string
}

/**
 * 字幕管理器基类
 * 定义了所有字幕管理器的通用接口和行为
 * 采用返回值模式，不直接操作 store
 */
export abstract class BaseSubtitleManager {
  /**
   * 初始化字幕管理器
   * 只返回可用语言列表和视频标题，不加载具体字幕
   */
  abstract initialize(): Promise<InitializeResult>
  /**
   * 根据语言加载字幕
   * 返回字幕信息，由调用方决定如何处理
   */
  abstract loadSubtitlesByLanguage(language: SubtitleLanguageInfo): Promise<SubtitleItem[]>
}