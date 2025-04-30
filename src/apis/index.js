import useConfigStore from "@/stores/modules/config";
import { freeAPI, defaultAPI } from "./config"
import { useModel } from "@/models/data"

// 默认会话请求
export const completions = (data) => {
    const id = data.model
    const { serviceFetch } = useModel(id)
    return serviceFetch(data)
}

// 免费接口列表重试
export const retryCompletions = (data, model) => {
    const configStore = useConfigStore();
    const retryList = [...freeAPI, defaultAPI.getter(configStore.serverConfig.apiKey)]
    return freeCompletions(retryList, data, model)
}
const freeCompletions = (retryList, data, model, retry = 0) => {
    return new Promise((resolve, reject) => {
        const { url, config } = buildCompletionsConfig(retryList[retry], data, model);
        fetch(url, config)
            .then(response => {
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
// 构建请求配置
const buildCompletionsConfig = ({ host, key, type }, data) => {
    // model名转换
    data = {
        ...data,
        model: useModel(data.model).model.name
    }
    switch (type) {
        case "azure":
            return {
                url: `${host}/openai/deployments/${data.model}/chat/completions?api-version=2024-04-01-preview`,
                config: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'api-key': key,
                    },
                    body: JSON.stringify(data),
                }
            }
        case 'doubao':
            return {
                url: `http://localhost:3111/apis/proxy?apiUrl=${host}/chat/completions`,
                // url: `https://swxx-dev-tuple.wawoai.com/apis/proxy?apiUrl=${host}/chat/completions`,
                config: {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                    },
                    body: JSON.stringify(data),
                }
            }
        case 'local':
            return {
                url: `${host}/api/chat`,
                config: {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                }
            }
        case "openai":
        default:
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