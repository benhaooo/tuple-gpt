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
        const { handleError, createApiError } = require('@/utils/error-handler');
        handleError(createApiError('Stream data parsing failed'), 'Stream Data Picker');
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
        onError?: (error: Error) => void,
        dataPicker: DataPickerFunction = defalutDataPicker
    ) => {
        const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
        const lineProcessor = contentType.includes('application/x-ndjson') ?
            (line: string) => {
                try {
                    const trimmed = line.trim();
                    const data = JSON.parse(trimmed);
                    ollamaDataPicker(data, onMessage);
                } catch (error) {
                    const { handleError, createApiError } = require('@/utils/error-handler');
                    handleError(createApiError('NDJSON processing failed'), 'Stream NDJSON Processor');
                    onError?.(error as Error);
                }
            } :
            (line: string) => {
                try {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data:')) {
                        const jsonStr = trimmed.substring(5).trim();
                        if (jsonStr !== '[DONE]') {
                            const data = JSON.parse(jsonStr);
                            defalutDataPicker(data, onMessage);
                        }
                    }
                } catch (error) {
                    const { handleError, createApiError } = require('@/utils/error-handler');
                    handleError(createApiError('SSE processing failed'), 'Stream SSE Processor');
                    onError?.(error as Error);
                }
            };

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let isAborted = false;

        const stream = new ReadableStream({
            start(controller) {
                async function push(): Promise<void> {
                    try {
                        if (isAborted) {
                            return;
                        }

                        const { done, value } = await reader.read();
                        if (done) {
                            controller.close();
                            onEnd && onEnd();
                            return;
                        }

                        if (isAborted) {
                            return;
                        }

                        controller.enqueue(value);
                        const chunk = decoder.decode(value);
                        buffer += chunk;
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line && !isAborted) {
                                console.log("🚀 ~ push ~ line:", line);
                                lineProcessor(line);
                            }
                        }

                        if (!isAborted) {
                            push();
                        }
                    } catch (error) {
                        if (!isAborted) {
                            const { handleError, createApiError } = require('@/utils/error-handler');
                            handleError(createApiError('Stream processing error'), 'Stream Processor');
                            onError?.(error as Error);
                            controller.error(error);
                        }
                    }
                }
                push();
            },
            cancel() {
                isAborted = true;
                reader.cancel().catch(error => {
                    const { handleError, createApiError, ErrorSeverity } = require('@/utils/error-handler');
                    handleError(
                        createApiError('Reader cancellation failed', undefined, ErrorSeverity.LOW),
                        'Stream Reader'
                    );
                });
            }
        });

        // 返回带有 abort 方法的对象，便于外部控制
        return {
            stream,
            abort: () => {
                isAborted = true;
                stream.cancel();
            }
        };
    };

    return {
        streamController
    };
}