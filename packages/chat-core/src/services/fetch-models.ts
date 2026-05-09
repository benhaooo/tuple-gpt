import { getErrorMessage } from '../utils/error'

export interface FetchModelsOptions {
  baseUrl: string
  apiKey: string
  signal?: AbortSignal
}

export interface FetchModelsResult {
  success: boolean
  models: string[]
  error?: string
}

export async function fetchModels(options: FetchModelsOptions): Promise<FetchModelsResult> {
  try {
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
