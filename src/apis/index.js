import useConfigStore from "@/stores/modules/config";
import { freeAPI, defaultAPI } from "./config"

const isFreeModel = (model) => {
    return model === 'gpt-3.5-turbo'
}

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

export const retryCompletions = (data, model) => {
    const configStore = useConfigStore();
    const retryList = [...freeAPI, { ...defaultAPI, key: configStore.serverConfig.apiKey }]
    return freeCompletions(retryList, data, model)
}
const freeCompletions = (retryList, data, model, retry = 0) => {
    return new Promise((resolve, reject) => {
        const { url, config } = buildCompletionsConfig(retryList[retry], data, model);
        fetch(url, config)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`请求失败了捏～: ${response.status}`);
                }
                resolve(response);
            })
            .catch((err) => {
                if (retry < retryList.length - 1) {
                    freeCompletions(retryList, data, model, retry + 1).then(resolve).catch(reject);
                } else {
                    reject(err);
                }
            });
    });
};
const buildCompletionsConfig = ({ host, key, type }, data, model = null) => {
    switch (type) {
        case "azure":
            return {
                url: `${host}/openai/deployments/${model}/chat/completions?api-version=2024-04-01-preview`,
                config: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': key,
                    },
                    body: JSON.stringify(data),
                }
            }
        case "openai":
            return {
                url: `${host}/v1/chat/completions`,
                config: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                    },
                    body: JSON.stringify(data),
                }
            }
    }
}