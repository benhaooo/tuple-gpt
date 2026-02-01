// 定义 Turtle API 响应类型
interface TurtleResponse {
    [key: string]: any;
}

// 定义请求配置类型
interface FetchConfig extends RequestInit {
    timeout?: number;
}

export const fetchTurtle = async (): Promise<TurtleResponse> => {
    const response = await fetch('http://localhost:3000/turtle', {
        method: 'POST',
        // 注意：fetch API 本身不支持 timeout 选项，这里可能需要使用 AbortController
        // timeout: 30000
    } as FetchConfig);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: TurtleResponse = await response.json();
    return data;
};

