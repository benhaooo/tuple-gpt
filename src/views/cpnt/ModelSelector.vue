<template>
  <div class="fixed z-50" v-show="isVisible" :style="selectorStyle">
    <div 
      class="w-64 max-h-60 overflow-auto bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light-primary dark:border-border-dark-primary rounded-lg shadow-medium"
      ref="dropdownRef"
    >
      <div class="p-2 sticky top-0 bg-surface-light-elevated dark:bg-surface-dark-elevated border-b border-border-light-primary dark:border-border-dark-primary z-10">
        <input
          type="text"
          class="w-full px-3 py-2 text-sm border border-border-light-primary dark:border-border-dark-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-surface-light-primary dark:bg-surface-dark-primary text-text-light-primary dark:text-text-dark-primary"
          placeholder="搜索模型..."
          v-model="searchQuery"
          ref="searchInputRef"
          @keydown.down.prevent="navigateDown"
          @keydown.up.prevent="navigateUp"
          @keydown.enter.prevent="selectHighlighted"
          @keydown.escape.prevent="close"
        />
      </div>
      <div v-if="filteredProviders.length === 0" class="p-4 text-center text-text-light-tertiary dark:text-text-dark-tertiary">
        没有找到匹配的模型
      </div>
      <div v-else>
        <div v-for="(provider, providerIndex) in filteredProviders" :key="provider.id" class="mb-2">
          <div class="px-3 py-1 text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary bg-surface-light-tertiary dark:bg-surface-dark-tertiary">
            {{ provider.name }}
          </div>
          <div v-for="(model, modelIndex) in provider.models" :key="model.id">
            <div
              class="px-3 py-2 flex items-center cursor-pointer"
              :class="{
                'bg-interactive-light-selected dark:bg-interactive-dark-selected highlighted-item': isHighlighted(provider.id, model.id),
                'hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover': !isHighlighted(provider.id, model.id)
              }"
              @click="selectModel(model.id)"
              @mouseover="highlightIndex = getModelIndex(providerIndex, modelIndex)"
            >
              <div class="flex items-center w-full">
                <img
                  :src="getProviderLogo(provider.type)"
                  class="w-6 h-6 rounded-full mr-2"
                  alt=""
                  @error="$event.target.style.display='none'"
                />
                <div class="flex flex-col">
                  <span class="text-sm font-medium">{{ model.name }}</span>
                  <span v-if="model.group" class="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{{ model.group }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useLlmStore } from '@/stores/modules/llm';
import { getProviderLogo } from '@/config/providers';
import type { Provider, Model } from '@/types/llm';

interface Props {
  triggerText?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
}

const props = withDefaults(defineProps<Props>(), {
  triggerText: '',
  position: 'top',
  offset: 5
});

const emit = defineEmits<{
  select: [modelId: string];
  close: [];
}>();

const llmStore = useLlmStore();
const dropdownRef = ref<HTMLElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const isVisible = ref(false);
const searchQuery = ref('');
const highlightIndex = ref(0);
const flatModelsList = ref<FlatModel[]>([]);
const selectorStyle = ref<Record<string, string>>({});
const currentTriggerElement = ref<HTMLElement | null>(null);
const currentPosition = ref<Props['position']>(props.position);

// 扁平化模型类型定义
interface FlatModel {
  providerIndex: number;
  modelIndex: number;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
}

// 根据搜索查询过滤模型
const filteredProviders = computed(() => {
  const query = searchQuery.value.toLowerCase();

  return llmStore.providers
    .filter(provider => provider.enabled && provider.models.length > 0)
    .map(provider => ({
      ...provider,
      models: provider.models.filter(model =>
        model.name.toLowerCase().includes(query) ||
        model.id.toLowerCase().includes(query)
      )
    }))
    .filter(provider => provider.models.length > 0);
});

// 计算选择器位置
const updateSelectorPosition = () => {
  if (!currentTriggerElement.value) return;
  
  const rect = currentTriggerElement.value.getBoundingClientRect();
  const position = currentPosition.value;
  
  // 基于位置参数设置样式
  if (position === 'top') {
    selectorStyle.value = {
      left: `${rect.left}px`,
      bottom: `${window.innerHeight - rect.top + props.offset}px`
    };
  } else if (position === 'bottom') {
    selectorStyle.value = {
      left: `${rect.left}px`,
      top: `${rect.bottom + props.offset}px`
    };
  } else if (position === 'left') {
    selectorStyle.value = {
      right: `${window.innerWidth - rect.left + props.offset}px`,
      top: `${rect.top}px`
    };
  } else if (position === 'right') {
    selectorStyle.value = {
      left: `${rect.right + props.offset}px`,
      top: `${rect.top}px`
    };
  }
};

