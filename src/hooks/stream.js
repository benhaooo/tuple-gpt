const defalutDataPicker = (data, onMessage) => {
    try {
        const { choices: [{ delta: { content = '', reasoning_content = '' } }], usage } = data;
        onMessage?.(content || '', reasoning_content || '', usage)
    } catch (error) {
        console.error(error)
    }

}
const ollamaDataPicker = (data, onMessage) => {
    const { message: { content } } = data
    onMessage?.(content)
}

export default function useStream() {
    const streamController = (response, onMessage, onEnd, dataPicker = defalutDataPicker) => {

        const contentType = (response.headers.get('Content-Type') || '').toLowerCase();
        const lineProcessor = contentType.includes('application/x-ndjson') ? (line) => {
            const trimmed = line.trim();
            const data = JSON.parse(trimmed);
            ollamaDataPicker(data, onMessage)
        } : (line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
                const jsonStr = trimmed.substring(5).trim();
                if (jsonStr !== '[DONE]') {
                    const data = JSON.parse(jsonStr);
                    defalutDataPicker(data, onMessage)
                }
            }
        };


        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const stream = new ReadableStream({
            start(ctl) {
                async function push() {
                    const { done, value } = await reader.read();
                    if (done) {
                        ctl.close();
                        onEnd && onEnd();
                        return;
                    }
                    ctl.enqueue(value);
                    const chunk = decoder.decode(value);
                    buffer += chunk;
                    const lines = buffer.split('\n');
                    buffer = lines.pop();
                    for (const line of lines) {
                        if (line) {
                            console.log("🚀 ~ push ~ line:", line)
                            lineProcessor(line)
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

        return stream
    }

    return {
        streamController
    }

}