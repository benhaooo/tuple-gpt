/**
 * 获取B站视频的可用字幕语言列表
 * @param videoInfo 视频信息
 * @returns 可用语言列表
 */
export async function getBilibiliAvailableLanguages(videoInfo: VideoInfo): Promise<SubtitleLanguageInfo[]> {
  // 使用aid和cid获取字幕列表
  const subtitleListResponse = await fetch(
    `https://api.bilibili.com/x/player/wbi/v2?aid=${videoInfo.aid}&cid=${videoInfo.cid}`,
    { credentials: 'include' }
  )
  const subtitleListData = await subtitleListResponse.json()

  const subtitlesInfo = subtitleListData.data.subtitle.subtitles

  // 提取所有可用语言
  const availableLanguages: SubtitleLanguageInfo[] = subtitlesInfo.map((item: any) => ({
    lan: item.lan,
    lan_doc: item.lan_doc,
    subtitle_url: item.subtitle_url
  }))

  return availableLanguages
}

/**
 * 根据字幕URL获取B站字幕内容
 * @param subtitleUrl 字幕URL
 * @returns 字幕信息
 */
export async function getBilibiliSubtitlesByUrl(
  subtitleUrl: string,
): Promise<SubtitleItem[]> {
  try {
    // 处理URL格式
    let url = subtitleUrl
    if (url.startsWith('//')) {
      url = 'https:' + url
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`网络请求失败: ${response.status}`)
    }

    const subtitleData = await response.json()

    if (!subtitleData.body) {
      throw new Error('字幕内容为空')
    }

    // 转换为统一的字幕格式
    const subtitles = subtitleData.body.map((item: any) => ({
      time: formatTime(item.from),
      startTime: item.from * 1000,
      endTime: item.to * 1000,
      text: item.content
    }))

    return subtitles
  } catch (error) {
    console.error('获取B站字幕内容失败:', error)
    throw error
  }
}

/**
 * 字幕API工具类
 * 用于获取YouTube和Bilibili视频的字幕
 */

// 字幕项接口定义
export interface SubtitleItem {
  time: string; // 时间点 (格式: mm:ss)
  startTime: number; // 开始时间 (毫秒)
  endTime: number; // 结束时间 (毫秒)
  text: string; // 字幕文本
  translatedText?: string; // 翻译后的字幕文本 (可选，用于双语字幕)
}

// 字幕语言信息接口
export interface SubtitleLanguageInfo {
  lan: string; // 语言代码
  lan_doc: string; // 语言描述
  subtitle_url?: string; // 字幕文件URL
  subtitles?: SubtitleItem[];
}

// 带语言信息的字幕接口
export interface SubtitleInfo {
  lang: string; // 当前字幕语言代码
  subtitles: SubtitleItem[]; // 字幕列表
}

// 视频类型
export const VideoType = {
  YOUTUBE: 'youtube',
  BILIBILI: 'bilibili',
} as const;

export type VideoType = typeof VideoType[keyof typeof VideoType];

// 视频信息接口
export interface VideoInfo {
  aid: number;
  bvid: string;
  cid: number;
  title: string;
  pages: any[];
  currentPage: number;
  author?: string;
  ctime?: number;
}

/**
 * 获取当前页面的视频ID
 * @param platform 平台类型
 * @returns 视频ID
 */
export function getVideoId(platform: VideoType): string | null {
  const url = new URL(window.location.href)

  switch (platform) {
    case VideoType.YOUTUBE:
      return url.searchParams.get('v')
    case VideoType.BILIBILI:
      // 同时匹配 /video/BV1xxx/ 和 /video/BV1xxx 两种格式
      const match = url.pathname.match(/\/video\/([^\/]+)/)
      return match ? match[1] : null
    default:
      return null
  }
}

/**
 * 格式化时间为字幕显示格式 (mm:ss)
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [
    mins.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ];

  if (hours > 0) {
    parts.unshift(hours.toString().padStart(2, '0'));
  }

  return parts.join(':');
}

/**
 * 从YouTube获取字幕
 * @param videoId YouTube视频ID
 * @param language 指定语言代码(可选)
 * @returns 字幕数组Promise
 */
