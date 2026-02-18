import { toRaw } from 'vue'
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
        if (config.pick.length === 0) {
            return toRaw(state)
        }
        return config.pick.reduce((acc, key) => {
            acc[key] = toRaw(state[key])
            return acc
        }, {} as Record<string, any>)
    }
    
    let isHydrating = false

    storage.get(config.key).then((result) => {
        if (result[config.key]) {
            isHydrating = true
            store.$patch(result[config.key])
            isHydrating = false
        }
    })

    // 2. 监听变化并保存（防抖）
    const debouncedSave = debounce((state: Record<string, any>) => {
        storage.set({ [config.key]: getPersistedState(state) })
    }, config.debounce)

    const debouncedUpdate = debounce((newValue: Record<string, any>) => {
        isHydrating = true
        store.$patch(newValue)
        isHydrating = false
    }, config.debounce)

    store.$subscribe((_mutation, state) => {
        if (isHydrating) return
        debouncedSave(state)
    })

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== storageNamespace) return
        if (!changes[config.key]?.newValue) return

        debouncedUpdate(changes[config.key].newValue)
    })
}
