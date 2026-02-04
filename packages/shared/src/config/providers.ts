import ZhinaoProviderLogo from '@shared/assets/images/models/360.png'
import HunyuanProviderLogo from '@shared/assets/images/models/hunyuan.png'
import AzureProviderLogo from '@shared/assets/images/models/microsoft.png'
import Ai302ProviderLogo from '@shared/assets/images/providers/302ai.webp'
import AiHubMixProviderLogo from '@shared/assets/images/providers/aihubmix.webp'
import AlayaNewProviderLogo from '@shared/assets/images/providers/alayanew.webp'
import AnthropicProviderLogo from '@shared/assets/images/providers/anthropic.png'
import BaichuanProviderLogo from '@shared/assets/images/providers/baichuan.png'
import BaiduCloudProviderLogo from '@shared/assets/images/providers/baidu-cloud.svg'
import BailianProviderLogo from '@shared/assets/images/providers/bailian.png'
import BurnCloudProviderLogo from '@shared/assets/images/providers/burncloud.png'
import CephalonProviderLogo from '@shared/assets/images/providers/cephalon.jpeg'
import DeepSeekProviderLogo from '@shared/assets/images/providers/deepseek.png'
import DmxapiProviderLogo from '@shared/assets/images/providers/DMXAPI.png'
import FireworksProviderLogo from '@shared/assets/images/providers/fireworks.png'
import GiteeAIProviderLogo from '@shared/assets/images/providers/gitee-ai.png'
import GithubProviderLogo from '@shared/assets/images/providers/github.png'
import GoogleProviderLogo from '@shared/assets/images/providers/google.png'
import GPUStackProviderLogo from '@shared/assets/images/providers/gpustack.svg'
import GrokProviderLogo from '@shared/assets/images/providers/grok.png'
import GroqProviderLogo from '@shared/assets/images/providers/groq.png'
import HyperbolicProviderLogo from '@shared/assets/images/providers/hyperbolic.png'
import InfiniProviderLogo from '@shared/assets/images/providers/infini.png'
import JinaProviderLogo from '@shared/assets/images/providers/jina.png'
import LanyunProviderLogo from '@shared/assets/images/providers/lanyun.png'
import LMStudioProviderLogo from '@shared/assets/images/providers/lmstudio.png'
import MinimaxProviderLogo from '@shared/assets/images/providers/minimax.png'
import MistralProviderLogo from '@shared/assets/images/providers/mistral.png'
import ModelScopeProviderLogo from '@shared/assets/images/providers/modelscope.png'
import MoonshotProviderLogo from '@shared/assets/images/providers/moonshot.png'
import NvidiaProviderLogo from '@shared/assets/images/providers/nvidia.png'
import O3ProviderLogo from '@shared/assets/images/providers/o3.png'
import OcoolAiProviderLogo from '@shared/assets/images/providers/ocoolai.png'
import OllamaProviderLogo from '@shared/assets/images/providers/ollama.png'
import OpenAiProviderLogo from '@shared/assets/images/providers/openai.png'
import OpenRouterProviderLogo from '@shared/assets/images/providers/openrouter.png'
import PerplexityProviderLogo from '@shared/assets/images/providers/perplexity.png'
import PPIOProviderLogo from '@shared/assets/images/providers/ppio.png'
import QiniuProviderLogo from '@shared/assets/images/providers/qiniu.webp'
import SiliconFlowProviderLogo from '@shared/assets/images/providers/silicon.png'
import StepProviderLogo from '@shared/assets/images/providers/step.png'
import TencentCloudProviderLogo from '@shared/assets/images/providers/tencent-cloud-ti.png'
import TogetherProviderLogo from '@shared/assets/images/providers/together.png'
import TokenFluxProviderLogo from '@shared/assets/images/providers/tokenflux.png'
import VertexAIProviderLogo from '@shared/assets/images/providers/vertexai.svg'
import BytedanceProviderLogo from '@shared/assets/images/providers/volcengine.png'
import VoyageAIProviderLogo from '@shared/assets/images/providers/voyageai.png'
import XirangProviderLogo from '@shared/assets/images/providers/xirang.png'
import ZeroOneProviderLogo from '@shared/assets/images/providers/zero-one.png'
import ZhipuProviderLogo from '@shared/assets/images/providers/zhipu.png'



