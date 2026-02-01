<script setup>
import { ref, onMounted, onActivated, nextTick, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import Message from "../../cpnt/Message.vue";
import SessionList from "../../cpnt/SessionList.vue";
import useAutoScrollToBottom from "@/hooks/scroll";
import Editor from './cpnt/Editor.vue'
import ConfigDialog from "./cpnt/ConfigDialog.vue";
import { useWindowSize } from '@/hooks/size'
import { useAssistantsStore } from '@/stores/modules/assistants';
import { useMessagesStore } from '@/stores/modules/messages';
import { llmService } from '@/services/LlmService';
import { useMessageService } from '@/services/MessageService';

const assistantsStore = useAssistantsStore();
const messagesStore = useMessagesStore();
const messageService = useMessageService();

const { scrollRef, smoothScrollToBottom, scrollToBottom, scrollToButtomNearBottom } = useAutoScrollToBottom()

const { currentAssistantId, currentAssistant } = storeToRefs(assistantsStore);

// 获取当前助手的所有消息
const currentMessages = computed(() => {
  if (!currentAssistantId.value) return [];
  return messagesStore.getMessagesByAssistantId(currentAssistantId.value);
});

// 分组消息：将具有相同parentMessageId的助手回复归为一组
const groupedMessages = computed(() => {
  const messages = currentMessages.value;
  const grouped = [];

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];

    if (message.role === 'user') {
      // 用户消息直接添加
      grouped.push({
        type: 'single',
        message: message
      });
    } else if (message.role === 'assistant') {
      // 检查是否已经处理过这个parentMessageId的消息组
      const existingGroup = grouped.find(
        group => group.type === 'multi' && group.parentMessageId === message.parentMessageId
      );

      if (existingGroup) {
        // 添加到现有组
        existingGroup.messages.push(message);
      } else if (message.parentMessageId) {
        // 创建新的多消息组
        grouped.push({
          type: 'multi',
          parentMessageId: message.parentMessageId,
          messages: [message]
        });
      } else {
        // 没有parentMessageId的助手消息，作为单独消息处理
        grouped.push({
          type: 'single',
          message: message
        });
      }
    }
  }

  return grouped;
});

const draging = ref(false);
const dragInfo = ref({
  startX: 0,
  currentX: 0,
  startTime: 0,
  isTouch: false,
});
const sessionListRef = ref(null);
const chatRef = ref(null);
const { onMobile } = useWindowSize()
onMobile(() => {
  if (chatRef.value) {
    const _chatRef = chatRef.value
    _chatRef.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return; // 只处理单指拖动
      draging.value = true;
      const touch = e.touches[0];

      dragInfo.value = {
        startX: touch.clientX,
        currentX: touch.clientX,
        startTime: Date.now(),
        isTouch: true,
      };

      document.addEventListener('touchmove', lineTouchmove, { passive: false });
      document.addEventListener('touchend', lineTouchend);
    })
  }

  return () => {
    console.log('onMobile unmounted')
  }
}, [chatRef])

// 触摸拖动移动
const lineTouchmove = (e) => {
  e.preventDefault();
  if (!draging.value || e.touches.length !== 1) return;
  const touch = e.touches[0];
  const deltaX = touch.clientX - dragInfo.value.startX;
  chatRef.value.style.transform = `translateX(${deltaX}px)`;
  dragInfo.value.currentX = touch.clientX;
};

// 触摸拖动结束
const lineTouchend = (e) => {
  e.preventDefault();
  draging.value = false;
  document.removeEventListener('touchmove', lineTouchmove);
  document.removeEventListener('touchend', lineTouchend);
};

// 发送消息
const onSendMessage = async (payload) => {
  if (!currentAssistant.value || !payload || !payload.content) return;

  const { content, files, mentionedModels } = payload;

  try {
    // 使用 MessageService 发送流式消息
    await messageService.sendStreamMessage(
      currentAssistant.value.id,
      content,
      {
        onStart: () => {
          console.log('开始发送消息');
          // 滚动到底部
          smoothScrollToBottom();
        },
        onChunk: (chunk) => {
          // 流式响应会自动更新消息内容
          console.log('接收到响应块:', chunk);
          // 保持滚动到底部
          scrollToButtomNearBottom();
        },
        onComplete: (message) => {
          console.log('消息发送完成:', message);
          // 最终滚动到底部
          smoothScrollToBottom();
        },
        onError: (error) => {
          console.error('消息发送失败:', error);
        }
      },
      {
        files,
        mentionedModels
      }
    );
  } catch (error) {
    console.error('发送消息时出错:', error);
  }
};


</script>
<template>
  <div ref="chatRef" class="h-full w-full overflow-hidden">
    <div class="flex max-md:w-[200vw] h-full max-md:-translate-x-1/2 ">
      <SessionList ref="sessionListRef" />
      <div v-if="currentAssistant"
        class="relative grow-1 max-md:shrink-0 max-md:w-screen overflow-hidden bg-surface-light-secondary dark:bg-surface-dark-secondary w-full rounded-3xl p-5 box-border max-md:pb-0 flex flex-col md:m-4">
        <div class="w-full flex-1 overflow-y-scroll" ref="scrollRef">
          <div class="absolute w-full h-9 top-0 left-1/2 -translate-x-1/2 flex justify-center font-black z-10">
            <ConfigDialog v-if="currentAssistant" :modelValue="currentAssistant" />
          </div>

          <template v-for="(group, index) in groupedMessages" :key="group.type + '-' + index">
            <!-- 单个消息 -->
            <div v-if="group.type === 'single'">
              <Message :message="group.message" :index="index" class="animate__animated animate__fadeIn duration-75" />
            </div>

            <!-- 多个并列回复 -->
            <div v-else-if="group.type === 'multi'" class="multi-response-container mb-4">
              <div class="multi-response-header text-sm text-gray-500 mb-2 px-4">
                {{ group.messages.length }} 个模型的回复：
              </div>
              <div class="multi-response-grid grid gap-4"
                   :class="{
                     'grid-cols-1': group.messages.length === 1,
                     'grid-cols-2': group.messages.length === 2,
                     'grid-cols-3': group.messages.length >= 3
                   }">
                <div v-for="(message, msgIndex) in group.messages" :key="message.id"
                     class="multi-response-item border rounded-lg p-2">
                  <div class="model-info text-xs text-gray-500 mb-2 flex items-center">
                    <span class="font-medium">{{ message.model?.name || '未知模型' }}</span>
                    <span class="ml-2 text-gray-400">({{ message.model?.provider || '未知提供商' }})</span>
                  </div>
                  <Message :message="message" :index="index * 100 + msgIndex" class="animate__animated animate__fadeIn duration-75" />
                </div>
              </div>
            </div>
          </template>
        </div>
        <!-- editor -->
        <Editor @send="onSendMessage"></Editor>
      </div>
      <div v-else class="flex items-center justify-center w-full">
        <div class="text-center">
          <h2 class="text-2xl font-bold mb-4">欢迎使用 Tuple GPT</h2>
          <p class="text-gray-500">请选择或创建一个助手开始对话</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.multi-response-container {
  .multi-response-header {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .multi-response-grid {
    .multi-response-item {
      background: var(--surface-elevated);
      border: 1px solid var(--border-primary);
      transition: all 0.2s ease;

      &:hover {
        border-color: var(--border-focus);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .model-info {
        padding-bottom: 8px;
        border-bottom: 1px solid var(--border-secondary);
        margin-bottom: 8px;
      }
    }
  }

  // 响应式布局
  @media (max-width: 768px) {
    .multi-response-grid {
      grid-template-columns: 1fr !important;
    }
  }
}
</style>