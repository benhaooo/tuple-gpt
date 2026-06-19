import { createApp, type App, type ComponentPublicInstance } from 'vue'
import { waitFor } from '@/utils/domUtils'
import restStyles from '@unocss/reset/tailwind.css?inline'
import themeStyles from '@tuple-gpt/theme/uno.css?inline'
import { createPinia } from 'pinia'
import { piniaChormeStorage } from '@/plugin/pinia-chrome-storage'

interface ShadowAppHostElement extends HTMLElement {
  refresh: () => void
  __tupleGptApp?: App
}

/**
 * 元素插入位置枚举
 */
export const InsertPosition = {
  APPEND: 'append',
  PREPEND: 'prepend',
  AFTER_ELEMENT: 'afterElement',
  BEFORE_ELEMENT: 'beforeElement',
} as const

export type InsertPosition = (typeof InsertPosition)[keyof typeof InsertPosition]

/**
 * 将自定义元素注入到页面中的指定容器
 * @param options 注入选项
 * @returns 返回挂载的自定义元素实例
 */
export async function injectCustomElement(options: {
  containerSelector: string // 容器选择器
  tagName: string // 自定义元素标签名
  component: any // 要注入的Vue组件
  elementId: string // 注入元素的ID
  position?: InsertPosition // 插入位置
  targetElementSelector?: string // 目标元素选择器（用于afterElement和beforeElement）
  hostStyles?: Partial<CSSStyleDeclaration> // 应用到宿主元素的额外样式
  props?: Record<string, any> // 传递给组件的属性
}) {
  const {
    containerSelector,
    tagName,
    component,
    elementId,
    position = InsertPosition.APPEND,
    targetElementSelector,
    hostStyles = {
      position: 'relative',
      zIndex: '9999',
      pointerEvents: 'auto',
      ...options.hostStyles,
    },
    props = {},
  } = options

  const container = await waitFor(containerSelector)

  if (!container) return
  const existingHostElement = document.getElementById(elementId) as ShadowAppHostElement | null
  if (existingHostElement) return existingHostElement

  // 创建自定义元素的实例作为挂载点
  const hostElement = document.createElement(tagName) as ShadowAppHostElement
  hostElement.id = elementId

  // 应用额外的样式
  Object.assign(hostElement.style, hostStyles)

  // 根据指定的位置插入元素
  switch (position) {
    case InsertPosition.PREPEND:
      container.prepend(hostElement)
      break

    case InsertPosition.AFTER_ELEMENT:
      if (targetElementSelector) {
        const targetElement = container.querySelector(targetElementSelector)
        if (targetElement) {
          targetElement.after(hostElement)
          break
        }
      }
      container.append(hostElement)
      break

    case InsertPosition.BEFORE_ELEMENT:
      if (targetElementSelector) {
        const targetElement = container.querySelector(targetElementSelector)
        if (targetElement) {
          targetElement.before(hostElement)
          break
        }
      }
      container.append(hostElement)
      break

    case InsertPosition.APPEND:
    default:
      container.append(hostElement)
      break
  }

  const shadowRoot = hostElement.attachShadow({ mode: 'open' })
  const shadowRootStyleTexts = [...(component.styles ?? []), themeStyles, restStyles].flat()
  for (const styleText of shadowRootStyleTexts) {
    const style = document.createElement('style')
    style.textContent = styleText
    shadowRoot.append(style)
  }

  const appRoot = document.createElement('div')
  appRoot.style.height = '100%'
  shadowRoot.append(appRoot)

  const app = createApp(component, props)
  const pinia = createPinia()
  pinia.use(piniaChormeStorage)
  app.use(pinia)

  const exposedComponent = app.mount(appRoot) as ComponentPublicInstance & {
    refresh?: () => void
  }
  hostElement.__tupleGptApp = app
  hostElement.refresh = () => exposedComponent.refresh?.()

  console.log(`[Tuple-GPT] Component injected with ID ${elementId} using Shadow DOM.`)

  return hostElement
}
