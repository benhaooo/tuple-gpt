import { ApiConfig, ApiProvider } from './base-service';

// 定义默认 API 配置接口
interface DefaultApiConfig {
    host: string;
    type: ApiProvider;
    getter: (key: string) => ApiConfig;
}

// 免费 API 配置列表
export const freeAPI: ApiConfig[] = [
    {
        host: "https://api.chatanywhere.tech",
        key: "sk-ssa2bZK11SXlvHfvWGTBwgNFfouwWqyaBnS0ObuS0ie1PWD3",
        type: ApiProvider.OPENAI
    },
    {
        host: "https://api.ddaiai.com",
        key: "hk-ervo8b100000398273976e92fcc62e50ba19ac00001b9929",
        type: ApiProvider.OPENAI
    },
];

// 默认 API 配置
export const defaultAPI: DefaultApiConfig = {
    host: "https://swxx-openai.openai.azure.com",
    type: ApiProvider.AZURE,
    getter(key: string): ApiConfig {
        return {
            host: this.host,
            type: this.type,
            key
        };
    }
};

// API 配置常量
export const API_ENDPOINTS = {
    OPENAI: {
        BASE_URL: 'https://api.openai.com',
        CHAT_COMPLETIONS: '/v1/chat/completions',
    },
    AZURE: {
        API_VERSION: '2024-04-01-preview',
    },
    DOUBAO: {
        PROXY_URL: 'http://localhost:3111/apis/proxy',
        // PROXY_URL: 'https://swxx-dev-tuple.wawoai.com/apis/proxy', // 备用代理地址
    },
    LOCAL: {
        CHAT_ENDPOINT: '/api/chat',
    },
} as const;

// 请求超时配置
export const REQUEST_TIMEOUTS = {
    DEFAULT: 30000,      // 30秒
    STREAM: 60000,       // 流式请求 60秒
    UPLOAD: 120000,      // 上传请求 120秒
} as const;

// 重试配置
export const RETRY_CONFIG = {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,   // 1秒
    BACKOFF_FACTOR: 2,   // 指数退避因子
} as const;