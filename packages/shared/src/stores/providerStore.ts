import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { Provider, ApiFormat, ModelSelection } from '../types'
import { PROVIDER_PRESETS, getPresetById } from '../config/providerPresets'
import { fetchModels, validateApiKey } from '../adapters/fetch-models'

export const useProviderStore = defineStore('providers', () => {
  const providers = ref<Provider[]>([])
  /** Currently selected model: { providerId, model } */
  const activeModel = ref<ModelSelection | null>(null)
  /** Currently selected provider in the config UI */
  const selectedProviderId = ref<string | null>(null)

  /** Flat list of all models from configured providers (with apiKey) */
  const allModels = computed(() => {
    const result: Array<{ providerId: string; providerName: string; model: string; format: ApiFormat }> = []
    for (const p of providers.value) {
      if (!p.apiKey) continue
      for (const m of p.models) {
        result.push({ providerId: p.id, providerName: p.name, model: m, format: p.format })
      }
    }
    return result
  })

  /** Get the provider for the currently active model */
  const activeProvider = computed(() => {
    if (!activeModel.value) return undefined
    return providers.value.find(p => p.id === activeModel.value!.providerId)
  })

  /** Preset providers in preset order */
  const presetProviders = computed(() => {
    return PROVIDER_PRESETS
      .map(preset => providers.value.find(p => p.presetId === preset.id))
      .filter((p): p is Provider => !!p)
  })

  /** Custom (non-preset) providers */
  const customProviders = computed(() => {
    return providers.value.filter(p => !p.presetId)
  })

  /** Currently selected provider object */
  const selectedProvider = computed(() => {
    if (!selectedProviderId.value) return undefined
    return providers.value.find(p => p.id === selectedProviderId.value)
  })

  /** Seed preset providers (idempotent) */
  function seedPresets() {
    for (const preset of PROVIDER_PRESETS) {
      const exists = providers.value.some(p => p.presetId === preset.id)
      if (exists) continue
      // Check if an existing provider matches by baseUrl (migration)
      const match = providers.value.find(p => !p.presetId && p.baseUrl.includes(preset.defaultBaseUrl))
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
    // Auto-select first preset if nothing selected
    if (!selectedProviderId.value && providers.value.length > 0) {
      selectedProviderId.value = providers.value[0].id
    }
  }

  function addProvider(data: { name: string; baseUrl: string; apiKey: string; format: ApiFormat; models: string[]; presetId?: string }): Provider {
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
    console.log("🚀 ~ updateProvider ~ providers:", providers.value)
    const index = providers.value.findIndex(p => p.id === id)
    if (index === -1) return
    providers.value[index] = { ...providers.value[index], ...data, updatedAt: new Date().toISOString() }
    if (activeModel.value?.providerId === id && data.models) {
      if (!data.models.includes(activeModel.value.model)) {
        activeModel.value = data.models.length > 0
          ? { providerId: id, model: data.models[0] }
          : null
      }
    }
    console.log("🚀 ~ updateProvider ~ providers:", providers.value)
  }

  function removeProvider(id: string) {
    const provider = providers.value.find(p => p.id === id)
    if (!provider || provider.presetId) return // Preset providers cannot be deleted
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

  /** Reset models to preset defaults */
  function resetModels(providerId: string) {
    const provider = providers.value.find(p => p.id === providerId)
    if (!provider?.presetId) return
    const preset = getPresetById(provider.presetId)
    if (!preset) return
    updateProvider(providerId, { models: [...preset.defaultModels] })
  }

  /** Fetch models from provider API */
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

  /** Validate API key connectivity */
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
}, {
  chromePersist: true
})
