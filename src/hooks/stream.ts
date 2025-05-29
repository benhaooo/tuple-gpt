interface StreamData {
    choices?: [{
        delta?: {
            content?: string;
            reasoning_content?: string;
        }
    }];
    usage?: any;
    message?: {
        content: string;
    };
}

type MessageCallback = (content: string, reasoningContent?: string, usage?: any) => void;
type EndCallback = () => void;
type DataPickerFunction = (data: StreamData, onMessage?: MessageCallback) => void;

const defalutDataPicker: DataPickerFunction = (data, onMessage) => {
    try {
        const { choices: [{ delta: { content = '', reasoning_content = '' } }], usage } = data;
        onMessage?.(content || '', reasoning_content || '', usage);
    } catch (error) {
        console.error(error);
    }
};

const ollamaDataPicker: DataPickerFunction = (data, onMessage) => {
    const { message: { content } = { content: '' } } = data;
    onMessage?.(content);
};

export default function useStream() {
    const streamController = (
        response: Response, 
        onMessage: MessageCallback, 
        onEnd?: EndCallback, 
        dataPicker: DataPickerFunction = defalutDataPicker
    ) => {
        const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
        const lineProcessor = contentType.includes('application/x-ndjson') ? 
            (line: string) => {
                const trimmed = line.trim();
                const data = JSON.parse(trimmed);
                ollamaDataPicker(data, onMessage);
            } : 
            (line: string) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('data:')) {
                    const jsonStr = trimmed.substring(5).trim();
                    if (jsonStr !== '[DONE]') {
                        const data = JSON.parse(jsonStr);
                        defalutDataPicker(data, onMessage);
                    }
                }
            };

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const stream = new ReadableStream({
            start(controller) {
                async function push(): Promise<void> {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        onEnd && onEnd();
                        return;
                    }
                    controller.enqueue(value);
                    const chunk = decoder.decode(value);
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';
                    for (const line of lines) {
                        if (line) {
                            console.log("🚀 ~ push ~ line:", line);
                            lineProcessor(line);
                        }
                    }
                    push();
                }
                push();
            },
            cancel() {
                reader.cancel();
            }
        });

        return stream;
    };

    return {
        streamController
    };
}