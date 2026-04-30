import type { ProviderPreset } from '@tuple-gpt/chat-core'

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    format: 'openai',
    defaultBaseUrl: 'https://api.openai.com',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  },
  {
    id: 'claude',
    name: 'Claude',
    format: 'claude',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModels: ['claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
  },
  {
    id: 'gemini',
    name: 'Gemini',
    format: 'gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com',
    defaultModels: ['gemini-2.0-flash', 'gemini-2.5-pro'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    format: 'openai',
    defaultBaseUrl: 'https://api.deepseek.com',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    format: 'openai',
    defaultBaseUrl: 'https://openrouter.ai/api',
    defaultModels: [],
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    format: 'openai',
    defaultBaseUrl: 'https://api.siliconflow.cn',
    defaultModels: [],
  },
  {
    id: 'ollama',
    name: 'Ollama',
    format: 'openai',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModels: [],
  },
]

export function getPresetById(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS.find(p => p.id === id)
}
