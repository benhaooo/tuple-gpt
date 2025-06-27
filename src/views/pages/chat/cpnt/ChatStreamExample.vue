<template>
  <div class="chat-stream-example">
    <div class="chat-container">
      <!-- 聊天消息列表 -->
      <div class="messages-container" ref="messagesContainer">
        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          :class="['message', message.role]"
        >
          <div class="message-content">{{ message.content }}</div>
        </div>
        
        <!-- 流式响应中 -->
        <div v-if="isStreaming" class="message assistant">
          <div class="message-content">
            {{ streamingContent }}<span class="cursor" :class="{ blink: isStreaming }">|</span>
          </div>
        </div>
      </div>
      
      <!-- 输入区域 -->
      <div class="input-container">
        <textarea 
          v-model="userInput" 
          placeholder="输入消息..."
          @keydown.enter.prevent="sendMessage"
          :disabled="isLoading || isStreaming"
        ></textarea>
        
        <!-- 功能按钮 -->
        <div class="actions">
          <!-- 流式模式切换 -->
          <label class="stream-toggle">
            <input type="checkbox" v-model="useStreamMode">
            <span>流式响应</span>
          </label>
          
          <!-- 联网搜索 -->
          <button 
            class="action-btn" 
            @click="toggleWebSearch" 
            :class="{ active: enableWebSearch }"
            :disabled="isLoading || isStreaming"
          >
            <i class="icon-search"></i>
            <span>联网搜索</span>
          </button>
          
          <!-- 发送按钮 -->
          <button 
            class="send-btn" 
            @click="sendMessage" 
            :disabled="isLoading || isStreaming || !userInput.trim()"
          >
            <i class="icon-send"></i>
            <span>发送</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 插件面板 -->
    <div class="plugin-panel">
      <h3>插件状态</h3>
      <div v-for="plugin in plugins" :key="plugin.name" class="plugin-item">
        <div class="plugin-info">
          <div class="plugin-name">{{ plugin.name }}</div>
          <div class="plugin-desc">{{ plugin.description }}</div>
        </div>
        <label class="switch">
          <input type="checkbox" :checked="plugin.enabled" @change="togglePlugin(plugin)" :disabled="isLoading || isStreaming">
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, nextTick, watch } from 'vue';
import { llmService, ChatMessage, StreamCallbacks } from '@/services/LlmService';
import { useLlmStore } from '@/stores/modules/llm';
import type { LlmPlugin } from '@/services/plugins/interfaces/LlmPlugin';

export default defineComponent({
  name: 'ChatStreamExample',
  
  setup() {
    // 聊天状态
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
    const messagesContainer = ref<HTMLElement | null>(null);
    
    // 流式响应状态
    const isStreaming = ref(false);
    const streamingContent = ref('');
    const useStreamMode = ref(true);
    
    // 插件状态
    const plugins = ref<LlmPlugin[]>([]);
    const enableWebSearch = ref(false);
    
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
    
    // 滚动到底部
    const scrollToBottom = async () => {
      await nextTick();
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    };
    
    // 监听消息列表变化，自动滚动
    watch(messages, () => {
      scrollToBottom();
    });
    
    // 监听流式内容变化，自动滚动
    watch(streamingContent, () => {
      scrollToBottom();
    });
    
    // 发送消息
    const sendMessage = async () => {
      if (!userInput.value.trim() || isLoading.value || isStreaming.value) {
        return;
      }
      
      // 添加用户消息
      const userMessage: ChatMessage = {
        role: 'user',
        content: userInput.value
      };
      
      messages.value.push(userMessage);
      userInput.value = '';
      
      // 设置加载状态
      isLoading.value = true;
      
      // 准备选项
      const options = {
        temperature: 0.7,
        max_tokens: 1000,
        // 插件选项
        webSearch: enableWebSearch.value
      };
      
      try {
        if (useStreamMode.value) {
          // 使用流式响应
          await sendStreamMessage(options);
        } else {
          // 使用普通响应
          await sendNormalMessage(options);
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
    
    // 发送普通消息
    const sendNormalMessage = async (options: any) => {
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
    };
    
    // 发送流式消息
    const sendStreamMessage = async (options: any) => {
      // 重置流式状态
      isStreaming.value = true;
      streamingContent.value = '';
      
      // 准备流式回调
      const callbacks: StreamCallbacks = {
        onStart: () => {
          console.log('开始流式响应');
        },
        onChunk: (chunk: any) => {
          // 从chunk中提取内容
          if (chunk.choices && chunk.choices[0]) {
            const content = chunk.choices[0].delta?.content || '';
            streamingContent.value += content;
          } else if (chunk.content) {
            streamingContent.value += chunk.content;
          }
        },
        onComplete: (response: any) => {
          console.log('流式响应完成', response);
          
          // 添加最终响应到消息列表
          if (streamingContent.value) {
            messages.value.push({
              role: 'assistant',
              content: streamingContent.value
            });
          }
          
          // 重置状态
          isStreaming.value = false;
          streamingContent.value = '';
        },
        onError: (error: any) => {
          console.error('流式响应错误', error);
          isStreaming.value = false;
          
          // 添加错误消息
          messages.value.push({
            role: 'assistant',
            content: `流式响应错误: ${error.message || '未知错误'}`
          });
        }
      };
      
      // 发送流式请求
      await llmService.chatStream(messages.value, callbacks, options);
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
    
    // 切换网络搜索
    const toggleWebSearch = () => {
      enableWebSearch.value = !enableWebSearch.value;
    };
    
    return {
      messages,
      userInput,
      isLoading,
      isStreaming,
      streamingContent,
      useStreamMode,
      plugins,
      enableWebSearch,
      messagesContainer,
      sendMessage,
      togglePlugin,
      toggleWebSearch
    };
  }
});
</script>

<style scoped>
.chat-stream-example {
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

.cursor {
  display: inline-block;
  width: 2px;
  height: 14px;
  margin-left: 2px;
}

.cursor.blink {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  from, to { opacity: 1; }
  50% { opacity: 0; }
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
  align-items: center;
}

.stream-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.stream-toggle input {
  margin-right: 0.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  background: none;
  border: 1px solid #ccc;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
}

.action-btn.active {
  background-color: #e3f2fd;
  color: #007bff;
  border-color: #007bff;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-btn i {
  margin-right: 0.5rem;
}

.send-btn {
  display: flex;
  align-items: center;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.send-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.send-btn i {
  margin-right: 0.5rem;
}

.plugin-panel {
  width: 300px;
  padding: 1rem;
  overflow-y: auto;
}

.plugin-panel h3 {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
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