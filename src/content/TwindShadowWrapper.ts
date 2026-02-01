import { defineCustomElement } from 'vue'
import { waitFor } from '@/utils/domUtils'
import restStyles from '@unocss/reset/tailwind.css?inline'
import themeStyles from '@/styles/variables.css?inline'

interface MyComponentElement extends HTMLElement {
  refresh: () => void;
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

export type InsertPosition = typeof InsertPosition[keyof typeof InsertPosition]

/**
 * 将自定义元素注入到页面中的指定容器
 * @param options 注入选项
 * @returns 返回挂载的自定义元素实例
 */
export async function injectCustomElement(options: {
  containerSelector: string,     // 容器选择器
  tagName: string,              // 自定义元素标签名
  component: any,               // 要注入的Vue组件
  elementId: string,            // 注入元素的ID
  position?: InsertPosition, // 插入位置
  targetElementSelector?: string, // 目标元素选择器（用于afterElement和beforeElement）
  styles?: Partial<CSSStyleDeclaration>, // 额外的样式
  props?: Record<string, any>,  // 传递给组件的属性
}) {
  const {
    containerSelector,
    tagName,
    component,
    elementId,
    position = InsertPosition.APPEND,
    targetElementSelector,
    styles = {
      position: 'relative',
      zIndex: '9999',
      pointerEvents: 'auto',
      ...options.styles
    },
    props = {}
  } = options

  if (!customElements.get(tagName)) {
    const CustomElement = defineCustomElement({
      ...component,
      styles: [
        ...component.styles,
        themeStyles,
        restStyles
      ],
      props: {
        ...component.props,
        ...Object.keys(props).reduce((acc, key) => {
          acc[key] = { type: null, default: () => props[key] }
          return acc
        }, {} as Record<string, any>)
      },
    })

    customElements.define(tagName, CustomElement)
  }

  const container = await waitFor(containerSelector)

  if (!container) return
  // 创建自定义元素的实例作为挂载点
  const mountPoint = document.createElement(tagName) as MyComponentElement
  mountPoint.id = elementId

  // 应用额外的样式
  Object.assign(mountPoint.style, styles)

  // 根据指定的位置插入元素
  switch (position) {
    case InsertPosition.PREPEND:
      container.prepend(mountPoint)
      break

    case InsertPosition.AFTER_ELEMENT:
      if (targetElementSelector) {
        const targetElement = container.querySelector(targetElementSelector)
        if (targetElement) {
          targetElement.after(mountPoint)
          break
        }
      }
      container.append(mountPoint)
      break

    case InsertPosition.BEFORE_ELEMENT:
      if (targetElementSelector) {
        const targetElement = container.querySelector(targetElementSelector)
        if (targetElement) {
          targetElement.before(mountPoint)
          break
        }
      }
      container.append(mountPoint)
      break

    case InsertPosition.APPEND:
    default:
      container.append(mountPoint)
      break
  }
  console.log(`[Tuple-GPT] Component injected with ID ${elementId} using Shadow DOM.`)

  return mountPoint
} 