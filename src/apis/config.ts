interface ApiConfig {
    host: string;
    key: string;
    type: string;
}

interface DefaultApiConfig {
    host: string;
    type: string;
    getter: (key: string) => ApiConfig;
}

export const freeAPI: ApiConfig[] = [
    {
        host: "https://api.chatanywhere.tech",
        key: "sk-ssa2bZK11SXlvHfvWGTBwgNFfouwWqyaBnS0ObuS0ie1PWD3",
        type: "openai"
    },
    {
        host: "https://api.ddaiai.com",
        key: "hk-ervo8b100000398273976e92fcc62e50ba19ac00001b9929",
        type: "openai"
    },
];

export const defaultAPI: DefaultApiConfig = {
    host: "https://swxx-openai.openai.azure.com",
    type: "azure",
    getter(key: string): ApiConfig {
        return { host: this.host, type: this.type, key };
    }
};