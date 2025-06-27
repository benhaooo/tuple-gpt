<template>
  <div :class="{ 'flex justify-end': isUser && message.multiContent.length === 1 }">
    <!-- 单个消息，直接全宽显示 -->
    <div v-if="message.multiContent.length === 1" class="mt-4" :class="{ 'max-w-[80%]': isUser }">
      <Content 
        :contentObj="message.multiContent[0]" 
        :selected="true"
        ref="contentRef" 
      />
    </div>
    
    <!-- 多个消息，显示卡片模式或标签页模式 -->
    <div v-else class="mt-4 w-full">
      <!-- 卡片模式 -->
      <div 
        v-if="!expandedView" 
        :class="{ 'justify-end': isUser }"
        class="flex items-start gap-2 w-full overflow-x-auto p-4 message-cards"
      >
        <template v-for="(oneOf, index) in message.multiContent" :key="oneOf.id">
          <div class="card-container" style="min-width: 50%; max-width: 50%;">
            <Content 
              @click="selectContent(index)" 
              :contentObj="oneOf"
              :selected="index === message.selectedContent"
              :ref="index === message.selectedContent ? 'contentRef' : null" 
            />
          </div>
        </template>
      </div>
      
      <!-- 标签页模式 -->
      <div v-else>
        <div class="flex justify-between items-center mb-2">
          <el-button size="small" @click="expandedView = false" type="text">
            <i class="iconfont mr-1">&#xe66b;</i>返回卡片视图
          </el-button>
          <span class="text-xs text-gray-500">
            {{ message.selectedContent + 1 }} / {{ message.multiContent.length }}
          </span>
        </div>
        <el-tabs v-model="activeTab" type="border-card" class="custom-tabs">
          <el-tab-pane 
            v-for="(oneOf, index) in message.multiContent" 
            :key="oneOf.id"
            :label="getModelName(oneOf.model)"
            :name="`${index}`"
          >
            <Content 
              :contentObj="oneOf" 
              :selected="true"
              :ref="index === message.selectedContent ? 'contentRef' : null" 
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, shallowRef, defineAsyncComponent } from 'vue';

// 懒加载 Content 组件
const Content = defineAsyncComponent(() => import('./Content.vue'));

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isUser: {
    type: Boolean,
    required: true
  },
  getModelName: {
    type: Function,
    required: true
  }
});

// 使用 shallowRef 优化性能
const contentRef = shallowRef(null);
const expandedView = ref(false);
const activeTab = ref('0');

// 监听选中内容变化，同步标签页
watch(() => props.message.selectedContent, (newVal) => {
  activeTab.value = String(newVal);
}, { immediate: true });

// 监听标签页变化，同步选中内容
watch(() => activeTab.value, (newVal) => {
  props.message.selectedContent = Number(newVal);
});

// 选择内容并切换到扩展视图
const selectContent = (index) => {
  props.message.selectedContent = index;
  expandedView.value = true;
};

// 暴露方法给父组件
defineExpose({
  contentRef
});
</script>

<style scoped lang="less">
.message-cards {
  .card-container {
    flex: 0 0 50%;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-3px);
    }
  }
}

.custom-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 10px;
  }

  :deep(.el-tabs__item) {
    height: 30px;
    line-height: 30px;
    font-size: 12px;
    padding: 0 10px;
  }
  
  :deep(.el-tabs__nav) {
    border: none;
  }
}
</style>
