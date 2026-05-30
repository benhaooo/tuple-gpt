import { ref, computed, onMounted } from 'vue'
import { VideoType, SubtitleLanguageInfo, getVideoId } from '@/utils/subtitlesApi'
import { createSubtitleManager } from '@/managers/SubtitleManagerFactory'
import { useVideoTimeTracker } from '@/hooks/useVideoTimeTracker'

export function useVideoStore(platformType: VideoType) {
  const autoScroll = ref(true)
  const activeSubtitleIndex = ref<number | null>(null)
  const availableSubtitles = ref<SubtitleLanguageInfo[]>([])
  const selectedLanguage = ref<string>('')
  const videoTitle = ref('')
  const videoId = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentTime = ref(0)

  const subtitleManager = createSubtitleManager(platformType)

  const selectedSubtitle = computed(() =>
    availableSubtitles.value.find(sub => sub.lan === selectedLanguage.value),
  )

  const subtitlesContent = computed(
    () => selectedSubtitle.value?.subtitles?.map(item => item.text).join(' ') ?? '',
  )

  const tracker = useVideoTimeTracker({
    platformType,
    onUpdate: time => {
      currentTime.value = time
      if (autoScroll.value) updateActiveSubtitleIndex()
    },
  })

  async function loadSubtitlesFor(target: SubtitleLanguageInfo) {
    if (!subtitleManager) return
    isLoading.value = true
    error.value = null
    try {
      target.subtitles = await subtitleManager.loadSubtitlesByLanguage(target)
      // 字幕到位后立即重算高亮，否则要等到下一次 timeupdate 才生效。
      updateActiveSubtitleIndex()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isLoading.value = false
    }
  }

  // 切换到某个语言：选中 + 按需加载（已加载过则命中缓存）。
  // init 和用户操作都走这里，保证语义统一。
  async function selectLanguage(lan: string) {
    const target = availableSubtitles.value.find(s => s.lan === lan)
    if (!target) return
    selectedLanguage.value = lan
    if (target.subtitles?.length) return
    await loadSubtitlesFor(target)
  }

  async function initializeSubtitles() {
    if (!subtitleManager) return
    isLoading.value = true
    error.value = null

    try {
      const result = await subtitleManager.initialize()
      availableSubtitles.value = result.availableLanguages
      videoTitle.value = result.videoTitle
      videoId.value = result.videoId

      const first = result.availableLanguages[0]
      if (!first) return
      await selectLanguage(first.lan)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      isLoading.value = false
    }
  }

  // 仅在视频真的换了时才重新初始化；同一视频内的 URL 抖动（spm_id_from 等）忽略。
  async function refresh() {
    const nextId = getVideoId(platformType)
    if (!nextId || nextId === videoId.value) return
    await initializeSubtitles()
  }

  function updateActiveSubtitleIndex() {
    const subtitles = selectedSubtitle.value?.subtitles
    if (!subtitles?.length) return

    const time = currentTime.value
    const newIndex = subtitles.findIndex((subtitle, index, array) => {
      const start = subtitle.startTime / 1000
      const end = index < array.length - 1 ? array[index + 1].startTime / 1000 : start + 5
      return time >= start && time < end
    })

    if (newIndex !== -1 && newIndex !== activeSubtitleIndex.value) {
      activeSubtitleIndex.value = newIndex
    }
  }

  function jumpToTime(timeInMs: number) {
    tracker.jumpToTime(timeInMs / 1000)
  }

  onMounted(initializeSubtitles)

  return {
    autoScroll,
    activeSubtitleIndex,
    selectedLanguage,
    videoTitle,
    isLoading,
    error,
    availableSubtitles,
    subtitlesContent,
    selectedSubtitle,
    initializeSubtitles,
    refresh,
    selectLanguage,
    jumpToTime,
  }
}
