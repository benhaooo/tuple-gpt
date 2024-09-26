export const generateData = (session, messages, model) => {
    let data = {
        model,
        messages: messages,
    }
    if (model.includes('o1')) {
        return data
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