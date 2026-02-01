import localforage from 'localforage'
import type { Store } from 'pinia'

// 配置 localforage
localforage.config({
  name: 'tuple-gpt-storage',
  storeName: 'pinia_stores'
})

/**
 * 序列化状态，移除不能被克隆的属性
 */
function serializeState(state: any): any {
  return JSON.parse(JSON.stringify(state))
}

/**
 * 纯 IndexedDB 持久化插件
 * 不使用 localStorage，直接操作 IndexedDB
 */
export function createIndexedDBPersistence() {
  return ({ store }: { store: Store }) => {
    const storeId = store.$id

    // 从 IndexedDB 恢复数据
    const restoreState = async () => {
      try {
        const savedState = await localforage.getItem<any>(storeId)
        if (savedState) {
          store.$patch(savedState)
        }
      } catch (error) {
        console.error(`[IndexedDB] 恢复 ${storeId} 状态失败:`, error)
      }
    }

    // 保存状态到 IndexedDB
    const saveState = async () => {
      try {
        const serializedState = serializeState(store.$state)
        await localforage.setItem(storeId, serializedState)
      } catch (error) {
        console.error(`[IndexedDB] 保存 ${storeId} 状态失败:`, error)
      }
    }

    // 初始化时恢复状态
    restoreState()

    // 监听状态变化并保存
    store.$subscribe(() => {
      saveState()
    }, { detached: true })
  }
}
