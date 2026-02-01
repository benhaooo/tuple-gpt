import { LlmPlugin } from './interfaces/LlmPlugin';

/**
 * 音频转录插件
 * 将音频消息转换为文本消息
 */
export class AudioTranscriptionPlugin implements LlmPlugin {
  name = '音频转录插件';
  description = '自动将音频内容转录为文本';
  enabled = true;
  
  /**
   * 处理请求，检测音频内容并转录
   */
  async processRequest(messages: any[], options?: any): Promise<{messages: any[], options?: any}> {
    if (!options?.audio) {
      // 没有音频数据，直接返回原始消息
      return { messages, options };
    }
    
    try {
      // 获取音频数据
      const audioData = options.audio;
      
      // 转录音频
      const transcription = await this.transcribeAudio(audioData);
      
      // 添加转录结果到消息
      const newMessage = {
        role: 'user',
        content: transcription
      };
      
      // 在当前消息后添加新消息
      const newMessages = [...messages, newMessage];
      
      // 移除音频选项，避免重复处理
      const { audio, ...restOptions } = options;
      
      return { 
        messages: newMessages, 
        options: restOptions 
      };
    } catch (error) {
      console.error('音频转录失败:', error);
      // 出错时返回原始消息
      return { messages, options };
    }
  }
  
  /**
   * 转录音频为文本
   * @param audioData 音频数据Blob或Base64字符串
   * @returns 转录文本
   */
  private async transcribeAudio(audioData: Blob | string): Promise<string> {
    // 这里可以实现具体的音频转录逻辑
    // 可以调用OpenAI的Whisper API或其他转录服务
    
    // 示例实现，实际项目中需要替换为真实实现
    if (audioData instanceof Blob) {
      // 使用OpenAI的Whisper API转录音频
      // 这里使用假设的API客户端实现
      try {
        const formData = new FormData();
        formData.append('file', audioData);
        formData.append('model', 'whisper-1');
        
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('音频转录请求失败');
        }
        
        const result = await response.json();
        return result.text;
      } catch (error) {
        console.error('音频转录API调用失败:', error);
        return '【音频转录失败】';
      }
    } else if (typeof audioData === 'string') {
      // 处理Base64字符串
      // 将Base64转换为Blob再处理
      try {
        const byteString = atob(audioData.split(',')[1]);
        const mimeString = audioData.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        return this.transcribeAudio(blob);
      } catch (error) {
        console.error('Base64音频解析失败:', error);
        return '【音频转录失败】';
      }
    }
    
    return '【未知的音频格式】';
  }
} 