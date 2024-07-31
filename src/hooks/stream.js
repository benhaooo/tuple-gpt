function defalutDataPicker(json, onMessage) {
    if (json.choices && json.choices[0] && json.choices[0].delta) {
        const content = json.choices[0].delta.content || '';
        onMessage && onMessage(content)
    }
}
export default function useStream() {
    const streamController = (response, onMessage, onEnd, dataPicker = defalutDataPicker) => {
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
                        if (line.trim().startsWith('data:')) {
                            const jsonStr = line.trim().substring(5).trim();
                            if (jsonStr !== '[DONE]') {
                                const json = JSON.parse(jsonStr);
                                dataPicker(json, onMessage)
                            }
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