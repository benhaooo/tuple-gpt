import { LlmPlugin } from './interfaces/LlmPlugin';

/**
 * 文档处理插件
 * 处理上传的文档，提取内容，并将内容添加到上下文
 */
export class DocumentProcessingPlugin implements LlmPlugin {
  name = '文档处理插件';
  description = '自动处理上传文档，提取内容并添加到对话上下文';
  enabled = true;
  
  /**
   * 处理请求，检测是否有文档需要处理
   */
  async processRequest(messages: any[], options?: any): Promise<{messages: any[], options?: any}> {
    if (!options?.document) {
      // 没有文档数据，直接返回原始消息
      return { messages, options };
    }
    
    try {
      // 获取文档数据
      const document = options.document;
      
      // 处理文档
      const content = await this.extractDocumentContent(document);
      
      if (!content) {
        // 无法提取内容，返回原始消息
        return { messages, options };
      }
      
      // 创建系统消息，包含文档内容
      const docSystemMessage = {
        role: 'system',
        content: `以下是用户上传的文档内容，请在回答时参考这些信息：\n\n${content}`
      };
      
      // 在消息列表开头添加系统消息（或替换现有系统消息）
      let newMessages = [...messages];
      const sysMessageIndex = newMessages.findIndex(msg => msg.role === 'system');
      
      if (sysMessageIndex >= 0) {
        // 更新现有系统消息
        newMessages[sysMessageIndex] = {
          ...newMessages[sysMessageIndex],
          content: `${newMessages[sysMessageIndex].content}\n\n${docSystemMessage.content}`
        };
      } else {
        // 添加新的系统消息
        newMessages = [docSystemMessage, ...newMessages];
      }
      
      // 添加通知用户的消息
      const lastUserMessageIndex = newMessages.findIndex(msg => msg.role === 'user');
      if (lastUserMessageIndex >= 0) {
        // 添加助手消息，通知文档已处理
        newMessages.splice(lastUserMessageIndex + 1, 0, {
          role: 'assistant',
          content: '我已经处理了您上传的文档，您可以基于文档内容提问。'
        });
      }
      
      // 移除文档选项，避免重复处理
      const { document: _, ...restOptions } = options;
      
      return {
        messages: newMessages,
        options: restOptions
      };
    } catch (error) {
      console.error('文档处理失败:', error);
      // 出错时返回原始消息
      return { messages, options };
    }
  }
  
  /**
   * 提取文档内容
   * @param document 文档对象（文件、URL或已有内容）
   * @returns 提取的文本内容
   */
  private async extractDocumentContent(document: any): Promise<string | null> {
    // 这里实现具体的文档处理逻辑
    // 处理不同类型的文档：PDF、Word、文本等
    
    // 示例实现，实际项目中需要替换为真实实现
    try {
      if (document instanceof File) {
        // 处理文件对象
        return await this.processFile(document);
      } else if (typeof document === 'string') {
        // 处理URL或文本内容
        if (document.startsWith('http')) {
          // 处理URL
          return await this.processUrl(document);
        } else {
          // 处理纯文本
          return document;
        }
      } else if (document.content) {
        // 已提取的内容
        return document.content;
      }
      
      return null;
    } catch (error) {
      console.error('文档内容提取失败:', error);
      return null;
    }
  }
  
  /**
   * 处理文件对象
   * @param file 文件对象
   * @returns 提取的文本内容
   */
  private async processFile(file: File): Promise<string> {
    // 根据文件类型处理
    const fileType = file.type || '';
    
    if (fileType.includes('pdf')) {
      // 处理PDF文件
      // 实际项目中可使用pdf.js等库
      return `[这里是PDF文件内容，实际项目中需要实现PDF解析]\n文件名: ${file.name}`;
    } else if (fileType.includes('word') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
      // 处理Word文档
      // 实际项目中可使用mammoth.js等库
      return `[这里是Word文档内容，实际项目中需要实现Word解析]\n文件名: ${file.name}`;
    } else if (fileType.includes('text') || file.name.endsWith('.txt')) {
      // 处理纯文本
      return await file.text();
    } else {
      // 其他类型文件
      return `无法处理的文件类型: ${fileType || file.name}`;
    }
  }
  
  /**
   * 处理URL
   * @param url 文档URL
   * @returns 提取的文本内容
   */
  private async processUrl(url: string): Promise<string> {
    try {
      // 获取URL内容
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`无法获取URL内容: ${response.status}`);
      }
      
      // 检查内容类型
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/html')) {
        // 处理HTML内容
        const html = await response.text();
        // 简单提取HTML文本（实际项目中可使用更复杂的HTML解析）
        return this.extractTextFromHtml(html);
      } else if (contentType.includes('application/pdf')) {
        // 处理PDF URL
        return `[这里是PDF内容，实际项目中需要实现从URL加载PDF解析]\nURL: ${url}`;
      } else {
        // 其他类型直接返回文本
        return await response.text();
      }
    } catch (error) {
      console.error('URL处理失败:', error);
      return `无法处理URL: ${url}`;
    }
  }
  
  /**
   * 从HTML提取文本（简单实现）
   * @param html HTML内容
   * @returns 提取的文本内容
   */
  private extractTextFromHtml(html: string): string {
    // 创建一个虚拟DOM元素解析HTML
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;
    
    // 移除脚本和样式标签
    const scripts = tempElement.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    // 获取文本内容
    const text = tempElement.textContent || '';
    
    // 清理文本
    return text
      .replace(/\s+/g, ' ')  // 合并多个空白字符
      .replace(/\n+/g, '\n') // 合并多个换行
      .trim();
  }
} 