import type { ApiFormat } from '../types/provider'
import { getErrorMessage } from '../utils/error'

export interface FetchModelsOptions {
  baseUrl: string
  apiKey: string
  format: ApiFormat
  signal?: AbortSignal
}

export interface FetchModelsResult {
  success: boolean
  models: string[]
  error?: string
}

async function fetchOpenAIModels(options: FetchModelsOptions): Promise<FetchModelsResult> {
  const url = `${options.baseUrl.replace(/\/+$/, '')}/v1/models`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${options.apiKey}` },
    signal: options.signal,
  })
  if (!res.ok) {
    return { success: false, models: [], error: `HTTP ${res.status}: ${res.statusText}` }
  }
  const json = await res.json()
  const models = (json.data || []).map((m: { id: string }) => m.id).sort()
  return { success: true, models }
}

async function fetchClaudeModels(options: FetchModelsOptions): Promise<FetchModelsResult> {
  const url = `${options.baseUrl.replace(/\/+$/, '')}/v1/models`
  const res = await fetch(url, {
    headers: {
      'x-api-key': options.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    signal: options.signal,
  })
  if (!res.ok) {
    return { success: false, models: [], error: `HTTP ${res.status}: ${res.statusText}` }
  }
  const json = await res.json()
  const models = (json.data || []).map((m: { id: string }) => m.id).sort()
  return { success: true, models }
}

async function fetchGeminiModels(options: FetchModelsOptions): Promise<FetchModelsResult> {
  const base = options.baseUrl.replace(/\/+$/, '')
  const url = `${base}/v1beta/models?key=${options.apiKey}`
  const res = await fetch(url, { signal: options.signal })
  if (!res.ok) {
    return { success: false, models: [], error: `HTTP ${res.status}: ${res.statusText}` }
  }
  const json = await res.json()
  const models = (json.models || [])
    .map((m: { name: string }) => m.name.replace(/^models\//, ''))
    .filter((id: string) => id.startsWith('gemini'))
    .sort()
  return { success: true, models }
}

export async function fetchModels(options: FetchModelsOptions): Promise<FetchModelsResult> {
  try {
    switch (options.format) {
      case 'openai':
        return await fetchOpenAIModels(options)
      case 'claude':
        return await fetchClaudeModels(options)
      case 'gemini':
        return await fetchGeminiModels(options)
      default:
        return { success: false, models: [], error: `Unknown format: ${options.format}` }
    }
  } catch (err: unknown) {
    const message = getErrorMessage(err)
    return { success: false, models: [], error: message }
  }
}

export async function validateApiKey(
  options: Omit<FetchModelsOptions, 'signal'>,
): Promise<{ valid: boolean; error?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const result = await fetchModels({ ...options, signal: controller.signal })
    return { valid: result.success, error: result.error }
  } finally {
    clearTimeout(timeout)
  }
}
