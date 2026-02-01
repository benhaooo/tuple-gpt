import { injectCustomElement } from '@/content/TwindShadowWrapper'
import { VideoType } from '@/utils/subtitlesApi'
import SiderComponent from './views/SiderComponent.ce.vue'
import { onDOMReady } from '@/utils/domUtils'
import '@/styles/variables.css?inline'
console.log('[Tuple-GPT] YouTube content script loaded!')

/**
 * YouTube 页面注入逻辑
 */
export function initializeYouTube() {
  console.log('[Tuple-GPT] YouTube page detected')

  function mountSiderComponent() {
    const siderId = 'tuple-gpt-sider-ce'
    if (document.getElementById(siderId)) {
      return
  }
  
  injectCustomElement({
    containerSelector: '#secondary-inner',
    tagName: 'sider-component-ce',
    elementId: siderId,
    component: SiderComponent,
    position: 'prepend',
    props: {
        platformType: VideoType.YOUTUBE
      }
    })
  }

  // 等待播放器加载完成再注入
  const observer = new MutationObserver((mutations, obs) => {
    const playerContainer = document.querySelector('#movie_player')
    const siderContainer = document.querySelector('#secondary-inner')
    if (playerContainer && siderContainer) {
      mountSiderComponent()
      obs.disconnect()
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })

}

onDOMReady(() => {
  initializeYouTube()
})