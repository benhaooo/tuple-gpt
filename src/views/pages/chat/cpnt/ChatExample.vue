<template>
  <div class="chat-example">
    <div class="chat-container">
      <!-- 聊天消息列表 -->
      <div class="messages-container">
        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          :class="['message', message.role]"
        >
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>
      
      <!-- 输入区域 -->
      <div class="input-container">
        <textarea 
          v-model="userInput" 
          placeholder="输入消息..."
          @keydown.enter.prevent="sendMessage"
        ></textarea>
        
        <!-- 功能按钮 -->
        <div class="actions">
          <!-- 音频上传 -->
          <button class="action-btn" @click="toggleAudioRecording" :class="{ active: isRecording }">
            <i class="icon-mic"></i>
          </button>
          
          <!-- 文件上传 -->
          <button class="action-btn" @click="uploadDocument">
            <i class="icon-file"></i>
          </button>
          
          <!-- 联网搜索 -->
          <button class="action-btn" @click="toggleWebSearch" :class="{ active: enableWebSearch }">
            <i class="icon-search"></i>
          </button>
          
          <!-- 发送按钮 -->
          <button class="send-btn" @click="sendMessage">
            <i class="icon-send"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 插件管理面板 -->
    <div class="plugin-panel">
      <h3>可用插件</h3>
      <div v-for="plugin in plugins" :key="plugin.name" class="plugin-item">
        <div class="plugin-info">
          <div class="plugin-name">{{ plugin.name }}</div>
          <div class="plugin-desc">{{ plugin.description }}</div>
        </div>
        <label class="switch">
          <input type="checkbox" :checked="plugin.enabled" @change="togglePlugin(plugin)">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { llmService, ChatMessage } from '@/services/LlmService';
import { useLlmStore } from '@/stores/modules/llm';
import type { LlmPlugin } from '@/services/plugins/interfaces/LlmPlugin';

