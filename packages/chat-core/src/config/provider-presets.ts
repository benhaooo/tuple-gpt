import { ProviderType } from '@tuple-gpt/ai-core'
import type { ProviderPreset } from '#types'

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    format: ProviderType.OpenAI,
    defaultBaseUrl: 'https://api.openai.com',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  },
  {
    id: 'claude',
    name: 'Claude',
    format: ProviderType.Anthropic,
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModels: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    format: ProviderType.Gemini,
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModels: ['gemini-2.0-flash', 'gemini-2.5-pro'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    format: ProviderType.OpenAI,
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    format: ProviderType.OpenAI,
    defaultBaseUrl: 'https://openrouter.ai/api',
    defaultModels: [],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    format: ProviderType.OpenAI,
    defaultBaseUrl: 'https://api.siliconflow.cn',
    defaultModels: [],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    format: ProviderType.OpenAI,
    defaultBaseUrl: 'http://localhost:11434',
    defaultModels: [],
  },
]

export function getPresetById(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(p => p.id === id)
}
