// 随机id码
const generateUniqueId = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

export { generateUniqueId, delay, copyToClip }