export async function getYouTubeSubtitles(videoId: string, language?: string): Promise<SubtitleItem[]> {
  try {
    // 第一步：获取logId
    const saveSubtitleLogUrl = `https://crx-api.savev.co/v2/oversea-extension/subtitle/saveSubtitleLog?url=https://www.youtube.com/watch?v=${videoId}`
    const saveResponse = await fetch(saveSubtitleLogUrl)
    const saveData = await saveResponse.json()

    if (saveData.code !== 0 || !saveData.data) {
      throw new Error('获取字幕logId失败')
    }

    const logId = saveData.data

    // 第二步：解析字幕信息
    const parseUrl = `https://crx-api.savev.co/v2/oversea-extension/subtitle/parse?logId=${logId}`
    const parseResponse = await fetch(parseUrl)
    const parseData = await parseResponse.json()

    if (parseData.code !== 0 || !parseData.data || !parseData.data.srt) {
      throw new Error('解析字幕信息失败')
    }

    // 字幕语言优先级
    const languagePriority = ['zh-Hans', 'zh-Hant', 'en', 'English (auto-generated)']

    // 所有可用语言
    const availableLanguages = Object.keys(parseData.data.srt)

    // 确定要使用的语言
    let selectedLanguage: string | null = null

    // 如果指定了语言，则尝试查找
    if (language) {
      // 检查是否有精确匹配
      if (availableLanguages.includes(language)) {
        selectedLanguage = language
      } else {
        // 检查是否有部分匹配（例如zh-Hans可能匹配Chinese (Simplified)）
        const partialMatch = availableLanguages.find(lang =>
          lang.toLowerCase().includes(language.toLowerCase())
        )
        if (partialMatch) {
          selectedLanguage = partialMatch
        }
      }
    }

    // 如果没有找到指定语言，按优先级查找
    if (!selectedLanguage) {
      for (const priority of languagePriority) {
        // 精确匹配
        if (availableLanguages.includes(priority)) {
          selectedLanguage = priority
          break
        }

        // 部分匹配
        const partialMatch = availableLanguages.find(lang =>
          lang.toLowerCase().includes(priority.toLowerCase())
        )
        if (partialMatch) {
          selectedLanguage = partialMatch
          break
        }
      }
    }

    // 如果仍然没有找到，使用第一个可用语言
    if (!selectedLanguage && availableLanguages.length > 0) {
      selectedLanguage = availableLanguages[0]
    }

    if (!selectedLanguage) {
      throw new Error('没有找到可用的字幕')
    }

    // 第三步：下载字幕内容
    const subtitleUrl = parseData.data.srt[selectedLanguage]
    const subtitleResponse = await fetch(subtitleUrl)
    const srtContent = await subtitleResponse.text()

    // 解析SRT格式的字幕
    return parseSrt(srtContent)
  } catch (error) {
    console.error('获取YouTube字幕失败:', error)
    throw error // 抛出错误让上层Hook处理
  }
}

/**
 * 解析SRT格式的字幕内容
 * @param srtContent SRT格式的字幕文本
 * @returns 解析后的字幕项数组
 */
function parseSrt(srtContent: string): SubtitleItem[] {
  const subtitles: SubtitleItem[] = []

  // 将内容按空行分割，每个块包含一个字幕项
  const blocks = srtContent.trim().split(/\r?\n\r?\n/)

  for (const block of blocks) {
    const lines = block.split(/\r?\n/)

    // 忽略少于3行的块（必须包含序号、时间和文本）
    if (lines.length < 3) continue

    // 第二行包含时间信息，格式为: 00:00:00,000 --> 00:00:00,000
    const timeLine = lines[1]
    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/)

    if (!timeMatch) continue

    const startTimeStr = timeMatch[1]
    const endTimeStr = timeMatch[2]

    // 转换SRT时间格式为毫秒
    const startTime = srtTimeToMs(startTimeStr)
    const endTime = srtTimeToMs(endTimeStr)

    // 从第三行开始的所有行都是字幕文本
    const text = lines.slice(2).join('\n')

    subtitles.push({
      time: formatSrtTime(startTimeStr),
      startTime,
      endTime,
      text
    })
  }

  return subtitles
}

/**
 * 将SRT格式的时间（00:00:00,000）转换为毫秒
 */
function srtTimeToMs(timeStr: string): number {
  const [time, ms] = timeStr.split(',')
  const [hours, minutes, seconds] = time.split(':').map(Number)

  return (hours * 3600 + minutes * 60 + seconds) * 1000 + parseInt(ms)
}

/**
 * 格式化SRT时间为显示用的时间字符串
 */
function formatSrtTime(timeStr: string): string {
  // 将00:00:00,000格式转换为00:00
  const [time] = timeStr.split(',')
  const [hours, minutes] = time.split(':')

  return `${hours}:${minutes}`
}

