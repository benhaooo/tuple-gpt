import OpenAIProviderLogo from '../assets/ai-icons/providers/openai.png'
import AnthropicProviderLogo from '../assets/ai-icons/providers/anthropic.png'
import GeminiProviderLogo from '../assets/ai-icons/providers/gemini.png'
import DeepSeekProviderLogo from '../assets/ai-icons/providers/deepseek.png'
import OpenRouterProviderLogo from '../assets/ai-icons/providers/openrouter.png'
import SiliconProviderLogo from '../assets/ai-icons/providers/silicon.png'
import OllamaProviderLogo from '../assets/ai-icons/providers/ollama.png'
import GptModelLogo from '../assets/ai-icons/models/gpt_4.png'
import GptReasoningModelLogo from '../assets/ai-icons/models/gpt_o1.png'
import GptImageModelLogo from '../assets/ai-icons/models/gpt_image_1.png'
import DalleModelLogo from '../assets/ai-icons/models/dalle.png'
import ClaudeModelLogo from '../assets/ai-icons/models/claude.png'
import GeminiModelLogo from '../assets/ai-icons/models/gemini.png'
import GemmaModelLogo from '../assets/ai-icons/models/gemma.png'
import DeepSeekModelLogo from '../assets/ai-icons/models/deepseek.png'
import QwenModelLogo from '../assets/ai-icons/models/qwen.png'
import LlamaModelLogo from '../assets/ai-icons/models/llama.png'
import GrokModelLogo from '../assets/ai-icons/models/grok.png'
import MixtralModelLogo from '../assets/ai-icons/models/mixtral.png'
import CodestralModelLogo from '../assets/ai-icons/models/codestral.png'
import MoonshotModelLogo from '../assets/ai-icons/models/moonshot.webp'
import ChatGLMModelLogo from '../assets/ai-icons/models/chatglm.png'
import DoubaoModelLogo from '../assets/ai-icons/models/doubao.png'
import MinimaxModelLogo from '../assets/ai-icons/models/minimax.png'
import BaichuanModelLogo from '../assets/ai-icons/models/baichuan.png'
import YiModelLogo from '../assets/ai-icons/models/yi.png'
import HunyuanModelLogo from '../assets/ai-icons/models/hunyuan.png'
import StepModelLogo from '../assets/ai-icons/models/step.png'
import JinaModelLogo from '../assets/ai-icons/models/jina.png'
import VoyageModelLogo from '../assets/ai-icons/models/voyageai.png'
import FluxModelLogo from '../assets/ai-icons/models/flux.png'
import type { Provider } from '../types'

const PROVIDER_ICON_MAP = {
  openai: OpenAIProviderLogo,
  claude: AnthropicProviderLogo,
  gemini: GeminiProviderLogo,
  deepseek: DeepSeekProviderLogo,
  openrouter: OpenRouterProviderLogo,
  siliconflow: SiliconProviderLogo,
  ollama: OllamaProviderLogo,
} as const

export function resolveProviderIcon(provider: Provider): string | undefined {
  if (!provider.presetId) return undefined
  return PROVIDER_ICON_MAP[provider.presetId as keyof typeof PROVIDER_ICON_MAP]
}

type ModelMatcher = {
  pattern: RegExp
  icon: string
}

const MODEL_MATCHERS: ModelMatcher[] = [
  { pattern: /gpt-image/, icon: GptImageModelLogo },
  { pattern: /dall-e|dalle/, icon: DalleModelLogo },
  { pattern: /(?:^|[/: _-])o[134](?:$|[-_.:/])/, icon: GptReasoningModelLogo },
  { pattern: /(?:^|[/: _-])gpt(?:$|[-_.:/])/, icon: GptModelLogo },
  { pattern: /whisper/, icon: GptModelLogo },
  { pattern: /claude/, icon: ClaudeModelLogo },
  { pattern: /gemini/, icon: GeminiModelLogo },
  { pattern: /gemma/, icon: GemmaModelLogo },
  { pattern: /deepseek/, icon: DeepSeekModelLogo },
  { pattern: /qwen|qwq/, icon: QwenModelLogo },
  { pattern: /llama/, icon: LlamaModelLogo },
  { pattern: /grok/, icon: GrokModelLogo },
  { pattern: /codestral/, icon: CodestralModelLogo },
  { pattern: /(?:^|[/: _-])(?:mistral|mixtral)(?:$|[-_.:/])/, icon: MixtralModelLogo },
  { pattern: /(?:^|[/: _-])(?:moonshot|kimi)(?:$|[-_.:/])/, icon: MoonshotModelLogo },
  { pattern: /(?:^|[/: _-])(?:chatglm|glm)(?:$|[-_.:/])/, icon: ChatGLMModelLogo },
  { pattern: /doubao/, icon: DoubaoModelLogo },
  { pattern: /(?:^|[/: _-])(?:minimax|abab)(?:$|[-_.:/])/, icon: MinimaxModelLogo },
  { pattern: /baichuan/, icon: BaichuanModelLogo },
  { pattern: /(?:^|[/: _-])yi(?:$|[-_.:/])/, icon: YiModelLogo },
  { pattern: /hunyuan/, icon: HunyuanModelLogo },
  { pattern: /(?:^|[/: _-])step(?:$|[-_.:/])/, icon: StepModelLogo },
  { pattern: /jina/, icon: JinaModelLogo },
  { pattern: /voyage/, icon: VoyageModelLogo },
  { pattern: /flux/, icon: FluxModelLogo },
]

export function resolveModelIcon(modelId: string | undefined | null): string | undefined {
  const normalized = modelId?.trim().toLowerCase()
  if (!normalized) return undefined

  for (const matcher of MODEL_MATCHERS) {
    if (matcher.pattern.test(normalized)) {
      return matcher.icon
    }
  }

  return undefined
}
