// 随机id码
const generateUniqueId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// 延迟
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 复制到剪贴板：解决http下无法复制的问题
const copyToClip = (text) => {
    return new Promise((resolve, reject) => {
        try {
            const input = document.createElement('textarea')
            input.setAttribute('readonly', 'readonly')
            input.value = text
            document.body.appendChild(input)
            input.select()
            if (document.execCommand('copy'))
                document.execCommand('copy')
            document.body.removeChild(input)
            resolve(text)
        }
        catch (error) {
            reject(error)
        }
    })
}
// 
const debounce = (func, wait) => {
    let timeout;

    return function (...args) {
        const context = this;

        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

export { generateUniqueId, delay, copyToClip, debounce }