import { VideoType } from '../utils/subtitlesApi'
import { BaseSubtitleManager } from './BaseSubtitleManager'
import { YouTubeSubtitleManager } from './YouTubeSubtitleManager'
import { BilibiliSubtitleManager } from './BilibiliSubtitleManager'

/**
 * 字幕管理器工厂类
 * 根据平台类型创建对应的字幕管理器实例
 */
export class SubtitleManagerFactory {
  /**
   * 根据平台类型创建字幕管理器
   * @param platformType 平台类型
   * @returns 对应的字幕管理器实例
   */
  static createManager(platformType: VideoType): BaseSubtitleManager | null {
    switch (platformType) {
      case VideoType.YOUTUBE:
        return new YouTubeSubtitleManager()

      case VideoType.BILIBILI:
        return new BilibiliSubtitleManager()
    }
  }

}

/**
 * 便捷函数：创建字幕管理器
 * @param platformType 平台类型
 * @returns 对应的字幕管理器实例
 */
export function createSubtitleManager(platformType: VideoType): BaseSubtitleManager | null {
  return SubtitleManagerFactory.createManager(platformType)
}
