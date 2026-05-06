import type { ChatStorage, ChatStorageSnapshot } from '@tuple-gpt/chat-core'

export interface ChromeChatStorageOptions {
  key?: string
  sync?: boolean
}

export function createChromeChatStorage(options: ChromeChatStorageOptions = {}): ChatStorage {
  const key = options.key ?? 'conversations'
  const storageNamespace = options.sync ? 'sync' : 'local'

  function getStorage() {
    return chrome.storage[storageNamespace]
  }

  return {
    async load() {
      const result = await getStorage().get(key)
      return result[key] as ChatStorageSnapshot | undefined
    },

    async save(snapshot) {
      await getStorage().set({ [key]: snapshot })
    },

    subscribe(listener) {
      const handleChange = (
        changes: Record<string, chrome.storage.StorageChange>,
        namespace: string,
      ) => {
        if (namespace !== storageNamespace) return
        const snapshot = changes[key]?.newValue as ChatStorageSnapshot | undefined
        if (!snapshot) return
        listener(snapshot)
      }

      chrome.storage.onChanged.addListener(handleChange)
      return () => {
        chrome.storage.onChanged.removeListener(handleChange)
      }
    },
  }
}
