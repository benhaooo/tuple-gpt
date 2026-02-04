import { toRaw, watch } from 'vue'
import type { PiniaPluginContext } from 'pinia'
import { debounce } from 'lodash'

export function piniaChormeStorage(context: PiniaPluginContext) {
    const { store, options: storageOptions } = context

    if (!storageOptions) return

    const defaultConfig = {
        key: store.$id,
        sync: true,
        pick: [],
        debounce: 300,
    }
    const config = typeof storageOptions === 'object'
        ? { ...defaultConfig, ...storageOptions }
        : defaultConfig

    const storage = config.sync ? chrome.storage.sync : chrome.storage.local

    // 获取要持久化的数据
    function getPersistedState(state: Record<string, any>) {
        if (config.pick.length === 0) {
            return toRaw(state)
        }
        return config.pick.reduce((acc, key) => {
            acc[key] = toRaw(state[key])
            return acc
        }, {} as Record<string, any>)
    }

    // 1. 加载数据
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
        console.log("🚀 ~ piniaChormeStorage ~ state:", state)
        storage.set({ [config.key]: getPersistedState(state) })
    }, config.debounce)

    store.$subscribe((_mutation, state) => {
        console.log("🚀 ~ piniaChormeStorage ~ state:", state)
        if (isHydrating) return
        debouncedSave(state)
    })

    // 3. 监听其他 context 的变化
    chrome.storage.onChanged.addListener((changes, namespace) => {
        const targetNamespace = config.sync ? 'sync' : 'local'
        if (namespace !== targetNamespace) return
        if (!changes[config.key]?.newValue) return

        const newValue = changes[config.key].newValue
        const currentState = getPersistedState(store.$state)

        if (JSON.stringify(currentState) !== JSON.stringify(newValue)) {
            isHydrating = true
            store.$patch(newValue)
            isHydrating = false
        }
    })
}