export default defineComponent({
  name: 'ChatExample',
  
  setup() {
    // 状态
    const messages = ref<ChatMessage[]>([
      {
        role: 'system',
        content: '你是一个有用的AI助手，回答用户的问题并提供帮助。'
      },
      {
        role: 'assistant',
        content: '你好！我是AI助手，请问有什么我可以帮助你的吗？'
      }
    ]);
    const userInput = ref('');
    const isLoading = ref(false);
    const plugins = ref<LlmPlugin[]>([]);
    
    // 插件控制状态
    const isRecording = ref(false);
    const enableWebSearch = ref(false);
    
    // 录音相关
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];
    
    // 初始化
    onMounted(async () => {
      // 获取插件列表
      plugins.value = llmService.getPlugins();
      
      // 初始化llmService
      const llmStore = useLlmStore();
      const defaultProvider = llmStore.providers.find(p => p.enabled === true);
      
      if (defaultProvider) {
        llmService.setProvider(defaultProvider);
      }
    });
    
    // 发送消息
    const sendMessage = async () => {
      if (!userInput.value.trim() && !isRecording.value) {
        return;
      }
      
      // 停止录音（如果正在录音）
      if (isRecording.value) {
        stopRecording();
      }
      
      // 添加用户消息
      if (userInput.value.trim()) {
        const userMessage: ChatMessage = {
          role: 'user',
          content: userInput.value
        };
        
        messages.value.push(userMessage);
        userInput.value = '';
      }
      
      // 设置加载状态
      isLoading.value = true;
      
      try {
        // 准备选项
        const options = {
          temperature: 0.7,
          max_tokens: 1000,
          // 插件选项
          webSearch: enableWebSearch.value
        };
        
        // 发送请求
        const response = await llmService.chat(messages.value, options);
        
        // 处理响应
        if (response.choices && response.choices.length > 0) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.choices[0].message.content
          };
          
          messages.value.push(assistantMessage);
        } else if (response.content) {
          // 适配不同API的返回格式
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.content
          };
          
          messages.value.push(assistantMessage);
        }
      } catch (error: any) {
        // 处理错误
        messages.value.push({
          role: 'assistant',
          content: `出错了: ${error.message || '未知错误'}`
        });
        console.error('Chat error:', error);
      } finally {
        isLoading.value = false;
      }
    };
    
    // 切换插件启用状态
    const togglePlugin = (plugin: LlmPlugin) => {
      if (plugin.enabled) {
        llmService.disablePlugin(plugin.name);
      } else {
        llmService.enablePlugin(plugin.name);
      }
      
      // 更新插件列表
      plugins.value = llmService.getPlugins();
    };
    
    // 切换录音状态
    const toggleAudioRecording = async () => {
      if (!isRecording.value) {
        await startRecording();
      } else {
        stopRecording();
        // 处理录音
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          
          // 添加录音消息提示
          messages.value.push({
            role: 'user',
            content: '[语音消息]'
          });
          
          // 发送带有音频的请求
          const options = {
            audio: audioBlob
          };
          
          sendAudioMessage(options);
        }
      }
    };
    
    // 开始录音
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.addEventListener('dataavailable', (event) => {
          audioChunks.push(event.data);
        });
        
        mediaRecorder.start();
        isRecording.value = true;
      } catch (error) {
        console.error('录音失败:', error);
        alert('无法访问麦克风');
      }
    };
    
    // 停止录音
    const stopRecording = () => {
      if (mediaRecorder && isRecording.value) {
        mediaRecorder.stop();
        isRecording.value = false;
        
        // 停止所有音频轨道
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
    };
    
    // 发送音频消息
    const sendAudioMessage = async (options: any) => {
      isLoading.value = true;
      
      try {
        // 发送请求
        const response = await llmService.chat(messages.value, options);
        
        // 处理响应
        if (response.choices && response.choices.length > 0) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.choices[0].message.content
          };
          
          messages.value.push(assistantMessage);
        } else if (response.content) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.content
          };
          
          messages.value.push(assistantMessage);
        }
      } catch (error: any) {
        messages.value.push({
          role: 'assistant',
          content: `出错了: ${error.message || '未知错误'}`
        });
        console.error('Audio message error:', error);
      } finally {
        isLoading.value = false;
      }
    };
    
    // 上传文档
    const uploadDocument = async () => {
      // 创建文件输入元素
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.txt,.pdf,.doc,.docx';
      
      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files.length > 0) {
          const file = target.files[0];
          
          if (file) {
            // 添加文档上传消息
            messages.value.push({
              role: 'user',
              content: `[上传文档: ${file.name}]`
            });
            
            // 发送带有文档的请求
            const options = {
              document: file
            };
            
            isLoading.value = true;
            
            try {
              // 发送请求
              await llmService.chat(messages.value, options);
              
              // 处理响应在插件中已自动添加
            } catch (error: any) {
              messages.value.push({
                role: 'assistant',
                content: `文档处理出错: ${error.message || '未知错误'}`
              });
              console.error('Document processing error:', error);
            } finally {
              isLoading.value = false;
            }
          }
        }
      };
      
      // 触发文件选择
      input.click();
    };
    
    // 切换网络搜索
    const toggleWebSearch = () => {
      enableWebSearch.value = !enableWebSearch.value;
    };
    
    return {
      messages,
      userInput,
      isLoading,
      plugins,
      isRecording,
      enableWebSearch,
      sendMessage,
      togglePlugin,
      toggleAudioRecording,
      uploadDocument,
      toggleWebSearch
    };
  }
});
</script>

<style scoped>
.chat-example {
  display: flex;
  height: 100%;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #e0e0e0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
}

.message.user {
  align-self: flex-end;
  background-color: #007bff;
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message.assistant {
  align-self: flex-start;
  background-color: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 0.25rem;
}

.message.system {
  align-self: center;
  background-color: #f8f9fa;
  color: #6c757d;
  font-style: italic;
  border-radius: 0.5rem;
  max-width: 90%;
}

.input-container {
  padding: 1rem;
  border-top: 1px solid #e0e0e0;
}

textarea {
  width: 100%;
  min-height: 60px;
  padding: 0.75rem;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  resize: none;
  font-family: inherit;
  margin-bottom: 0.5rem;
}

.actions {
  display: flex;
  justify-content: space-between;
}

.action-btn {
  background: none;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:hover {
  background-color: #f0f0f0;
}

.action-btn.active {
  background-color: #e3f2fd;
  color: #007bff;
}

.send-btn {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.plugin-panel {
  width: 300px;
  padding: 1rem;
  overflow-y: auto;
}

.plugin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-bottom: 1px solid #e0e0e0;
}

.plugin-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.plugin-desc {
  font-size: 0.875rem;
  color: #666;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  transform: translateX(26px);
}
</style> 