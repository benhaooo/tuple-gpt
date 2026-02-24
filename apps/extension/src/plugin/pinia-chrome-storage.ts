import type { PiniaPluginContext } from 'pinia'
import { debounce } from 'lodash'

interface ChromePersistConfig {
    key?: string
    sync?: boolean
    pick?: string[]
    debounce?: number
}

declare module 'pinia' {
    export interface DefineStoreOptionsInPlugin<Id, S, G, A> {
        chromePersist?: boolean | ChromePersistConfig
    }

    export interface DefineSetupStoreOptions<Id, S, G, A> {
        chromePersist?: boolean | ChromePersistConfig
    }
}


export function piniaChormeStorage(context: PiniaPluginContext) {
    const { store, options: { chromePersist } } = context
    if (!chromePersist) return

    const defaultConfig = {
        key: store.$id,
        sync: true,
        pick: [],
        debounce: 0,
    }
    const config = typeof chromePersist === 'object'
        ? { ...defaultConfig, ...chromePersist }
        : defaultConfig

    const storageNamespace = config.sync ? 'sync' : 'local'
    const storage = chrome.storage[storageNamespace]

    function getPersistedState(state: Record<string, any>) {
        const raw = JSON.parse(JSON.stringify(state))
        if (config.pick.length === 0) {
            return raw
        }
        return config.pick.reduce((acc, key) => {
            if (key in raw) acc[key] = raw[key]
            return acc
        }, {} as Record<string, any>)
    }

    let isHydrating = true

    storage.get(config.key).then((result) => {
        if (result[config.key]) {
            store.$patch(result[config.key])
        }
        isHydrating = false
    })

    // 2. 监听变化并保存（防抖）
    const debouncedSave = debounce((state: Record<string, any>) => {
        if (isHydrating) return
        storage.set({ [config.key]: getPersistedState(state) })
    }, config.debounce)

    store.$subscribe((_mutation, state) => {
        if (isHydrating) return
        debouncedSave(state)
    }, { deep: true })

    const onStorageChange = (changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
        if (namespace !== storageNamespace) return
        if (!changes[config.key]?.newValue) return

        isHydrating = true
        store.$patch(changes[config.key].newValue)
        isHydrating = false
    }
    chrome.storage.onChanged.addListener(onStorageChange)
    store.$dispose = new Proxy(store.$dispose, {
        apply(target, thisArg, args) {
            chrome.storage.onChanged.removeListener(onStorageChange)
            return Reflect.apply(target, thisArg, args)
        }
    })
}
