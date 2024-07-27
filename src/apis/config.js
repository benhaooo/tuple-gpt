export const freeAPI = [
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
]

export const defaultAPI = {
    host: "https://meiguodongbu.openai.azure.com",
    type: "azure",
    getter(key) {
        return { host: this.host, type: this.type, key };
    }
}