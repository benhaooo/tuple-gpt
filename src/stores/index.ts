import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import localforage from 'localforage'
import { useAssistantsStore } from './modules/assistants'
import { useMessagesStore } from './modules/messages'

localforage.config({
  name: 'tuple-gpt-storage',
  storeName: 'pinia_stores'
})

/**
 * Custom storage engine using localforage to persist to IndexedDB.
 * This can be used in individual stores like this:
 *
 * import { defineStore } from 'pinia'
 * import { indexedDBStorage } from '@/stores'
 *
 * export const useMyStore = defineStore('my-store', {
 *   // ...
 *   persist: {
 *     storage: indexedDBStorage,
 *   },
 * });
 */
export const indexedDBStorage = {
  async setItem(key: string, value: string) {
    await localforage.setItem(key, value)
  },
  getItem(key: string) {
    return localforage.getItem(key)
  },
  async removeItem(key: string) {
    await localforage.removeItem(key)
  }
}

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

export default pinia

export {
  useAssistantsStore,
  useMessagesStore
}