/**
 * 获取B站视频信息
 * @param bvid 视频BV号
 * @returns 视频信息
 */
export async function getBilibiliVideoInfo(bvid: string): Promise<VideoInfo> {
  try {
    // 获取视频完整信息，包括所有分p
    const viewResponse = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, { credentials: 'include' });
    const viewData = await viewResponse.json();

    if (viewData.code !== 0) {
      throw new Error(`获取视频信息失败: ${viewData.message}`);
    }

    const data = viewData.data;
    const aid = data.aid;
    const pages = data.pages;
    const author = data.owner?.name;
    const ctime = data.ctime;
    const title = data.title;

    // 根据URL的'p'参数确定当前分p
    const urlSearchParams = new URLSearchParams(window.location.search);
    const p = parseInt(urlSearchParams.get('p') || '1');
    const currentPageInfo = pages.find(item => item.page === p) || pages[0];
    const cid = currentPageInfo ? currentPageInfo.cid : data.cid;

    if (!cid) {
      throw new Error('无法确定视频的CID');
    }

    return {
      aid,
      bvid,
      cid,
      title,
      pages,
      currentPage: p,
      author,
      ctime
    };
  } catch (error) {
    console.error('获取Bilibili视频信息失败:', error);
    throw error; // 抛出错误让上层Hook处理
  }
}

/**
 * 获取B站特定分P的字幕语言列表（不加载具体字幕内容）
 * @param videoInfo 视频信息
 * @returns 可用语言列表
 * @deprecated 建议使用 getBilibiliAvailableLanguages
 */
export async function getBilibiliSubtitlesByCid(videoInfo: VideoInfo): Promise<SubtitleLanguageInfo[]> {
  return getBilibiliAvailableLanguages(videoInfo)
}

/**
 * 翻译字幕（示例实现）
 * 实际使用时可以替换为真实的翻译API
 * @param subtitles 原字幕数组
 * @param targetLanguage 目标语言代码
 * @returns 带翻译的字幕数组
 */
export async function translateSubtitles(
  subtitles: SubtitleItem[],
  targetLanguage: string
): Promise<SubtitleItem[]> {
  // 实际项目中，这里应该调用翻译API
  // 例如Google翻译、百度翻译、有道翻译等

  // 这里使用模拟的翻译结果
  return subtitles.map(subtitle => ({
    ...subtitle,
    translatedText: `[译] ${subtitle.text}` // 模拟翻译结果
  }))
}

/**
 * 从Bilibili获取字幕（保留向后兼容）
 * @param bvid Bilibili视频BV号
 * @returns 字幕数组Promise
 * @deprecated 建议使用 getBilibiliAvailableLanguages + getBilibiliSubtitlesByUrl
 */
export async function getBilibiliSubtitles(bvid: string): Promise<SubtitleItem[]> {
  const videoInfo = await getBilibiliVideoInfo(bvid)
  if (!videoInfo) {
    return []
  }
  const availableLanguages = await getBilibiliSubtitlesByCid(videoInfo)
  if (availableLanguages.length === 0) {
    return []
  }
  // 获取第一个语言的字幕
  const firstLanguage = availableLanguages[0]
  if (!firstLanguage.subtitle_url) {
    return []
  }
  const subtitleInfo = await getBilibiliSubtitlesByUrl(firstLanguage.subtitle_url, firstLanguage.lan)
  return subtitleInfo.subtitles
}

/**
 * 根据字幕URL获取字幕信息
 * @param subtitleUrl 字幕文件URL
 * @param languageCode 语言代码
 * @returns 字幕信息Promise
 */
export async function getSubtitlesByUrl(
  subtitleUrl: string,
  languageCode: string
): Promise<SubtitleInfo> {
  try {
    // 处理URL格式
    let url = subtitleUrl
    if (url.startsWith('//')) {
      url = 'https:' + url
    }
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://')
    }

    // 获取字幕内容
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch subtitles: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.body) {
      throw new Error('字幕内容为空')
    }

    // 转换为统一的字幕格式
    const subtitles: SubtitleItem[] = data.body.map((item: any) => ({
      time: formatTime(item.from),
      startTime: item.from * 1000,
      endTime: item.to * 1000,
      text: item.content
    }))

    return {
      lang: languageCode,
      subtitles
    }
  } catch (error) {
    console.error('获取字幕内容失败:', error)
    throw new Error(`获取字幕失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}