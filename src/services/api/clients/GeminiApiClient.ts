import { ApiClient } from "../interfaces/ApiClient";
import { Provider } from "@/stores/modules/llm";

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
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Gemini API request failed:", error);
      throw error;
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
        const errorText = await response.text();
        const error = new Error(
          `Gemini API error: ${response.status} ${response.statusText} - ${errorText}`
        );
        if (onError) onError(error);
        throw error;
      }

      if (!response.body) {
        const error = new Error("响应中没有响应体");
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
                console.error("处理Gemini响应块失败:", error);
              }
            }
          }
        }

        if (onComplete) onComplete(fullResponse);
      } catch (error) {
        const streamError = new Error(`流读取错误: ${error}`);
        if (onError) onError(streamError);
        throw streamError;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("Gemini 流式 API 请求失败:", error);
      if (onError && error instanceof Error) onError(error);
      throw error;
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
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`
        );
      }
      const result = await response.json();
      return result.models.map((item: any) => ({
        id: item.name.replace("models/", ""),
        name: item.displayName,
        provider: this.provider.id,
      }));
    } catch (error) {
      console.error("Gemini API request failed:", error);
      throw error;
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
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Gemini API request failed:", error);
      throw error;
    }
  }
}
