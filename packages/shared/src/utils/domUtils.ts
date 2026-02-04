/**
 * DOM 操作工具函数
 */

/**
 * Promise-based 等待元素出现
 * @param selector CSS 选择器
 * @param timeout 超时时间（毫秒），默认 10000ms
 * @param parent 父元素，默认为 document
 * @returns Promise<T | null> 返回找到的元素，超时则返回 null
 */
export function waitFor<T extends Element>(
  selector: string,
  timeout: number = 10000,
  parent: Element | Document = document
): Promise<T | null> {
  return new Promise((resolve) => {
    // 首先检查元素是否已经存在
    const existingElement = parent.querySelector(selector)
    if (existingElement) {
      resolve(existingElement as T)
      return
    }

    let timeoutId: NodeJS.Timeout

    // 创建 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations, obs) => {
      const element = parent.querySelector(selector)
      if (element) {
        clearTimeout(timeoutId)
        obs.disconnect()
        resolve(element as T)
      }
    })

    // 设置超时，超时后返回 null
    timeoutId = setTimeout(() => {
      observer.disconnect()
      resolve(null)
    }, timeout)

    // 开始观察
    observer.observe(parent, {
      childList: true,
      subtree: true
    })
  })
}

/**
 * 等待多个选择器中的任意一个元素出现
 * @param selectors CSS 选择器数组
 * @param timeout 超时时间（毫秒），默认 10000ms
 * @param parent 父元素，默认为 document
 * @returns Promise<{element: T | null, selector: string | null}> 返回找到的元素和对应的选择器，超时则返回 { element: null, selector: null }
 */
export function waitForAny<T extends Element>(
  selectors: string[],
  timeout: number = 10000,
  parent: Element | Document = document
): Promise<{element: T | null, selector: string | null}> {
  return new Promise((resolve) => {
    // 首先检查是否有元素已经存在
    for (const selector of selectors) {
      const existingElement = parent.querySelector(selector)
      if (existingElement) {
        resolve({ element: existingElement as T, selector })
        return
      }
    }

    let timeoutId: NodeJS.Timeout

    // 创建 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations, obs) => {
      for (const selector of selectors) {
        const element = parent.querySelector(selector)
        if (element) {
          clearTimeout(timeoutId)
          obs.disconnect()
          resolve({ element: element as T, selector })
          return
        }
      }
    })

    // 设置超时，超时后返回 null
    timeoutId = setTimeout(() => {
      observer.disconnect()
      resolve({ element: null, selector: null })
    }, timeout)

    // 开始观察
    observer.observe(parent, {
      childList: true,
      subtree: true
    })
  })
}

/**
 * 等待 DOM 加载完成后执行回调
 * @param callback 回调函数
 */
export function onDOMReady(callback: () => void) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true })
  } else {
    callback()
  }
}