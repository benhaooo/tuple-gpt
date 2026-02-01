<template>
  <div 
    ref="containerRef"
    class="virtual-list-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <!-- 占位符，用于撑开滚动条 -->
    <div 
      class="virtual-list-spacer"
      :style="{ height: totalHeight + 'px' }"
    ></div>
    
    <!-- 可见项容器 -->
    <div 
      class="virtual-list-items"
      :style="{ 
        transform: `translateY(${offsetY}px)`,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0
      }"
    >
      <div
        v-for="item in visibleItems"
        :key="getItemKey(item.data)"
        :data-index="item.index"
        class="virtual-list-item"
        :style="{ height: item.height + 'px' }"
      >
        <slot 
          :item="item.data" 
          :index="item.index"
          :height="item.height"
        ></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  ref, 
  computed, 
  onMounted, 
  onUnmounted, 
  watch, 
  nextTick,
  shallowRef
} from 'vue';
import { useResourceCleanup } from '@/utils/resource-manager';

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  itemHeight: {
    type: [Number, Function],
    default: 100
  },
  containerHeight: {
    type: Number,
    default: 400
  },
  overscan: {
    type: Number,
    default: 5
  },
  keyField: {
    type: String,
    default: 'id'
  }
});

const emit = defineEmits(['scroll', 'visible-change']);

// 组合式函数
const { registerEventListener, cleanup } = useResourceCleanup();

// 响应式数据
const containerRef = ref(null);
const scrollTop = ref(0);
const itemHeights = shallowRef(new Map());

// 计算属性
const totalHeight = computed(() => {
  let height = 0;
  for (let i = 0; i < props.items.length; i++) {
    height += getItemHeight(i);
  }
  return height;
});

const visibleRange = computed(() => {
  const containerHeight = props.containerHeight;
  const scrollTop = scrollTop.value;
  
  let startIndex = 0;
  let endIndex = props.items.length - 1;
  let accumulatedHeight = 0;
  
  // 找到开始索引
  for (let i = 0; i < props.items.length; i++) {
    const itemHeight = getItemHeight(i);
    if (accumulatedHeight + itemHeight > scrollTop) {
      startIndex = Math.max(0, i - props.overscan);
      break;
    }
    accumulatedHeight += itemHeight;
  }
  
  // 找到结束索引
  accumulatedHeight = getOffsetTop(startIndex);
  for (let i = startIndex; i < props.items.length; i++) {
    if (accumulatedHeight > scrollTop + containerHeight) {
      endIndex = Math.min(props.items.length - 1, i + props.overscan);
      break;
    }
    accumulatedHeight += getItemHeight(i);
  }
  
  return { startIndex, endIndex };
});

const visibleItems = computed(() => {
  const { startIndex, endIndex } = visibleRange.value;
  const items = [];
  
  for (let i = startIndex; i <= endIndex; i++) {
    if (i < props.items.length) {
      items.push({
        index: i,
        data: props.items[i],
        height: getItemHeight(i)
      });
    }
  }
  
  return items;
});

const offsetY = computed(() => {
  return getOffsetTop(visibleRange.value.startIndex);
});

// 方法
const getItemHeight = (index) => {
  if (typeof props.itemHeight === 'function') {
    return props.itemHeight(props.items[index], index);
  }
  
  // 检查是否有缓存的高度
  const cachedHeight = itemHeights.value.get(index);
  if (cachedHeight !== undefined) {
    return cachedHeight;
  }
  
  return props.itemHeight;
};

const getOffsetTop = (index) => {
  let offset = 0;
  for (let i = 0; i < index; i++) {
    offset += getItemHeight(i);
  }
  return offset;
};

const getItemKey = (item) => {
  return item[props.keyField] || item.id;
};

const handleScroll = (event) => {
  scrollTop.value = event.target.scrollTop;
  emit('scroll', event);
  emit('visible-change', visibleRange.value);
};

const scrollToIndex = (index, behavior = 'smooth') => {
  if (!containerRef.value) return;
  
  const offset = getOffsetTop(index);
  containerRef.value.scrollTo({
    top: offset,
    behavior
  });
};

const scrollToBottom = (behavior = 'smooth') => {
  if (!containerRef.value) return;
  
  containerRef.value.scrollTo({
    top: totalHeight.value,
    behavior
  });
};

const updateItemHeight = (index, height) => {
  itemHeights.value.set(index, height);
};

// 监听器
watch(() => props.items.length, (newLength, oldLength) => {
  // 只有在新增项目时才滚动到底部
  if (newLength > oldLength) {
    nextTick(() => {
      scrollToBottom('auto');
    });
  }
});

// 生命周期
onMounted(() => {
  if (containerRef.value) {
    // 注册滚动事件监听器
    registerEventListener(
      containerRef.value,
      'scroll',
      handleScroll,
      { passive: true }
    );
  }
  
  // 初始滚动到底部
  nextTick(() => {
    scrollToBottom('auto');
  });
});

onUnmounted(() => {
  cleanup();
});

// 暴露方法
defineExpose({
  scrollToIndex,
  scrollToBottom,
  updateItemHeight,
  getVisibleRange: () => visibleRange.value
});
</script>

<style scoped>
.virtual-list-container {
  overflow-y: auto;
  position: relative;
}

.virtual-list-spacer {
  pointer-events: none;
}

.virtual-list-items {
  will-change: transform;
}

.virtual-list-item {
  overflow: hidden;
}
</style>