// 计算所有可见模型的平面列表，用于键盘导航
const updateFlatModelsList = () => {
  flatModelsList.value = [];

  filteredProviders.value.forEach((provider, providerIndex) => {
    provider.models.forEach((model, modelIndex) => {
      flatModelsList.value.push({
        providerIndex,
        modelIndex,
        providerId: provider.id,
        providerName: provider.name,
        modelId: model.id,
        modelName: model.name
      });
    });
  });
};

// 监听过滤后的模型变化，更新平面列表
watch(filteredProviders, updateFlatModelsList, { deep: true });

// 获取模型的唯一索引
const getModelIndex = (providerIndex: number, modelIndex: number): number => {
  return flatModelsList.value.findIndex(
    item =>
      item.providerIndex === providerIndex &&
      item.modelIndex === modelIndex
  );
};

// 判断当前模型是否高亮
const isHighlighted = (providerId: string, modelId: string): boolean => {
  const currentModel = flatModelsList.value[highlightIndex.value];
  return currentModel &&
         currentModel.providerId === providerId &&
         currentModel.modelId === modelId;
};

// 键盘向下导航
const navigateDown = () => {
  if (flatModelsList.value.length === 0) return;
  
  highlightIndex.value = (highlightIndex.value + 1) % flatModelsList.value.length;
  nextTick(() => {
    ensureHighlightedVisible();
  });
};

// 键盘向上导航
const navigateUp = () => {
  if (flatModelsList.value.length === 0) return;
  
  highlightIndex.value = (highlightIndex.value - 1 + flatModelsList.value.length) % flatModelsList.value.length;
  nextTick(() => {
    ensureHighlightedVisible();
  });
};

// 确保高亮项在视图中可见
const ensureHighlightedVisible = () => {
  nextTick(() => {
    const container = dropdownRef.value;
    if (!container) return;
    
    // 查找带有highlighted-item类的元素
    const highlightedElement = container.querySelector('.highlighted-item');
    if (highlightedElement) {
      // 获取容器和元素的位置信息
      const containerRect = container.getBoundingClientRect();
      const elementRect = highlightedElement.getBoundingClientRect();
      
      // 计算元素相对于容器的顶部和底部距离
      const elementTopRelToContainer = elementRect.top - containerRect.top;
      const elementBottomRelToContainer = elementRect.bottom - containerRect.top;
      
      // 如果元素底部超出了可视区域，向下滚动
      if (elementBottomRelToContainer > container.clientHeight) {
        container.scrollTop += elementBottomRelToContainer - container.clientHeight + 8;
      } 
      // 如果元素顶部在可视区域上方，向上滚动
      else if (elementTopRelToContainer < 0) {
        container.scrollTop += elementTopRelToContainer - 8;
      }
    }
  });
};

// 选择高亮的模型
const selectHighlighted = () => {
  if (flatModelsList.value.length === 0) return;
  
  const model = flatModelsList.value[highlightIndex.value];
  if (model) {
    selectModel(model.modelId);
  }
};

// 选择模型
const selectModel = (modelId: string): void => {
  emit('select', modelId);
  close();
};

// 处理窗口大小变化
const handleResize = () => {
  updateSelectorPosition();
};

// 打开下拉框
const open = (text = '', triggerElement: HTMLElement | null = null, position: Props['position'] | null = null): void => {
  isVisible.value = true;
  searchQuery.value = text || '';
  highlightIndex.value = 0;

  // 更新触发元素和位置
  if (triggerElement) {
    currentTriggerElement.value = triggerElement;
  }

  // 使用传入的位置参数或默认位置
  currentPosition.value = position || props.position;

  nextTick(() => {
    updateFlatModelsList();
    updateSelectorPosition();
    if (searchInputRef.value) {
      searchInputRef.value.focus();
    }
  });

  // 添加窗口大小调整监听
  window.addEventListener('resize', handleResize);
};

// 关闭下拉框
const close = (): void => {
  isVisible.value = false;
  searchQuery.value = '';

  // 移除窗口大小调整监听
  window.removeEventListener('resize', handleResize);

  emit('close');
};

// 点击外部关闭下拉框
const handleOutsideClick = (event) => {
  if (isVisible.value && dropdownRef.value && !dropdownRef.value.contains(event.target) && 
      (!currentTriggerElement.value || !currentTriggerElement.value.contains(event.target))) {
    close();
  }
};

// 监听点击事件
onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
  window.removeEventListener('resize', handleResize);
});

// 暴露方法给父组件
defineExpose({
  open,
  close,
  isVisible
});
</script>

<style scoped>
.max-h-60 {
  max-height: 15rem;
}

.highlighted-item {
  position: relative;
}

/* 确保高亮项在暗模式和亮模式下都有明显的标识 */
.highlighted-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--border-focus);
}
</style> 