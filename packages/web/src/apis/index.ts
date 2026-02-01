import useConfigStore from "@/stores/modules/config";
import { freeAPI, defaultAPI, REQUEST_TIMEOUTS, RETRY_CONFIG } from "./config";
import { useModel } from "@/models/data";
import {
    BaseApiService,
    ApiServiceFactory,
    ApiConfig,
    RequestData,
    ApiProvider
} from "./base-service";

// 导出类型供外部使用
export type { ApiConfig, RequestData } from "./base-service";
export { ApiProvider } from "./base-service";

// API 服务缓存
const serviceCache = new Map<string, BaseApiService>();

/**
 * 获取或创建 API 服务实例
 */
function getApiService(config: ApiConfig): BaseApiService {
    const cacheKey = `${config.type}-${config.host}-${config.key}`;

    if (!serviceCache.has(cacheKey)) {
        const service = ApiServiceFactory.createService(config);
        serviceCache.set(cacheKey, service);
    }

    return serviceCache.get(cacheKey)!;
}

/**
 * 默认会话请求
 * 使用模型配置中的服务
 */
export const completions = (data: RequestData): Promise<Response> => {
    const id = data.model;
    const { serviceFetch } = useModel(id);
    return serviceFetch(data);
};

/**
 * 免费接口列表重试
 * 按顺序尝试免费 API 和默认 API
 */
export const retryCompletions = async (data: RequestData, model: string): Promise<Response> => {
    const configStore = useConfigStore();
    const retryList = [...freeAPI, defaultAPI.getter(configStore.serverConfig.apiKey)];

    return await retryWithFallback(retryList, data, model);
};

/**
 * 使用回退机制的重试函数
 */
async function retryWithFallback(
    apiConfigs: ApiConfig[],
    data: RequestData,
    model: string
): Promise<Response> {
    let lastError: Error;

    // 处理模型名称转换
    const processedData = {
        ...data,
        model: useModel(data.model).model.name
    };

    for (let i = 0; i < apiConfigs.length; i++) {
        try {
            const config = apiConfigs[i];
            const service = getApiService(config);

            console.log(`Attempting API ${i + 1}/${apiConfigs.length}: ${config.type} - ${config.host}`);

            const response = await service.chatCompletion(processedData);

            if (response.ok) {
                console.log(`API request successful with ${config.type}`);
                return response;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

        } catch (error) {
            lastError = error as Error;
            console.warn(`API ${i + 1} failed:`, error.message);

            // 如果不是最后一个 API，继续尝试下一个
            if (i < apiConfigs.length - 1) {
                continue;
            }
        }
    }

    // 所有 API 都失败了
    throw new Error(`All API endpoints failed. Last error: ${lastError!.message}`);
}

/**
 * 创建 API 服务实例
 */
export function createApiService(config: ApiConfig): BaseApiService {
    return ApiServiceFactory.createService(config);
}

/**
 * 清除 API 服务缓存
 */
export function clearApiServiceCache(): void {
    serviceCache.clear();
}

/**
 * 获取缓存的服务数量
 */
export function getCachedServiceCount(): number {
    return serviceCache.size;
}

/**
 * 验证 API 配置
 */
export function validateApiConfig(config: ApiConfig): boolean {
    if (!config.host || !config.type) {
        return false;
    }

    // 对于非本地服务，需要 API key
    if (config.type !== ApiProvider.LOCAL && !config.key) {
        return false;
    }

    return true;
}

/**
 * 测试 API 连接
 */
export async function testApiConnection(config: ApiConfig): Promise<boolean> {
    if (!validateApiConfig(config)) {
        return false;
    }

    try {
        const service = getApiService(config);
        const testData: RequestData = {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 1,
        };

        const response = await service.chatCompletion(testData);
        return response.ok;
    } catch (error) {
        console.error('API connection test failed:', error);
        return false;
    }
}