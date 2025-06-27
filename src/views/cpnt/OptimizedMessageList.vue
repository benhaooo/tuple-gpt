<template>
  <div class="optimized-message-list">
    <!-- 使用虚拟滚动优化大量消息的渲染 -->
    <VirtualList
      ref="virtualListRef"
      :items="messages"
      :item-height="estimateMessageHeight"
      :container-height="containerHeight"
      :overscan="3"
      key-field="id"
      @visible-change="handleVisibleChange"
      @scroll="handleScroll"
    >
      <template #default="{ item: message, index }">
        <div 
          :ref="el => setMessageRef(el, index)"
          class="message-wrapper"
          :data-message-id="message.id"
        >
          <OptimizedMessage
            :message="message"
            :index="index"
            @delete="handleDeleteMessage"
            @reChat="handleReChat"
          />
        </div>
      </template>
    </VirtualList>

    <!-- 滚动到底部按钮 -->
    <Transition name="fade">
      <button
        v-if="showScrollToBottom"
        class="scroll-to-bottom-btn"
        @click="scrollToBottom"
        aria-label="滚动到底部"
      >
        <i class="iconfont">&#xe66b;</i>
        <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
      </button>
    </Transition>
  </div>
</template>

<script setup>
import { 
  ref, 
  computed, 
  onMounted, 
  onUnmounted, 
  nextTick,
  watch,
  shallowRef
} from 'vue';
import { useThrottledRef } from '@/composables/use-debounce';
import { useResourceCleanup } from '@/utils/resource-manager';
import VirtualList from '@/components/VirtualList.vue';
import OptimizedMessage from './OptimizedMessage.vue';

const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  containerHeight: {
    type: Number,
    default: 600
  }
});

const emit = defineEmits(['delete-message', 'reChat-message', 'scroll', 'visible-change']);

// 组合式函数
const { registerTimer, cleanup } = useResourceCleanup();

// 响应式数据
const virtualListRef = ref(null);
const messageRefs = shallowRef(new Map());
const visibleRange = ref({ startIndex: 0, endIndex: 0 });
const scrollTop = ref(0);
const showScrollToBottom = ref(false);
const unreadCount = ref(0);
const lastReadMessageIndex = ref(-1);

// 节流的滚动位置
const { value: throttledScrollTop } = useThrottledRef(scrollTop, 100);

// 计算属性
const isNearBottom = computed(() => {
  const threshold = 100; // 距离底部100px内认为是在底部
  const totalHeight = props.messages.length * 150; // 估算总高度
  return throttledScrollTop.value + props.containerHeight >= totalHeight - threshold;
});

// 方法
const estimateMessageHeight = (message, index) => {
  // 基础高度估算
  let baseHeight = 120;
  
  // 根据消息类型调整高度
  if (message.multiContent && message.multiContent.length > 1) {
    baseHeight += 100; // 多内容消息更高
  }
  
  if (message.img) {
    baseHeight += 200; // 包含图片的消息更高
  }
  
  // 根据内容长度调整高度
  const content = message.content || 
    (message.multiContent?.[message.selectedContent || 0]?.content) || '';
  const contentLines = Math.ceil(content.length / 50);
  baseHeight += contentLines * 20;
  
  return Math.max(baseHeight, 80);
};

const setMessageRef = (el, index) => {
  if (el) {
    messageRefs.value.set(index, el);
    
    // 观察元素高度变化
    observeMessageHeight(el, index);
  } else {
    messageRefs.value.delete(index);
  }
};

const observeMessageHeight = (element, index) => {
  if (!window.ResizeObserver) return;
  
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const height = entry.contentRect.height;
      virtualListRef.value?.updateItemHeight(index, height);
    }
  });
  
  observer.observe(element);
  
  // 清理观察器
  registerTimer(() => {
    observer.disconnect();
  }, 0);
};

const handleVisibleChange = (range) => {
  visibleRange.value = range;
  emit('visible-change', range);
  
  // 更新已读状态
  updateReadStatus(range.endIndex);
};

const handleScroll = (event) => {
  scrollTop.value = event.target.scrollTop;
  
  // 更新滚动到底部按钮的显示状态
  showScrollToBottom.value = !isNearBottom.value;
  
  emit('scroll', event);
};

const updateReadStatus = (lastVisibleIndex) => {
  if (lastVisibleIndex > lastReadMessageIndex.value) {
    const newUnreadCount = props.messages.length - 1 - lastVisibleIndex;
    unreadCount.value = Math.max(0, newUnreadCount);
    lastReadMessageIndex.value = lastVisibleIndex;
  }
};

const scrollToBottom = () => {
  virtualListRef.value?.scrollToBottom('smooth');
  unreadCount.value = 0;
  lastReadMessageIndex.value = props.messages.length - 1;
};

const scrollToMessage = (messageId) => {
  const index = props.messages.findIndex(msg => msg.id === messageId);
  if (index !== -1) {
    virtualListRef.value?.scrollToIndex(index, 'smooth');
  }
};

const handleDeleteMessage = (messageId) => {
  emit('delete-message', messageId);
};

const handleReChat = (messageId) => {
  emit('reChat-message', messageId);
};

// 监听器
watch(() => props.messages.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    // 新消息到达
    if (isNearBottom.value) {
      // 如果用户在底部，自动滚动到新消息
      nextTick(() => {
        scrollToBottom();
      });
    } else {
      // 如果用户不在底部，增加未读计数
      unreadCount.value += (newLength - oldLength);
    }
  }
});

// 生命周期
onMounted(() => {
  // 初始化时滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
});

onUnmounted(() => {
  cleanup();
});

// 暴露方法
defineExpose({
  scrollToBottom,
  scrollToMessage,
  getVisibleRange: () => visibleRange.value
});
</script>

<style scoped>
.optimized-message-list {
  position: relative;
  height: 100%;
}

.message-wrapper {
  padding: 0 16px;
}

.scroll-to-bottom-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.scroll-to-bottom-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.unread-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ff4757;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
