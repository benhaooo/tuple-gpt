import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { ApiFormat, ModelSelection, Provider } from '@tuple-gpt/chat-core'
import { PROVIDER_PRESETS, getPresetById, fetchModels, validateApiKey } from '@tuple-gpt/chat-core'

export const useProviderStore = defineStore(
  'providers',
  () => {
    const providers = ref<Provider[]>([])
    const activeModel = ref<ModelSelection | null>(null)
    const selectedProviderId = ref<string | null>(null)

    const allModels = computed(() => {
      const result: Array<{
        providerId: string
        providerName: string
        model: string
        format: ApiFormat
      }> = []
      for (const p of providers.value) {
        if (!p.apiKey) continue
        for (const m of p.models) {
          result.push({ providerId: p.id, providerName: p.name, model: m, format: p.format })
        }
      }
      return result
    })

    const activeProvider = computed(() => {
      if (!activeModel.value) return undefined
      return providers.value.find(p => p.id === activeModel.value!.providerId)
    })

    const presetProviders = computed(() => {
      return PROVIDER_PRESETS.map(preset =>
        providers.value.find(p => p.presetId === preset.id),
      ).filter((p): p is Provider => !!p)
    })

    const customProviders = computed(() => {
      return providers.value.filter(p => !p.presetId)
    })

    const selectedProvider = computed(() => {
      if (!selectedProviderId.value) return undefined
      return providers.value.find(p => p.id === selectedProviderId.value)
    })

    function seedPresets() {
      for (const preset of PROVIDER_PRESETS) {
        const exists = providers.value.some(p => p.presetId === preset.id)
        if (exists) continue
        const match = providers.value.find(
          p => !p.presetId && p.baseUrl.includes(preset.defaultBaseUrl),
        )
        if (match) {
          match.presetId = preset.id
          continue
        }
        const now = new Date().toISOString()
        providers.value.push({
          id: uuidv4(),
          name: preset.name,
          baseUrl: preset.defaultBaseUrl,
          apiKey: '',
          format: preset.format,
          models: [...preset.defaultModels],
          presetId: preset.id,
          createdAt: now,
          updatedAt: now,
        })
      }
      if (!selectedProviderId.value && providers.value.length > 0) {
        selectedProviderId.value = providers.value[0].id
      }
    }

    function addProvider(data: {
      name: string
      baseUrl: string
      apiKey: string
      format: ApiFormat
      models: string[]
      presetId?: string
    }): Provider {
      const now = new Date().toISOString()
      const provider: Provider = {
        ...data,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      }
      providers.value.push(provider)
      if (!activeModel.value && provider.apiKey && provider.models.length > 0) {
        activeModel.value = { providerId: provider.id, model: provider.models[0] }
      }
      return provider
    }

    function updateProvider(id: string, data: Partial<Omit<Provider, 'id' | 'createdAt'>>) {
      const index = providers.value.findIndex(p => p.id === id)
      if (index === -1) return
      providers.value[index] = {
        ...providers.value[index],
        ...data,
        updatedAt: new Date().toISOString(),
      }
      if (activeModel.value?.providerId === id && data.models) {
        if (!data.models.includes(activeModel.value.model)) {
          activeModel.value =
            data.models.length > 0 ? { providerId: id, model: data.models[0] } : null
        }
      }
    }

    function removeProvider(id: string) {
      const provider = providers.value.find(p => p.id === id)
      if (!provider || provider.presetId) return
      const index = providers.value.indexOf(provider)
      providers.value.splice(index, 1)
      if (activeModel.value?.providerId === id) {
        const first = allModels.value[0]
        activeModel.value = first ? { providerId: first.providerId, model: first.model } : null
      }
      if (selectedProviderId.value === id) {
        selectedProviderId.value = providers.value[0]?.id ?? null
      }
    }

    function selectProvider(id: string) {
      selectedProviderId.value = id
    }

    function setActiveModel(selection: ModelSelection) {
      activeModel.value = selection
    }

    function getProviderById(id: string): Provider | undefined {
      return providers.value.find(p => p.id === id)
    }

    function resetModels(providerId: string) {
      const provider = providers.value.find(p => p.id === providerId)
      if (!provider?.presetId) return
      const preset = getPresetById(provider.presetId)
      if (!preset) return
      updateProvider(providerId, { models: [...preset.defaultModels] })
    }

    async function fetchModelsForProvider(providerId: string) {
      const provider = providers.value.find(p => p.id === providerId)
      if (!provider) return { success: false, error: 'Provider not found' }
      const result = await fetchModels({
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
      })
      if (result.success) {
        updateProvider(providerId, { models: result.models })
      }
      return result
    }

    async function checkApiKey(providerId: string) {
      const provider = providers.value.find(p => p.id === providerId)
      if (!provider) return { valid: false, error: 'Provider not found' }
      return validateApiKey({
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
      })
    }

    return {
      providers,
      activeModel,
      selectedProviderId,
      allModels,
      activeProvider,
      presetProviders,
      customProviders,
      selectedProvider,
      seedPresets,
      addProvider,
      updateProvider,
      removeProvider,
      selectProvider,
      setActiveModel,
      getProviderById,
      resetModels,
      fetchModelsForProvider,
      checkApiKey,
    }
  },
  { chromePersist: true },
)
