import { ApiClient } from '../interfaces/ApiClient';
import { Provider } from '@/stores/modules/llm';

// OpenAI API客户端
export class OpenAIApiClient implements ApiClient {
  private provider: Provider;
  private apiKey: string;
  private apiHost: string;

  constructor(provider: Provider) {
    this.provider = provider;
    this.apiKey = provider.apiKey;
    this.apiHost = provider.apiHost;

  }

  async chatCompletion(messages: any[], options?: any): Promise<any> {
    const url = `${this.apiHost}/chat/completions`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const body = {
      model: options?.model || 'gpt-3.5-turbo',
      messages,
      ...options
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw error;
    }
  }

  /**
   * 流式聊天完成
   * 实现流式处理逻辑
   */
  async chatCompletionStream(messages: any[], options?: any): Promise<void> {
    const url = `${this.apiHost}/chat/completions`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    };

    const body = {
      model: options?.model || 'gpt-3.5-turbo',
      messages,
      stream: true,
      ...options
    };

    // 从options中提取回调
    const onChunk = options?.onChunk;
    const onComplete = options?.onComplete;
    const onError = options?.onError;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
        if (onError) onError(error);
        throw error;
      }

      // 获取响应流
      if (!response.body) {
        const error = new Error('响应中没有响应体');
        if (onError) onError(error);
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullResponse: any = null;
      let accumulatedContent = '';
      let accumulatedThinking = '';

      try {
        // 读取流数据
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 解码并累积缓冲区
          buffer += decoder.decode(value, { stream: true });

          // 处理缓冲区中的所有完整SSE消息
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 最后一行可能不完整，保留到下一次处理

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);

              // 处理特殊的[DONE]消息
              if (data === '[DONE]') {
                if (onComplete) onComplete(fullResponse);
                return;
              }

              try {
                // 解析JSON响应
                const chunk = JSON.parse(data);

                // 更新完整响应
                if (!fullResponse && chunk.id) {
                  fullResponse = {
                    id: chunk.id,
                    object: chunk.object,
                    created: chunk.created,
                    model: chunk.model,
                    choices: []
                  };
                }

                // 处理OpenAI特有的thinking响应格式
                if (chunk.choices && chunk.choices[0]) {
                  const delta = chunk.choices[0].delta;

                  // 处理thinking内容（OpenAI o1系列使用delta.reasoning）
                  if (delta?.reasoning) {
                    accumulatedThinking += delta.reasoning;

                    const thinkingChunk = {
                      ...chunk,
                      type: 'thinking',
                      content: delta.reasoning,
                      accumulated: accumulatedThinking
                    };

                    if (onChunk) await onChunk(thinkingChunk);
                  }

                  // 处理普通内容
                  if (delta?.content) {
                    accumulatedContent += delta.content;

                    const contentChunk = {
                      ...chunk,
                      type: 'content',
                      content: delta.content,
                      accumulated: accumulatedContent
                    };

                    if (onChunk) await onChunk(contentChunk);
                  }

                  // 如果既没有reasoning也没有content，但有其他delta内容，按原格式处理
                  if (!delta?.reasoning && !delta?.content && Object.keys(delta || {}).length > 0) {
                    if (onChunk) await onChunk(chunk);
                  }
                } else {
                  // 非choices格式的响应，直接传递
                  if (onChunk) await onChunk(chunk);
                }
              } catch (error) {
                console.error('处理响应块失败:', error);
              }
            }
          }
        }

        // 完成流读取
        if (onComplete) onComplete(fullResponse);
      } catch (error) {
        const streamError = new Error(`流读取错误: ${error}`);
        if (onError) onError(streamError);
        throw streamError;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('OpenAI 流式 API 请求失败:', error);
      if (onError && error instanceof Error) onError(error);
      throw error;
    }
  }

  async listModels(): Promise<any> {
    const url = `${this.apiHost}/v1/models`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      const result = await response.json()
      return result.data.map((item: any) => ({
        id: item.id,
        name: item.name || item.id,
        provider: this.provider.id,
      }));
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw error;
    }
  }

  async generateImage(prompt: string, options?: any): Promise<any> {
    const url = `${this.apiHost}/images/generations`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const body = {
      prompt,
      n: options?.n || 1,
      size: options?.size || '1024x1024',
      response_format: options?.response_format || 'url',
      ...options
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw error;
    }
  }

  async embeddings(input: string | string[]): Promise<any> {
    const url = `${this.apiHost}/embeddings`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };

    const body = {
      model: 'text-embedding-ada-002',
      input: Array.isArray(input) ? input : [input]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw error;
    }
  }
} 