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


const modelMap = {
    // 'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
    // 'claude-3-opus': 'claude-3-opus-20240229',
    // 'claude-3-sonnet': 'claude-3-sonnet-20240229',
    'o1-preview': 'o1-preview-2024-09-12',
    'o1-mini': 'o1-mini-2024-09-12',
}

export const modelConver = (model) => {
    model = model.trim();
    for (const key of Object.keys(modelMap)) {
        const value = modelMap[key];
        if (key.trim() === model) {
            return value;
        }
        if (value.trim() === model) {
            return key;
        }
    }
    return model;
}
