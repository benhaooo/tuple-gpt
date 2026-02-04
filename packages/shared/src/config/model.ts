// 导入主流AI模型logo
import GeminiProviderLogo from '@shared/assets/images/models/gemini.png'
import GptProviderLogo from '@shared/assets/images/models/gpt_4.png'
import DeepseekProviderLogo from '@shared/assets/images/models/deepseek.png'
import ClaudeProviderLogo from '@shared/assets/images/models/claude.png'
import DoubaoProviderLogo from '@shared/assets/images/models/doubao.png'
import GrokProviderLogo from '@shared/assets/images/models/grok.png'
import QwenProviderLogo from '@shared/assets/images/models/qwen.png'
import ChatGLMProviderLogo from '@shared/assets/images/models/chatglm.png'
import MoonshotProviderLogo from '@shared/assets/images/models/moonshot.png'
import BaichuanProviderLogo from '@shared/assets/images/models/baichuan.png'
import YiProviderLogo from '@shared/assets/images/models/yi.png'
import HunyuanProviderLogo from '@shared/assets/images/models/hunyuan.png'
import WenxinProviderLogo from '@shared/assets/images/models/wenxin.png'
import SparkdeskProviderLogo from '@shared/assets/images/models/sparkdesk.png'
import MinimaxProviderLogo from '@shared/assets/images/models/minimax.png'
import ZhipuProviderLogo from '@shared/assets/images/models/zhipu.png'
import LlamaProviderLogo from '@shared/assets/images/models/llama.png'
import MixtralProviderLogo from '@shared/assets/images/models/mixtral.png'
import CohereProviderLogo from '@shared/assets/images/models/cohere.png'
import InternLMProviderLogo from '@shared/assets/images/models/internlm.png'
import PalmProviderLogo from '@shared/assets/images/models/palm.png'
import CopilotProviderLogo from '@shared/assets/images/models/copilot.png'
import DalleProviderLogo from '@shared/assets/images/models/dalle.png'
import MidjourneyProviderLogo from '@shared/assets/images/models/midjourney.png'
import StabilityProviderLogo from '@shared/assets/images/models/stability.png'
import PerplexityProviderLogo from '@shared/assets/images/models/perplexity.png'
import NvidiaProviderLogo from '@shared/assets/images/models/nvidia.png'
import MicrosoftProviderLogo from '@shared/assets/images/models/microsoft.png'
import GemmaProviderLogo from '@shared/assets/images/models/gemma.png'
import CodestralProviderLogo from '@shared/assets/images/models/codestral.png'
import DefaultLogo from '@shared/assets/images/models/embedding.png' // 使用 embedding.png 作为默认 logo

// 明确定义支持的提供商类型
type SupportedProvider =
    | 'gemini' | 'claude' | 'gpt' | 'deepseek' | 'doubao' | 'grok'
    | 'qwen' | 'chatglm' | 'moonshot' | 'baichuan' | 'yi' | 'hunyuan'
    | 'wenxin' | 'sparkdesk' | 'minimax' | 'zhipu' | 'llama' | 'mixtral'
    | 'cohere' | 'openai' | 'anthropic' | 'bytedance' | 'alibaba'
    | 'tencent' | 'baidu' | 'iflytek' | 'meta' | 'mistral' | 'internlm'
    | 'palm' | 'copilot' | 'dalle' | 'midjourney' | 'stability' | 'perplexity'
    | 'nvidia' | 'microsoft' | 'gemma' | 'codestral' | 'google';

