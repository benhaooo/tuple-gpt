import useConfigStore from "@/stores/modules/config";

// 环境域名
const apiHostUrl = import.meta.env.MODE === 'production' ? "http://1.12.43.224" : "http://127.0.0.1:8091"

const isFreeModel = (model) => {
    return model === 'gpt-3.5-turbo'
}
const freeHost = ""
const getHeaders = (model) => {
    const configStore = useConfigStore()
    const headers = {
        'Content-Type': 'application/json',
        ...(isFreeModel(model) ? { 'Authorization': `Bearer hk-ervo8b100000398273976e92fcc62e50ba19ac00001b9929` } : { 'api-key': configStore.serverConfig.apiKey })
    }
    return headers
}
const getHost = (model) => {
    if (isFreeModel(model)) return 'https://api.ddaiai.com/v1/chat/completions'
    return `https://meiguodongbu.openai.azure.com/openai/deployments/${model}/chat/completions?api-version=2024-04-01-preview`
}

export const completions = (data, model) => {

    return fetch(`${getHost(model)}`, {
        method: 'POST',
        headers: getHeaders(model),
        body: JSON.stringify(data),
    })
}

export const freeCompletions = (data, retry = 3) => {

}

export const onceCompletions = (prompt, sessionId) => {
    return fetch(`https://swxx.api.wawoai.com/apis/gpt/chat/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
            prompt,
            sessionId
        }),
    })
}
