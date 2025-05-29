// 随机id码
const generateUniqueId = (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// 延迟
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// 复制到剪贴板：解决http下无法复制的问题
const copyToClip = (text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const input = document.createElement('textarea');
            input.setAttribute('readonly', 'readonly');
            input.value = text;
            document.body.appendChild(input);
            input.select();
            if (document.execCommand('copy'))
                document.execCommand('copy');
            document.body.removeChild(input);
            resolve(text);
        }
        catch (error) {
            reject(error);
        }
    });
};

// 防抖函数
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (this: any, ...args: Parameters<T>): void {
        const context = this;

        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
};

// 深拷贝
const deepClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
};

export { generateUniqueId, delay, copyToClip, debounce, deepClone };