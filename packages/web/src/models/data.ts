import useConfigStore from '@/stores/modules/config'
import { computed } from 'vue'

interface Session {
    maxTokens?: number
    temperature?: number
    top_p?: number
    presence_penalty?: number
    frequency_penalty?: number
    randomTemperature?: boolean
    [key: string]: any
}

interface MessageData {
    model: string
    messages: any[]
    stream?: boolean
    max_tokens?: number
    temperature?: number
    top_p?: number
    presence_penalty?: number
    frequency_penalty?: number
    response_format?: { type: string }
    [key: string]: any
}

interface Service {
    provider: string
    api_url: string
    api_key: string
    url_suffix?: string
    groups: Group[]
    [key: string]: any
}

interface Group {
    name: string
    models: Model[]
    [key: string]: any
}

interface Model {
    name: string
    [key: string]: any
}

export const generateData = (session: Session, messages: any[], model: string, formatter: string): MessageData => {
    let data: MessageData = {
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
export const randomTemperature = (session: Session, datas: MessageData[]): MessageData[] => {
    if (session.randomTemperature) {
        for (let i = 0; i < datas.length; i++) {
            if (!datas[i].model.includes('o1')) datas[i].temperature = Number(((i + 1) / (datas.length + 1)).toFixed(2))
        }
    }
    return datas
}

const assembleUrl = (service: Service, data: MessageData): string => {
    let { api_url, url_suffix } = service
    if (api_url.includes('{DEPLOYMENT}')) api_url = api_url.replace('{DEPLOYMENT}', data.model)
    if (api_url.endsWith('#')) return api_url
    return `${api_url}/${url_suffix || 'v1/chat/completions'}`
}
const assembleFetchData = (service: Service, data: MessageData): RequestInit => {
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

interface ParsedModelID {
    provider: string
    groupName: string
    modelName: string
}

const parseModelID = (id?: string): ParsedModelID => {
    if (!id) return { provider: '', groupName: '', modelName: '' }
    
    // 检查id是否为字符串类型，如果不是则返回空值
    if (typeof id !== 'string') {
        console.warn('Model ID is not a string:', id);
        return { provider: '', groupName: '', modelName: '' }
    }
    
    try {
    const [provider, groupName, modelName] = id.split('/_')
        return { provider: provider || '', groupName: groupName || '', modelName: modelName || '' }
    } catch (error) {
        console.error('Failed to parse model ID:', id, error)
        return { provider: '', groupName: '', modelName: '' }
    }
}
const getServiceModel = (id?: string): { service: Service; group: Group; model: Model } => {
    const { serviceConfig } = useConfigStore()

    const { provider, groupName, modelName } = parseModelID(id)
    const service = serviceConfig.find((service: Service) => service.provider === provider) || { provider: '未知服务商', groups: [] } as Service
    const group = service.groups.find((group: Group) => group.name === groupName) || { name: '未知分组', models: [] } as Group
    const model = group.models.find((model: Model) => model.name === modelName) || { name: '未知模型' } as Model
    return { service, group, model }
}


// 对模型的请求封装
export const useModel = (id: string) => {
    console.log("🚀 ~ useModel ~ id:", id)
    const { service, group, model } = getServiceModel(id)
    const serviceStore = useConfigStore()
    const modelInfo = computed(() => serviceStore.getModelInfo(id))
    const serviceFetch = (data: MessageData): Promise<Response> => {
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


export const useServiceFetch = (service: Service, data: MessageData) => {
    const url = assembleUrl(service, data)
    const fetchData = assembleFetchData(service, data)
    return () => fetch(url, fetchData)
}