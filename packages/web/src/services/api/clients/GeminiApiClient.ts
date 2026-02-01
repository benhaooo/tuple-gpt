import { ApiClient } from "../interfaces/ApiClient";
import { Provider } from "@/stores/modules/llm";
import { ApiErrorConverter } from '@/utils/api-error-converter';

// Gemini API客户端
export class GeminiApiClient implements ApiClient {
  private provider: Provider;
  private apiKey: string;
  private apiHost: string;

  constructor(provider: Provider) {
    this.provider = provider;
    this.apiKey = provider.apiKey;
    this.apiHost =
      provider.apiHost || "https://generativelanguage.googleapis.com/v1";
  }

  async chatCompletion(messages: any[], options?: any): Promise<any> {
    // 将messages转换为Gemini格式
    const geminiMessages = this.convertMessagesToGeminiFormat(messages);

    const url = `${this.apiHost}/models/${
      options?.model || "gemini-1.5-pro"
    }:generateContent?key=${this.apiKey}`;
    const headers = {
      "Content-Type": "application/json",
    };

    const body = {
      contents: geminiMessages,
      generationConfig: {
        temperature: options?.temperature || 0.7,
        topK: options?.topK || 40,
        topP: options?.topP || 0.95,
        maxOutputTokens: options?.max_tokens || 8192,
        ...options,
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || { message: `HTTP ${response.status}: ${response.statusText}` }
        };
        throw ApiErrorConverter.convertToErrorBlock(error, this.provider.type, options?.model);
      }

      return await response.json();
    } catch (error) {
      // 如果已经是转换后的错误，直接抛出
      if (error.type && error.message) {
        throw error;
      }
      // 否则进行转换
      throw ApiErrorConverter.convertToErrorBlock(error, this.provider.type, options?.model);
    }
  }

  /**
   * 流式聊天完成
   * 实现Gemini的流式处理逻辑，预留thinking模型支持
   */
  async chatCompletionStream(messages: any[], options?: any): Promise<void> {
    const geminiMessages = this.convertMessagesToGeminiFormat(messages);

    const url = `${this.apiHost}/v1beta/models/${options?.model}:streamGenerateContent?alt=sse`;
    const headers = {
      "Content-Type": "application/json",
      "x-goog-api-key": this.apiKey,
    };

    const body = {
      contents: geminiMessages,
      generationConfig: {
        temperature: options?.temperature,
        // topK: options?.topK || 40,
        // topP: options?.topP || 0.95,
        // maxOutputTokens: options?.max_tokens || 8192,
        // ...options,
        thinkingConfig: { includeThoughts: false, thinkingBudget: 0 },
      },
    };

    // 从options中提取回调
    const onChunk = options?.onChunk;
    const onComplete = options?.onComplete;
    const onError = options?.onError;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || { message: `HTTP ${response.status}: ${response.statusText}` }
        };
        const convertedError = ApiErrorConverter.convertToErrorBlock(error, this.provider.type, options?.model);
        if (onError) onError(convertedError);
        throw convertedError;
      }

      if (!response.body) {
        const error = ApiErrorConverter.convertToErrorBlock(
          new Error("响应中没有响应体"),
          this.provider.type,
          options?.model
        );
        if (onError) onError(error);
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullResponse: any = null;
      let accumulatedContent = "";
      let accumulatedThinking = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6); // 移除 'data: ' 前缀

              // 跳过空数据
              if (!data.trim()) {
                continue;
              }

              try {
                const chunk = JSON.parse(data);

                // 更新完整响应
                if (!fullResponse && chunk.candidates) {
                  fullResponse = chunk;
                }

                // 先处理Gemini特有的响应格式，确保所有文本内容都被处理
                let hasContent = false;
                if (chunk.candidates && chunk.candidates[0]) {
                  const candidate = chunk.candidates[0];
                  if (candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                      if (part.text) {
                        hasContent = true;
                        const content = part.text;

                        // 检查是否是thinking内容（预留扩展点）
                        if (this.isThinkingContent(chunk, content)) {
                          accumulatedThinking += content;

                          const thinkingChunk = {
                            ...chunk,
                            type: "thinking",
                            content: content,
                            accumulated: accumulatedThinking,
                          };

                          if (onChunk) await onChunk(thinkingChunk);
                        } else {
                          accumulatedContent += content;

                          const contentChunk = {
                            ...chunk,
                            type: "content",
                            content: content,
                            accumulated: accumulatedContent,
                          };

                          if (onChunk) await onChunk(contentChunk);
                        }
                      }
                    }
                  }
                }

                // 如果没有处理到内容，但有其他类型的响应块，直接传递
                if (!hasContent && chunk.candidates) {
                  if (onChunk) await onChunk(chunk);
                }

                // 在处理完所有内容后，再检查是否流式结束
                if (
                  chunk.candidates &&
                  chunk.candidates[0] &&
                  chunk.candidates[0].finishReason === "STOP"
                ) {
                  if (onComplete) onComplete(fullResponse);
                  return;
                }
              } catch (error) {
                // 忽略响应块处理错误，避免中断流式响应
              }
            }
          }
        }

        if (onComplete) onComplete(fullResponse);
      } catch (error) {
        const convertedError = ApiErrorConverter.convertToErrorBlock(
          error,
          this.provider.type,
          options?.model
        );
        if (onError) onError(convertedError);
        throw convertedError;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      // 如果已经是转换后的错误，直接处理
      if (error.type && error.message) {
        if (onError) onError(error);
        throw error;
      }
      // 否则进行转换
      const convertedError = ApiErrorConverter.convertToErrorBlock(
        error,
        this.provider.type,
        options?.model
      );
      if (onError) onError(convertedError);
      throw convertedError;
    }
  }

  /**
   * 判断是否是thinking内容
   * 扩展点：根据Gemini thinking模型的实际格式进行调整
   */
  private isThinkingContent(chunk: any, content: string): boolean {
    // 预留扩展点：根据Gemini thinking模型的实际格式判断
    // 目前Gemini可能还没有thinking模型，这里提供扩展接口

    // 可以根据chunk中的特定字段判断是否为thinking内容
    // 例如：if (chunk.candidates?.[0]?.content?.role === 'thinking') return true;

    // 示例实现：检查特定的标记
    if (content.includes("<thinking>") || content.includes("</thinking>")) {
      return true;
    }

    // 默认返回false，表示是普通内容
    return false;
  }

  private convertMessagesToGeminiFormat(messages: any[]): any[] {
    return messages.map((msg) => {
      let role = msg.role === "user" ? "user" : "model";

      // 处理系统消息
      if (msg.role === "system") {
        role = "user";
      }

      return {
        role,
        parts: [{ text: msg.content }],
      };
    });
  }

  async listModels(): Promise<any> {
    const url = `${this.apiHost}/v1beta/models?key=${this.apiKey}`;
    const headers = {
      "Content-Type": "application/json",
    };

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || { message: `HTTP ${response.status}: ${response.statusText}` }
        };
        throw ApiErrorConverter.convertToErrorBlock(error, this.provider.type);
      }
      const result = await response.json();
      return result.models.map((item: any) => ({
        id: item.name.replace("models/", ""),
        name: item.displayName,
        provider: this.provider.id,
      }));
    } catch (error) {
      // 如果已经是转换后的错误，直接抛出
      if (error.type && error.message) {
        throw error;
      }
      // 否则进行转换
      throw ApiErrorConverter.convertToErrorBlock(error, this.provider.type);
    }
  }

  async embeddings(input: string | string[]): Promise<any> {
    const url = `${this.apiHost}/models/embedding-001:embedContent?key=${this.apiKey}`;
    const headers = {
      "Content-Type": "application/json",
    };

    const body = {
      content: {
        parts: [
          {
            text: Array.isArray(input) ? input.join(" ") : input,
          },
        ],
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || { message: `HTTP ${response.status}: ${response.statusText}` }
        };
        throw ApiErrorConverter.convertToErrorBlock(error, this.provider.type);
      }

      return await response.json();
    } catch (error) {
      // 如果已经是转换后的错误，直接抛出
      if (error.type && error.message) {
        throw error;
      }
      // 否则进行转换
      throw ApiErrorConverter.convertToErrorBlock(error, this.provider.type);
    }
  }
}