// 使用 Record 类型确保类型安全
const PROVIDER_LOGO_MAP: Record<SupportedProvider, string> = {
    // OpenAI系列
    'gpt': GptProviderLogo,
    'openai': GptProviderLogo,

    // Anthropic系列
    'claude': ClaudeProviderLogo,
    'anthropic': ClaudeProviderLogo,

    // Google系列
    'gemini': GeminiProviderLogo,

    // 字节跳动系列
    'doubao': DoubaoProviderLogo,
    'bytedance': DoubaoProviderLogo,

    // xAI系列
    'grok': GrokProviderLogo,

    // DeepSeek系列
    'deepseek': DeepseekProviderLogo,

    // 阿里巴巴系列
    'qwen': QwenProviderLogo,
    'alibaba': QwenProviderLogo,

    // 智谱AI系列
    'chatglm': ChatGLMProviderLogo,
    'zhipu': ZhipuProviderLogo,

    // 月之暗面系列
    'moonshot': MoonshotProviderLogo,

    // 百川智能系列
    'baichuan': BaichuanProviderLogo,

    // 零一万物系列
    'yi': YiProviderLogo,

    // 腾讯系列
    'hunyuan': HunyuanProviderLogo,
    'tencent': HunyuanProviderLogo,

    // 百度系列
    'wenxin': WenxinProviderLogo,
    'baidu': WenxinProviderLogo,

    // 科大讯飞系列
    'sparkdesk': SparkdeskProviderLogo,
    'iflytek': SparkdeskProviderLogo,

    // MiniMax系列
    'minimax': MinimaxProviderLogo,

    // Meta系列
    'llama': LlamaProviderLogo,
    'meta': LlamaProviderLogo,

    // Mistral系列
    'mixtral': MixtralProviderLogo,
    'mistral': MixtralProviderLogo,

    // Cohere系列
    'cohere': CohereProviderLogo,

    // 上海AI实验室系列
    'internlm': InternLMProviderLogo,

    // Google PaLM系列
    'palm': PalmProviderLogo,
    'google': GeminiProviderLogo,

    // Google Gemma系列
    'gemma': GemmaProviderLogo,

    // Microsoft系列
    'copilot': CopilotProviderLogo,
    'microsoft': MicrosoftProviderLogo,

    // OpenAI图像生成系列
    'dalle': DalleProviderLogo,

    // Midjourney系列
    'midjourney': MidjourneyProviderLogo,

    // Stability AI系列
    'stability': StabilityProviderLogo,

    // Perplexity系列
    'perplexity': PerplexityProviderLogo,

    // NVIDIA系列
    'nvidia': NvidiaProviderLogo,

    // Mistral Codestral系列
    'codestral': CodestralProviderLogo,
};

/**
 * 根据模型ID获取对应的提供商logo
 * @param modelId 模型ID
 * @returns logo的URL
 */