const PROVIDER_LOGO_MAP = {
  '302ai': Ai302ProviderLogo,
  openai: OpenAiProviderLogo,
  silicon: SiliconFlowProviderLogo,
  deepseek: DeepSeekProviderLogo,
  'gitee-ai': GiteeAIProviderLogo,
  yi: ZeroOneProviderLogo,
  groq: GroqProviderLogo,
  zhipu: ZhipuProviderLogo,
  ollama: OllamaProviderLogo,
  lmstudio: LMStudioProviderLogo,
  moonshot: MoonshotProviderLogo,
  openrouter: OpenRouterProviderLogo,
  baichuan: BaichuanProviderLogo,
  dashscope: BailianProviderLogo,
  modelscope: ModelScopeProviderLogo,
  xirang: XirangProviderLogo,
  anthropic: AnthropicProviderLogo,
  aihubmix: AiHubMixProviderLogo,
  burncloud: BurnCloudProviderLogo,
  gemini: GoogleProviderLogo,
  stepfun: StepProviderLogo,
  doubao: BytedanceProviderLogo,
  minimax: MinimaxProviderLogo,
  github: GithubProviderLogo,
  copilot: GithubProviderLogo,
  ocoolai: OcoolAiProviderLogo,
  together: TogetherProviderLogo,
  fireworks: FireworksProviderLogo,
  zhinao: ZhinaoProviderLogo,
  nvidia: NvidiaProviderLogo,
  'azure-openai': AzureProviderLogo,
  hunyuan: HunyuanProviderLogo,
  grok: GrokProviderLogo,
  hyperbolic: HyperbolicProviderLogo,
  mistral: MistralProviderLogo,
  jina: JinaProviderLogo,
  ppio: PPIOProviderLogo,
  'baidu-cloud': BaiduCloudProviderLogo,
  dmxapi: DmxapiProviderLogo,
  perplexity: PerplexityProviderLogo,
  infini: InfiniProviderLogo,
  o3: O3ProviderLogo,
  'tencent-cloud-ti': TencentCloudProviderLogo,
  gpustack: GPUStackProviderLogo,
  alayanew: AlayaNewProviderLogo,
  voyageai: VoyageAIProviderLogo,
  qiniu: QiniuProviderLogo,
  tokenflux: TokenFluxProviderLogo,
  cephalon: CephalonProviderLogo,
  lanyun: LanyunProviderLogo,
  vertexai: VertexAIProviderLogo
} as const

export function getProviderLogo(providerId: string) {
  return PROVIDER_LOGO_MAP[providerId as keyof typeof PROVIDER_LOGO_MAP]
}

// export const SUPPORTED_REANK_PROVIDERS = ['silicon', 'jina', 'voyageai', 'dashscope', 'aihubmix']
export const NOT_SUPPORTED_REANK_PROVIDERS = ['ollama']
export const ONLY_SUPPORTED_DIMENSION_PROVIDERS = ['ollama', 'infini']

export const PROVIDER_CONFIG = {
  openai: {
    api: {
      url: 'https://api.openai.com'
    },
    websites: {
      official: 'https://openai.com/',
      apiKey: 'https://platform.openai.com/api-keys',
      docs: 'https://platform.openai.com/docs',
      models: 'https://platform.openai.com/docs/models'
    }
  },
  gemini: {
    api: {
      url: 'https://generativelanguage.googleapis.com'
    },
    websites: {
      official: 'https://gemini.google.com/',
      apiKey: 'https://aistudio.google.com/app/apikey',
      docs: 'https://ai.google.dev/gemini-api/docs',
      models: 'https://ai.google.dev/gemini-api/docs/models/gemini'
    }
  },
  deepseek: {
    api: {
      url: 'https://api.deepseek.com'
    },
    websites: {
      official: 'https://deepseek.com/',
      apiKey: 'https://platform.deepseek.com/api_keys',
      docs: 'https://platform.deepseek.com/api-docs/',
      models: 'https://platform.deepseek.com/api-docs/'
    }
  },

  moonshot: {
    api: {
      url: 'https://api.moonshot.cn'
    },
    websites: {
      official: 'https://moonshot.ai/',
      apiKey: 'https://platform.moonshot.cn/console/api-keys',
      docs: 'https://platform.moonshot.cn/docs/',
      models: 'https://platform.moonshot.cn/docs/intro#%E6%A8%A1%E5%9E%8B%E5%88%97%E8%A1%A8'
    }
  },
  doubao: {
    api: {
      url: 'https://ark.cn-beijing.volces.com/api/v3/'
    },
    websites: {
      official: 'https://console.volcengine.com/ark/',
      apiKey: 'https://www.volcengine.com/experience/ark?utm_term=202502dsinvite&ac=DSASUQY5&rc=DB4II4FC',
      docs: 'https://www.volcengine.com/docs/82379/1182403',
      models: 'https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint'
    }
  },

  anthropic: {
    api: {
      url: 'https://api.anthropic.com/'
    },
    websites: {
      official: 'https://anthropic.com/',
      apiKey: 'https://console.anthropic.com/settings/keys',
      docs: 'https://docs.anthropic.com/en/docs',
      models: 'https://docs.anthropic.com/en/docs/about-claude/models'
    }
  },
  // grok: {
  //   api: {
  //     url: 'https://api.x.ai'
  //   },
  //   websites: {
  //     official: 'https://x.ai/',
  //     docs: 'https://docs.x.ai/',
  //     models: 'https://docs.x.ai/docs/models'
  //   }
  // },
  // 'azure-openai': {
  //   api: {
  //     url: ''
  //   },
  //   websites: {
  //     official: 'https://azure.microsoft.com/en-us/products/ai-services/openai-service',
  //     apiKey: 'https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI',
  //     docs: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/',
  //     models: 'https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/models'
  //   }
  // },
  // ollama: {
  //   api: {
  //     url: 'http://localhost:11434'
  //   },
  //   websites: {
  //     official: 'https://ollama.com/',
  //     docs: 'https://github.com/ollama/ollama/tree/main/docs',
  //     models: 'https://ollama.com/library'
  //   }
  // },
}
