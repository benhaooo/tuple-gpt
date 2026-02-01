<template>
  <div class="message mb-5 group" :class="{ self: isUser }">
    <!-- 编辑窗口 -->
    <el-dialog v-model="showEditModal" title="编辑" append-to-body>
      <el-input v-model="editText" type="textarea" :rows="10" />
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handelEditOk">确定</el-button>
      </template>
    </el-dialog>

    <!-- 用户信息和操作按钮 -->
    <div class="user-info w-full flex items-center gap-x-2 font-extrabold">
      <div class="avater-wrapper">
        <el-tooltip content="编辑" placement="top">
          <i class="iconfont center edit" @click="handleEditMessage()">&#xeabd;</i>
        </el-tooltip>
        <el-avatar :size="40" :src="isUser ? configStore.getAvatar : modelAva" />
      </div>
      <span v-if="isUser" class="text-sm font-extrabold">{{ userConfig.name }}</span>
      <div :class="{ 'flex-row-reverse': isUser }"
        class="flex gap-x-1 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <ExpandableBtn @click="deleteMessage" text="删除">
          <i class="iconfont">&#xec7b;</i>
        </ExpandableBtn>
        <ExpandableBtn v-if="canRetry" @click="retryMessage" text="重试">
          <i class="iconfont">&#xe616;</i>
        </ExpandableBtn>
        <ExpandableBtn @click="copy" text="复制">
          <i class="iconfont">&#xe8b0;</i>
        </ExpandableBtn>
      </div>
    </div>

    <!-- 消息内容 -->
    <div :class="{ 'flex justify-end': isUser }" class="mt-4">
      <div class="content max-w-full text-sm relative bg-surface-light-elevated dark:bg-surface-dark-elevated
           transition-all duration-300 rounded-[12px] p-4 border border-border-light-primary dark:border-border-dark-primary
           hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover group shadow-soft"
           :class="{ 'max-w-[80%]': isUser }">

        <!-- 渲染消息块 -->
        <div v-if="message.blocks && message.blocks.length > 0" class="message-blocks">
          <template v-for="(block, index) in message.blocks" :key="index">
            <!-- 文本块 -->
            <div v-if="block.type === 'text'"
                 class="text-block prose prose-gray dark:prose-invert text-gray-600 dark:text-gray-300"
                 :class="{ 'mb-3': index < message.blocks.length - 1 }">
              <TextContent
                :content="block.content as string"
                :showTyper="shouldShowTyper()" />
            </div>

            <!-- 图片块 -->
            <div v-else-if="block.type === 'image'"
                 class="image-block"
                 :class="{ 'mb-3': index < message.blocks.length - 1 }">
              <el-image
                :src="(block.content as ImageBlock).url"
                :alt="(block.content as ImageBlock).alt || '图片'"
                fit="contain"
                :preview-src-list="[(block.content as ImageBlock).url]"
                :initial-index="0"
                preview-teleported
                class="rounded-lg shadow-sm max-w-sm max-h-80 cursor-pointer"
                style="width: auto; height: auto;"
              >
                <template #error>
                  <div class="image-slot flex items-center justify-center w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <el-icon class="text-gray-400" size="32">
                      <Picture />
                    </el-icon>
                    <span class="ml-2 text-gray-500">图片加载失败</span>
                  </div>
                </template>
              </el-image>
            </div>

            <!-- 文件块 -->
            <div v-else-if="block.type === 'file'"
                 class="file-block flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                 :class="{ 'mb-3': index < message.blocks.length - 1 }">
              <i class="iconfont text-lg">&#xe8c4;</i>
              <div class="flex-1">
                <div class="font-medium">{{ (block.content as FileBlock).name || '未知文件' }}</div>
                <div class="text-xs text-gray-500">
                  {{ (block.content as FileBlock).size ? formatFileSize((block.content as FileBlock).size!) : '未知大小' }}
                </div>
              </div>
              <el-button size="small" @click="downloadFile(block.content as FileBlock)">下载</el-button>
            </div>

            <!-- 思考块 -->
            <div v-else-if="block.type === 'thinking'"
                 class="thinking-block border border-blue-200 dark:border-blue-800 rounded-lg"
                 :class="{ 'mb-3': index < message.blocks.length - 1 }">
              <div class="thinking-header flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <div class="flex items-center gap-2">
                  <div class="thinking-icon">
                    <CpuChipIcon class="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span class="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {{ getThinkingStatus(block.content as ThinkingBlock) === 'thinking' ? '思考中...' : '思考过程' }}
                  </span>
                  <div v-if="getThinkingStatus(block.content as ThinkingBlock) === 'thinking'"
                       class="thinking-spinner animate-spin w-3 h-3 border border-blue-600 border-t-transparent rounded-full">
                  </div>
                </div>
                <button @click="toggleThinking(index)"
                        class="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800/30 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors">
                  <ChevronUpIcon v-if="isThinkingExpanded(index)" class="w-4 h-4" />
                  <ChevronDownIcon v-else class="w-4 h-4" />
                </button>
              </div>
              <div v-show="isThinkingExpanded(index)"
                   class="thinking-content p-3 bg-blue-25 dark:bg-blue-950/10">
                <div class="prose prose-sm prose-blue dark:prose-invert text-gray-700 dark:text-gray-300"
                     v-html="renderThinkingContent(block.content as ThinkingBlock)">
                </div>
              </div>
            </div>

            <!-- 错误块 -->
            <div v-else-if="block.type === 'error'"
                 class="error-block bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
                 :class="{ 'mb-3': index < message.blocks.length - 1 }">
              <div class="flex items-start space-x-3">
                <ExclamationTriangleIcon class="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div class="flex-1">
                  <div class="text-red-800 dark:text-red-200 font-medium">
                    {{ (block.content as ErrorBlock).message || '发生未知错误' }}
                  </div>
                  <div v-if="(block.content as ErrorBlock).details"
                       class="text-red-600 dark:text-red-300 text-sm mt-1">
                    {{ (block.content as ErrorBlock).details }}
                  </div>
                  <div class="flex items-center space-x-2 mt-2">
                    <button @click="retryMessage"
                            class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 text-sm underline">
                      重试
                    </button>
                    <span v-if="(block.content as ErrorBlock).timestamp" class="text-red-500 dark:text-red-400 text-xs">
                      {{ new Date((block.content as ErrorBlock).timestamp!).toLocaleTimeString() }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 空消息占位 -->
        <div v-else class="empty-message text-gray-400 italic">
          暂无内容
        </div>

        <!-- 模型信息和token使用量 -->
        <div v-if="!isUser && (message.model || message.usage)"
             class="absolute -top-5 right-0 text-gray-400/90 dark:text-gray-500 text-xs flex gap-4">
          <span v-if="message.usage">tokens: {{ message.usage.total_tokens }}</span>
          <span v-if="message.model" class="font-mono">{{ getModelDisplayName(message.model) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { marked } from 'marked';
import { storeToRefs } from "pinia";
import { useToast } from 'vue-toast-notification';
import useConfigStore from "@/stores/modules/config";
import { useMessagesStore } from "@/stores/modules/messages";
import ExpandableBtn from "../cpnt/ExpandableBtn.vue";
import TextContent from "../cpnt/TextContent.vue";
import { copyToClip } from "@/utils/commonUtils";
import { getModelLogo } from "@/config/model";
import type { Message, ImageBlock, FileBlock, ThinkingBlock, ErrorBlock } from "@/types/message";
import { CpuChipIcon, ChevronUpIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import { Picture } from '@element-plus/icons-vue';
import { messageService } from "@/services/MessageService";

const configStore = useConfigStore();
const messagesStore = useMessagesStore();
const { userConfig } = storeToRefs(configStore);
const toast = useToast();

interface Props {
  message: Message;
  index?: number;
}

const props = defineProps<Props>();

const showEditModal = ref(false);
const editText = ref("");
const expandedThinkingBlocks = ref<Set<number>>(new Set());

// 计算属性
const isUser = computed(() => props.message.role === 'user');

const modelAva = computed(() => {
  if (isUser.value || !props.message.model) {
    return '';
  }
  return getModelLogo(props.message.model.id);
});

// 消息内容处理函数
const getContent = (): string => {
  if (!props.message.blocks || props.message.blocks.length === 0) {
    return '';
  }

  // 提取所有文本块的内容
  return props.message.blocks
    .filter(block => block.type === 'text')
    .map(block => typeof block.content === 'string' ? block.content : '')
    .join('\n');
};

const setContent = (content: string): void => {
  if (!props.message.blocks) {
    props.message.blocks = [];
  }

  // 找到第一个文本块并更新，如果没有则创建一个
  const textBlockIndex = props.message.blocks.findIndex(block => block.type === 'text');

  if (textBlockIndex >= 0) {
    props.message.blocks[textBlockIndex]!.content = content;
  } else {
    props.message.blocks.unshift({
      type: 'text',
      content: content
    });
  }

  // 更新到store
  messagesStore.updateMessage(props.message.assistantId, props.message.id, {
    blocks: props.message.blocks
  });
};



// 判断是否应该显示打字机效果
const shouldShowTyper = (): boolean => {
  // 只有助手消息且状态为sending或pending时才显示打字机效果
  // 这确保了只有新消息或正在发送的消息才会显示打字机效果
  // 编辑后的消息状态为success，不会重新播放动画
  return !isUser.value && (props.message.status === 'sending' || props.message.status === 'pending');
};


// 文件大小格式化
const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getModelDisplayName = (model: any): string => {
  return model?.name || model?.id || '未知模型';
};

// 事件处理函数
const handleEditMessage = (): void => {
  showEditModal.value = true;
  editText.value = getContent();
};

const handelEditOk = (): void => {
  setContent(editText.value);
  showEditModal.value = false;
  toast.success('编辑成功');
};

const copy = (): void => {
  const content = getContent();
  if (content) {
    copyToClip(content).then(() => {
      toast.success('复制成功');
    }).catch(() => {
      toast.error('复制失败');
    });
  } else {
    toast.warning('没有可复制的内容');
  }
};

const deleteMessage = (): void => {
  const success = messagesStore.deleteMessage(props.message.assistantId, props.message.id);
  if (success) {
    toast.success('删除成功');
  } else {
    toast.error('删除失败');
  }
};

// 判断是否可以重试
const canRetry = computed(() => {
  if (props.message.role === 'user') {
    return true; // 用户消息总是可以重试
  } else if (props.message.role === 'assistant') {
    // 助手消息需要有父消息才能重试
    return !!props.message.parentMessageId;
  }
  return false;
});

const retryMessage = async (): Promise<void> => {
  try {
    // 调用 MessageService 的重试方法，不显示toast
    await messageService.retryMessage(props.message.assistantId, props.message.id);
  } catch (error) {
    console.error('重试消息失败:', error);
    // 只在真正失败时显示错误toast
    toast.error(`重试失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

const downloadFile = (fileBlock: FileBlock): void => {
  const link = document.createElement('a');
  link.href = fileBlock.url;
  link.download = fileBlock.name || 'download';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Thinking相关方法
const toggleThinking = (index: number): void => {
  // 简化逻辑：只使用一个Set来管理折叠状态
  // 如果在Set中，表示用户手动折叠了
  // 如果不在Set中，表示展开状态（默认展开）

  if (expandedThinkingBlocks.value.has(index)) {
    // 当前是手动折叠状态，切换为展开
    expandedThinkingBlocks.value.delete(index);
  } else {
    // 当前是展开状态，切换为手动折叠
    expandedThinkingBlocks.value.add(index);
  }
};

const isThinkingExpanded = (index: number): boolean => {
  // 简化逻辑：
  // 1. 如果用户手动折叠了（在Set中），返回false
  // 2. 否则，thinking块默认展开（无论是thinking还是complete状态）

  const block = props.message.blocks[index];
  if (block && block.type === 'thinking') {
    // 如果用户手动折叠了，返回false
    if (expandedThinkingBlocks.value.has(index)) {
      return false;
    }

    // 默认展开：thinking过程中和完成后都展开
    return true;
  }

  return false;
};

const getThinkingStatus = (content: string | ThinkingBlock): string => {
  if (typeof content === 'object' && content && 'status' in content) {
    return content.status || 'complete';
  }
  return 'complete';
};

const renderThinkingContent = (content: string | ThinkingBlock): string => {
  let thinkingText = '';

  if (typeof content === 'string') {
    thinkingText = content;
  } else if (content && typeof content === 'object' && 'content' in content) {
    thinkingText = content.content || '';
  }

  // 使用marked渲染markdown
  try {
    const result = marked(thinkingText, {
      breaks: true,
      gfm: true
    });
    return typeof result === 'string' ? result : '';
  } catch (error) {
    console.error('渲染thinking内容失败:', error);
    return thinkingText.replace(/\n/g, '<br>');
  }
};


</script>

<style scoped lang="less">
.message {
  .user-info {
    display: flex;

    .avater-wrapper {
      position: relative;
      height: 40px;
      width: 40px;
      clip-path: circle();

      .edit {
        position: absolute;
        width: 100%;
        height: 100%;
        cursor: pointer;
        color: #000000;
        opacity: 0;
        background-color: rgba(67, 66, 87, 0.535);
        transition: 0.3s;
        z-index: 9;
      }
    }
  }

  .content {
    padding: 12px 12px;
    margin-top: 8px;
    border-radius: 20px;
    position: relative;

    &:hover {
      .handle {
        opacity: 1;
      }
    }
  }

  .message-blocks {
    .text-block {
      line-height: 1.6;

      :deep(p) {
        margin-bottom: 0.5em;

        &:last-child {
          margin-bottom: 0;
        }
      }

      :deep(pre) {
        background-color: #f5f5f5;
        border-radius: 8px;
        padding: 12px;
        overflow-x: auto;
        margin: 8px 0;

        code {
          background: none;
          padding: 0;
        }
      }

      :deep(code) {
        background-color: #f0f0f0;
        padding: 2px 4px;
        border-radius: 4px;
        font-size: 0.9em;
      }
    }

    .image-block {
      img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
      }
    }

    .file-block {
      border: 1px solid #e0e0e0;
      transition: all 0.2s ease;

      &:hover {
        border-color: #409eff;
        background-color: #f0f9ff;
      }
    }
  }

  .legacy-content {
    .contentValue {
      line-height: 1.6;
    }
  }

  .empty-message {
    text-align: center;
    padding: 20px;
  }

  &:hover {
    .user-info {
      .avater-wrapper {
        .edit {
          opacity: 1;
        }

        img {
          opacity: 0.5;
        }
      }
    }
  }
}

.self {
  align-items: flex-end;

  .user-info {
    flex-direction: row-reverse;
  }

  .content {
    border-radius: 20px;
  }
}

// Thinking块样式
.thinking-block {
  transition: all 0.2s ease;

  .thinking-header {
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #dbeafe;
    }

    .thinking-spinner {
      animation: spin 1s linear infinite;
    }
  }

  .thinking-content {
    max-height: 400px;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;

      &:hover {
        background: #a8a8a8;
      }
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// 暗色主题适配
.dark {
  .message {
    .message-blocks {
      .text-block {
        :deep(pre) {
          background-color: #2d2d2d;
          color: #f0f0f0;
        }

        :deep(code) {
          background-color: #3d3d3d;
          color: #f0f0f0;
        }
      }

      .file-block {
        border-color: #404040;

        &:hover {
          border-color: #409eff;
          background-color: #1a2332;
        }
      }

      .thinking-block {
        border-color: #1e3a8a;

        .thinking-header {
          background-color: #1e3a8a20;
          border-color: #1e3a8a;
        }

        .thinking-content {
          background-color: #1e3a8a10;
        }
      }
    }
  }
}

:deep(code) {
  border-radius: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>