export function getModelLogo(modelId: string): string {
    if (!modelId || typeof modelId !== 'string') {
        return DefaultLogo;
    }

    // 将 modelId 转为小写以进行不区分大小写的匹配
    const lowerModelId = modelId.toLowerCase();

    // 特殊匹配规则 - 优先匹配更具体的模型名称
    const specialMatches: Array<{ pattern: string | RegExp, provider: SupportedProvider }> = [
        // OpenAI系列
        { pattern: /gpt-?[34]/, provider: 'gpt' },
        { pattern: /gpt-?3\.?5/, provider: 'gpt' },
        { pattern: /chatgpt/, provider: 'gpt' },
        { pattern: 'openai', provider: 'openai' },

        // Anthropic系列
        { pattern: /claude-?[123]/, provider: 'claude' },
        { pattern: /claude-?(instant|sonnet|opus|haiku)/, provider: 'claude' },
        { pattern: 'anthropic', provider: 'anthropic' },

        // Google系列
        { pattern: /gemini-?(pro|ultra|nano)/, provider: 'gemini' },
        { pattern: /gemini-?[12]/, provider: 'gemini' },

        // 字节跳动系列
        { pattern: 'doubao', provider: 'doubao' },
        { pattern: 'bytedance', provider: 'bytedance' },

        // xAI系列
        { pattern: 'grok', provider: 'grok' },

        // DeepSeek系列
        { pattern: 'deepseek', provider: 'deepseek' },

        // 阿里巴巴系列
        { pattern: /qwen-?[12]/, provider: 'qwen' },
        { pattern: /qwen-?(turbo|plus|max)/, provider: 'qwen' },
        { pattern: 'tongyi', provider: 'qwen' },
        { pattern: 'alibaba', provider: 'alibaba' },

        // 智谱AI系列
        { pattern: /chatglm-?[123]/, provider: 'chatglm' },
        { pattern: /glm-?[34]/, provider: 'chatglm' },
        { pattern: 'zhipu', provider: 'zhipu' },

        // 月之暗面系列
        { pattern: /moonshot-?v1/, provider: 'moonshot' },
        { pattern: 'kimi', provider: 'moonshot' },

        // 百川智能系列
        { pattern: /baichuan-?[123]/, provider: 'baichuan' },

        // 零一万物系列
        { pattern: /yi-?(large|medium|small)/, provider: 'yi' },
        { pattern: /yi-?[69]b/, provider: 'yi' },

        // 腾讯系列
        { pattern: 'hunyuan', provider: 'hunyuan' },
        { pattern: 'tencent', provider: 'tencent' },

        // 百度系列
        { pattern: /ernie-?(bot|turbo|lite)/, provider: 'wenxin' },
        { pattern: 'wenxin', provider: 'wenxin' },
        { pattern: 'baidu', provider: 'baidu' },

        // 科大讯飞系列
        { pattern: /spark-?[123]/, provider: 'sparkdesk' },
        { pattern: 'sparkdesk', provider: 'sparkdesk' },
        { pattern: 'iflytek', provider: 'iflytek' },

        // MiniMax系列
        { pattern: 'minimax', provider: 'minimax' },
        { pattern: 'abab', provider: 'minimax' },

        // Meta系列
        { pattern: /llama-?[23]/, provider: 'llama' },
        { pattern: /llama-?[78]b/, provider: 'llama' },
        { pattern: /llama-?[13]b/, provider: 'llama' },
        { pattern: 'meta', provider: 'meta' },

        // Mistral系列
        { pattern: /mixtral-?8x/, provider: 'mixtral' },
        { pattern: /mistral-?[78]b/, provider: 'mixtral' },
        { pattern: 'mistral', provider: 'mistral' },

        // Cohere系列
        { pattern: /command-?r/, provider: 'cohere' },
        { pattern: 'cohere', provider: 'cohere' },

        // 上海AI实验室系列
        { pattern: /internlm-?[12]/, provider: 'internlm' },
        { pattern: 'internlm', provider: 'internlm' },

        // Google PaLM系列
        { pattern: /palm-?[12]/, provider: 'palm' },
        { pattern: 'palm', provider: 'palm' },
        { pattern: 'bison', provider: 'palm' },

        // Google Gemma系列
        { pattern: /gemma-?[27]b/, provider: 'gemma' },
        { pattern: 'gemma', provider: 'gemma' },

        // Microsoft系列
        { pattern: /copilot/, provider: 'copilot' },
        { pattern: /github-?copilot/, provider: 'copilot' },
        { pattern: 'microsoft', provider: 'microsoft' },

        // OpenAI图像生成系列
        { pattern: /dall-?e/, provider: 'dalle' },
        { pattern: 'dalle', provider: 'dalle' },

        // Midjourney系列
        { pattern: 'midjourney', provider: 'midjourney' },
        { pattern: 'mj', provider: 'midjourney' },

        // Stability AI系列
        { pattern: /stable-?diffusion/, provider: 'stability' },
        { pattern: 'stability', provider: 'stability' },
        { pattern: 'sdxl', provider: 'stability' },

        // Perplexity系列
        { pattern: 'perplexity', provider: 'perplexity' },
        { pattern: 'pplx', provider: 'perplexity' },

        // NVIDIA系列
        { pattern: 'nvidia', provider: 'nvidia' },
        { pattern: 'nemotron', provider: 'nvidia' },

        // Mistral Codestral系列
        { pattern: 'codestral', provider: 'codestral' },
    ];

    // 首先尝试特殊匹配规则
    for (const { pattern, provider } of specialMatches) {
        if (typeof pattern === 'string') {
            if (lowerModelId.includes(pattern)) {
                return PROVIDER_LOGO_MAP[provider];
            }
        } else {
            if (pattern.test(lowerModelId)) {
                return PROVIDER_LOGO_MAP[provider];
            }
        }
    }

    // 如果特殊规则没有匹配，则使用通用匹配
    for (const provider of Object.keys(PROVIDER_LOGO_MAP) as SupportedProvider[]) {
        if (lowerModelId.includes(provider)) {
            return PROVIDER_LOGO_MAP[provider];
        }
    }

    // 没有匹配到任何提供商时，返回默认 logo
    return DefaultLogo;
}

