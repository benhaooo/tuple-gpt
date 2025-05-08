export const generateData = (session, messages, model, formatter) => {
    let data = {
        model,
        messages: messages,
    }
    if (model.includes('o1')) {
        return data
    }
    // json格式回复实现方式
    if (formatter) {
        if (model.includes('moonshot')) {
            data.response_format = { "type": "json_object" }
        } else {
            data.messages.push({
                role: "assistant",
                content: formatter
            })
        }
    }

    data = {
        ...data,
        stream: true,
        max_tokens: session.maxTokens,
        temperature: session.temperature,
        top_p: session.top_p,
        presence_penalty: session.presence_penalty,
        frequency_penalty: session.frequency_penalty,
    }
    return data
}
export const randomTemperature = (session, datas) => {
    if (session.randomTemperature) {
        for (let i = 0; i < datas.length; i++) {
            if (!datas[i].model.includes('o1')) datas[i].temperature = Number(((i + 1) / (datas.length + 1)).toFixed(2))
        }
    }
    return datas
}

import useConfigStore from '@/stores/modules/config'
import { computed } from 'vue'


const assembleUrl = (service, data) => {
    let { api_url, url_suffix } = service
    if (api_url.includes('{DEPLOYMENT}')) api_url = api_url.replace('{DEPLOYMENT}', data.model)
    if (api_url.endsWith('#')) return api_url
    return `${api_url}/${url_suffix || 'v1/chat/completions'}`
}
const assembleFetchData = (service, data) => {
    switch (service.provider) {
        case 'Azure':
            return {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': service.api_key,
                },
                body: JSON.stringify(data),
            }
        case '扣子':
            return {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${service.api_key}`,
                },
                body: JSON.stringify({
                    "bot_id": data.model,
                    "user_id": "123123***",
                    "stream": true,
                    "auto_save_history": true,
                    "additional_messages": [
                        {
                            "role": "user",
                            "content": data.messages[0].content,
                            "content_type": "text"
                        }
                    ]
                }),
            }

        default:
            return {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${service.api_key}`,
                },
                body: JSON.stringify(data),
            }
    }
}

const parseModelID = (id) => {
    const [provider, groupName, modelName] = id.split('/_');
    return { provider, groupName, modelName };
}
const getServiceModel = (id) => {
    const { serviceConfig } = useConfigStore()

    const { provider, groupName, modelName } = id ? parseModelID(id) : { provider: '', groupName: '', modelName: '' };
    const service = serviceConfig.find(service => service.provider === provider) || { provider: '未知服务商', groups: [] };
    const group = service.groups.find(group => group.name === groupName) || { name: '未知分组', models: [] };
    const model = group.models.find(model => model.name === modelName) || { name: '未知模型' };
    return { service, group, model };
}


// 对模型的请求封装
export const useModel = (id) => {
    console.log("🚀 ~ useModel ~ id:", id)
    // const { serviceConfig, getModelInfo } = useConfigStore?.()
    const { service, group, model } = getServiceModel(id)
    const modelInfo = computed(() => serviceStore.getModelInfo(id))
    const serviceFetch = (data) => {
        data.model = model.name
        const url = assembleUrl(service, data)
        const fetchData = assembleFetchData(service, data)
        return fetch(url, fetchData)
    }

    return {
        modelInfo,
        service,
        group,
        model,
        serviceFetch
    }
}


export const useServiceFetch = (service, data) => {
    const url = assembleUrl(service)
    const fetchData = assembleFetchData(service, data)
    return () => fetch(url, fetchData)
}