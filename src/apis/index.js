import useUserStore from "@/stores/modules/user"

// 环境域名
// const apiHostUrl = import.meta.env.MODE === 'production' ? "http://1.12.43.224" : "http://127.0.0.1:8091"
const apiHostUrl = 'http://1.12.43.224'

const getHeaders = () => {
    const userStore = useUserStore()
    const headers = {
        Authorization: userStore.getToken(),
        'Content-Type': 'application/json;charset=utf-8'
    }
    return headers
}

export const completions = (data) => {
    return fetch(`${apiHostUrl}/api/v1/chatgpt/chat/completions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    })
}
export const analysisCompletions = (data) => {
    return fetch(`${apiHostUrl}/api/v1/chatgpt/analysis/chart`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
    })
}

// 上传文件
export const uploadFile = (formData) => {
    return fetch(`${apiHostUrl}/api/v1/file/upload`, {
        method: 'POST',
        body: formData,
    })
}

export const userLogin = (code) => {
    return fetch(`${apiHostUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `code=${code}`
    });
}


export const queryUserAccount = () => {
    return fetch(`${apiHostUrl}/api/v1/chatgpt/account`, {
        method: 'GET',
        headers: getHeaders()
    });
}

export const queryProductList = () => {
    return fetch(`${apiHostUrl}/api/v1/sale/query_product_list`, {
        method: "get",
        headers: getHeaders(),
    });
}

export const createPayOrder = (productId) => {
    return fetch(`${apiHostUrl}/api/v1/sale/create_pay_order`, {
        method: "post",
        headers: {
            ...getHeaders(),
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        },
        body: `productId=${productId}`
    });
}


export const queryPromptList = () => {
    return fetch(`${apiHostUrl}/api/v1/prompt/query_prompt_list`, {
        method: "get",
    });
}