// 模型分类相关类型定义
export interface ModelInfo {
    provider: string;     // 提供商名称，如 gemini, claude, gpt
    version: string;      // 主要版本号，如 2.0, 4, 3.5
    variant: string;      // 变体名称，如 pro, vision, turbo
    subVersion: string;   // 子版本号，如 preview-03-25
}

/**
 * 标准化模型ID，将空格转为连字符
 * @param modelId 原始模型ID
 * @returns 标准化后的模型ID
 */
export function normalizeModelId(modelId: string): string {
    if (!modelId) return '';
    
    // 将空格替换为连字符，并确保连续的连字符只保留一个
    return modelId.trim().replace(/\s+/g, '-').replace(/-+/g, '-').toLowerCase();
}

/**
 * 解析模型ID，提取出提供商、版本等信息
 * @param modelId 模型ID
 * @returns 模型信息对象
 */
export function parseModelId(modelId: string): ModelInfo {
    // 默认返回值
    const defaultInfo: ModelInfo = {
        provider: 'unknown',
        version: '0',
        variant: '',
        subVersion: ''
    };
    
    // 首先标准化模型ID
    const normalizedId = normalizeModelId(modelId);
    if (!normalizedId) return defaultInfo;
    
    // 分割模型ID
    const parts = normalizedId.split('-').filter(Boolean);
    if (parts.length === 0) return defaultInfo;
    
    // 提取提供商名称
    const provider = parts[0] || 'unknown';
    
    // 尝试识别版本号（通常是数字或数字+小数点格式）
    let versionIndex = -1;
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        if (part && /^\d+(\.\d+)?$/.test(part)) {
            versionIndex = i;
            break;
        }
    }
    
    // 如果找到版本号
    if (versionIndex > 0 && versionIndex < parts.length) {
        const version = parts[versionIndex] || '0';
        // 版本号后面的部分视为变体和子版本
        const remainingParts = parts.slice(versionIndex + 1).filter(Boolean);
        
        if (remainingParts.length === 0) {
            // 只有提供商和版本
            return { provider, version, variant: '', subVersion: '' };
        } else if (remainingParts.length === 1) {
            // 提供商、版本和变体
            const variant = remainingParts[0] || '';
            return { provider, version, variant, subVersion: '' };
        } else {
            // 提供商、版本、变体和子版本
            const variant = remainingParts[0] || '';
            const subVersion = remainingParts.slice(1).join('-');
            return { provider, version, variant, subVersion };
        }
    } else {
        // 如果没有找到版本号，则假设第二部分是版本号
        const version = parts.length > 1 ? parts[1] || '0' : '0';
        const variant = parts.length > 2 ? parts[2] || '' : '';
        const subVersion = parts.length > 3 ? parts.slice(3).join('-') : '';
        
        return { provider, version, variant, subVersion };
    }
}

/**
 * 对比两个模型ID是否属于同一类别
 * @param modelId1 第一个模型ID
 * @param modelId2 第二个模型ID
 * @param level 匹配级别：1=仅提供商，2=提供商+版本，3=提供商+版本+变体
 * @returns 是否匹配
 */
export function isSameModelCategory(modelId1: string, modelId2: string, level: 1 | 2 | 3 = 2): boolean {
    const info1 = parseModelId(modelId1);
    const info2 = parseModelId(modelId2);
    
    if (level === 1) {
        return info1.provider === info2.provider;
    } else if (level === 2) {
        return info1.provider === info2.provider && info1.version === info2.version;
    } else {
        return (
            info1.provider === info2.provider && 
            info1.version === info2.version && 
            info1.variant === info2.variant
        );
    }
}

/**
 * 获取模型的分类名称
 * @param modelId 模型ID
 * @param level 分类级别：1=仅提供商，2=提供商+版本，3=提供商+版本+变体
 * @returns 分类名称
 */
export function getModelCategory(modelId: string, level: 1 | 2 | 3 = 2): string {
    const info = parseModelId(modelId);
    
    if (level === 1) {
        return info.provider;
    } else if (level === 2) {
        return `${info.provider}-${info.version}`;
    } else {
        return info.variant 
            ? `${info.provider}-${info.version}-${info.variant}`
            : `${info.provider}-${info.version}`;
    }
}