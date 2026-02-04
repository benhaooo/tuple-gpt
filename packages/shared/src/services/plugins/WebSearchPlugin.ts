import { LlmPlugin } from './interfaces/LlmPlugin';

/**
 * 联网搜索插件
 * 根据最后一条消息内容执行网络搜索，并将结果添加到上下文
 */
export class WebSearchPlugin implements LlmPlugin {
  name = '联网搜索插件';
  description = '自动执行网络搜索，丰富回答的信息量';
  enabled = true;
  
  /**
   * 处理请求，检测是否需要联网搜索
   */
  async processRequest(messages: any[], options?: any): Promise<{messages: any[], options?: any}> {
    if (!options?.webSearch) {
      // 没有启用网络搜索，直接返回原始消息
      return { messages, options };
    }
    
    try {
      // 获取最后一条用户消息
      const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
      
      if (!lastUserMessage) {
        return { messages, options };
      }
      
      // 执行网络搜索
      const searchResults = await this.performWebSearch(lastUserMessage.content);
      
      if (!searchResults || searchResults.length === 0) {
        // 搜索无结果，直接返回原始消息
        return { messages, options };
      }
      
      // 创建系统消息，包含搜索结果
      const searchSystemMessage = {
        role: 'system',
        content: `以下是与用户最近问题相关的网络搜索结果，请在回答时考虑这些信息：\n\n${searchResults.join('\n\n')}`
      };
      
      // 在消息列表开头添加系统消息（或替换现有系统消息）
      let newMessages = [...messages];
      const sysMessageIndex = newMessages.findIndex(msg => msg.role === 'system');
      
      if (sysMessageIndex >= 0) {
        // 更新现有系统消息
        newMessages[sysMessageIndex] = {
          ...newMessages[sysMessageIndex],
          content: `${newMessages[sysMessageIndex].content}\n\n${searchSystemMessage.content}`
        };
      } else {
        // 添加新的系统消息
        newMessages = [searchSystemMessage, ...newMessages];
      }
      
      // 移除网络搜索选项，避免重复处理
      const { webSearch, ...restOptions } = options;
      
      return {
        messages: newMessages,
        options: restOptions
      };
    } catch (error) {
      console.error('网络搜索失败:', error);
      // 出错时返回原始消息
      return { messages, options };
    }
  }
  
  /**
   * 执行网络搜索
   * @param query 搜索查询
   * @returns 搜索结果数组
   */
  private async performWebSearch(query: string): Promise<string[]> {
    // 这里实现具体的搜索逻辑
    // 可以调用Google、Bing等搜索API
    
    // 示例实现，实际项目中需要替换为真实实现
    try {
      // 使用假设的搜索API
      const response = await fetch(`https://api.search.example.com/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.SEARCH_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('搜索请求失败');
      }
      
      const result = await response.json();
      
      // 格式化搜索结果
      return result.results.map((item: any) => {
        return `标题: ${item.title}\n链接: ${item.url}\n摘要: ${item.snippet}`;
      });
    } catch (error) {
      console.error('搜索API调用失败:', error);
      
      // 模拟搜索结果（仅用于示例）
      return [
        '模拟搜索结果: 由于无法连接到搜索API，返回模拟数据。实际部署时请替换为真实搜索API。'
      ];
    }
  }
} 