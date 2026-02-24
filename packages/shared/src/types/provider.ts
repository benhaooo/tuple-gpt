export type ApiFormat = 'openai' | 'claude' | 'gemini'

export interface Provider {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  format: ApiFormat
  /** Available model IDs for this provider */
  models: string[]
  /** Links to a preset provider (undefined for custom providers) */
  presetId?: string
  createdAt: string
  updatedAt: string
}

export interface ProviderPreset {
  id: string
  name: string
  format: ApiFormat
  defaultBaseUrl: string
  defaultModels: string[]
}

/** A resolved model selection: which provider + which model */
export interface ModelSelection {
  providerId: string
  model: string
}

/** Alias for backward compatibility with configDialogService.ts */
export type Assistant = Provider
