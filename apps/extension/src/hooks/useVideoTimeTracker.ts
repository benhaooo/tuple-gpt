/**
 * 视频时间追踪 Hook
 * 根据平台类型查找视频元素并监听时间变化
 */

import { onMounted, onUnmounted } from 'vue'
import { VideoType } from '@/utils/subtitlesApi'
import { waitForAny } from '@/utils/domUtils'

interface UseVideoTimeTrackerOptions {
  platformType: VideoType
  onUpdate?: (currentTime: number) => void
}

// 平台对应的视频选择器配置
const PLATFORM_SELECTORS: Record<VideoType, string[]> = {
  [VideoType.BILIBILI]: [
    '#bilibili-player video',
    '.bilibili-player-video video',
    '.bpx-player-video-wrap video',
    'video'
  ],
  [VideoType.YOUTUBE]: [
    'video',
    '.html5-main-video',
    '#movie_player video'
  ]
}

/**
 * 视频时间追踪 Hook
 * @param options 配置选项
 * @returns 返回控制函数
 */
export function useVideoTimeTracker(options: UseVideoTimeTrackerOptions) {

  let videoElement: HTMLVideoElement | null = null
  let timeUpdateHandler: (() => void) | null = null

  /**
   * 设置视频元素的事件监听
   */
  function setupVideoListeners(element: HTMLVideoElement) {
    // 监听视频时间更新
    timeUpdateHandler = () => {
        options.onUpdate?.(element.currentTime)
    }

    element.addEventListener('timeupdate', timeUpdateHandler)
  }

  /**
   * 初始化视频时间追踪
   */
  async function initialize() {
    if (!options.platformType) return

    const selectors = PLATFORM_SELECTORS[options.platformType]

    if (!selectors) {
      return
    }

    const result = await waitForAny<HTMLVideoElement>(selectors, 30000)

    if (result && result.element) {
      videoElement = result.element
      setupVideoListeners(videoElement)
    }
  }

  /**
   * 跳转到指定时间
   * @param time 目标时间（秒）
   */
  function jumpToTime(time: number) {
    if (videoElement) {
      videoElement.currentTime = time
    }
  }

  /**
   * 清理资源（在组件卸载时调用）
   */
  function cleanup() {
    if (videoElement && timeUpdateHandler) {
      videoElement.removeEventListener('timeupdate', timeUpdateHandler)
    }
    videoElement = null
    timeUpdateHandler = null
  }

  
  // onMounted 时自动初始化
  onMounted(() => {
    if (options.platformType) {
      initialize()
    }
  })

  // onUnmounted 时自动清理
  onUnmounted(() => {
    cleanup()
  })

  return {
    jumpToTime,
  }
}