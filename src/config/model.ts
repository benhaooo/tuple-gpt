import GeminiProviderLogo from '@/assets/images/models/gemini.png'
import GptProviderLogo from '@/assets/images/models/gpt_4.png'
import DeepseekProviderLogo from '@/assets/images/models/deepseek.png'
import AnthropicProviderLogo from '@/assets/images/providers/anthropic.png'
import DefaultLogo from '@/assets/images/models/embedding.png' // 使用 embedding.png 作为默认 logo

// 明确定义支持的提供商类型
type SupportedProvider = 'gemini' | 'claude' | 'gpt' | 'deepseek';

// 使用 Record 类型确保类型安全
const PROVIDER_LOGO_MAP: Record<SupportedProvider, string> = {
    'gemini': GeminiProviderLogo,
    'claude': AnthropicProviderLogo,
    'gpt': GptProviderLogo,
    'deepseek': DeepseekProviderLogo,
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
    
    // 遍历所有支持的提供商
    for (const provider of Object.keys(PROVIDER_LOGO_MAP) as SupportedProvider[]) {
        // 只要 modelId 包含提供商名称，就返回对应的 logo
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