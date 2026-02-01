<template>
  <div ref="assistantListRef"
    :class="{ 'transition-all duration-300': !draging, 'w-56': showPanel && !isMobile, '!w-0': !showPanel }"
    class="relative border-r-2 border-solid w-56 max-md:h-full max-md:w-screen shrink-0 bg-surface-light-primary dark:bg-surface-dark-primary z-50">
    <div class="mx-3 h-screen min-w-40 flex flex-col transition-all duration-300"
      :style="!showPanel && `transform: translateX(-120%);`">
      <div class="flex items-center h-9 flex-shrink-0 mt-8 overflow-hidden">
        <!-- 新增助手按钮 -->
        <button @click="handleNewAssistant" class="flex-1 flex items-center justify-center h-full px-6 space-x-1 transition-all duration-200 transform 
         bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 
         text-white dark:text-gray-100 
         rounded-[2rem] shadow-md hover:shadow-lg
         text-sm font-medium tracking-wide">
          <span>+</span>
        </button>

        <!-- 功能按钮组 -->
        <div class="ml-4 flex items-center space-x-3">
          <el-tooltip content="删除所有会话" placement="top">
            <i @click="handleClearAssistants" class="iconfont center w-9 h-9 text-lg rounded-full cursor-pointer transition-colors
             text-gray-600 hover:text-red-600 
             dark:text-gray-300 dark:hover:text-red-300
             hover:bg-gray-100 dark:hover:bg-gray-600
             active:scale-95">
              &#xe6c7;
            </i>
          </el-tooltip>
        </div>
      </div>

      <div :class="searchInput || searchFocus ? 'border-primary-500' : 'border-transparent'"
        class="overflow-hidden flex-shrink-0 rounded-xl border-4 mt-2 transition-colors duration-200">
        <div class="flex w-full bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-md py-1 px-2 border border-border-light-primary dark:border-border-dark-primary">
          <i class="iconfont overflow-hidden text-text-light-secondary dark:text-text-dark-secondary">&#xe63f;</i>
          <input class="outline-none flex-1 pl-2 w-full text-sm bg-transparent text-text-light-primary dark:text-text-dark-primary placeholder-text-light-tertiary dark:placeholder-text-dark-tertiary" v-model.laze="searchInput" @focus="searchFocus = true"
            @blur="searchFocus = false" placeholder="搜索助手">
        </div>
      </div>

      <div ref="scrollContainerRef"
        class="relative mt-5 flex-grow overflow-y-scroll text-text-light-primary dark:text-text-dark-primary">
        <transition-group name="list">
          <template v-for="(assistant, index) in filteredAssistants" :key="assistant.id">
            <div draggable="true" :ref="currentAssistantId === assistant.id ? 'selectedAssistantRef' : null"
              @dragstart="onDragStart($event, index)" @drag="onDrag($event, index)"
              @dragenter="onDragEnterThrottled($event, index, assistant.id)"
              @dragover="onDragOver($event, index)" @dragend="onDragEnd($event, index)" class="group w-full rounded-[20px] cursor-grab transition-all
       bg-surface-light-elevated/95 dark:bg-surface-dark-elevated/95 backdrop-blur
       hover:bg-surface-light-elevated dark:hover:bg-surface-dark-secondary
       border border-transparent
       shadow-soft dark:shadow-medium
       relative mb-3
       before:absolute before:inset-0 before:rounded-[20px]
       before:bg-gradient-to-r before:from-primary-400/0 before:via-primary-400/0 before:to-primary-400/0
       hover:before:via-primary-400/10 hover:before:to-primary-400/5" :class="{
        'bg-surface-light-elevated dark:border-primary-600/30 dark:bg-surface-dark-elevated border-primary-400/30 before:via-primary-400/20 before:to-primary-400/10': currentAssistantId === assistant.id,
        'hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover hover:border-primary-500 bg-surface-light-elevated dark:bg-surface-dark-elevated': currentAssistantId !== assistant.id,
        'opacity-0': index === draggedIndex
      }" @click="selectAssistant(assistant.id)">
              <!-- 助手信息 -->
              <div class="h-16 relative flex items-center px-3 py-2 group rounded-md transition-colors">
                <div class="relative mr-3">
                  <el-avatar :size="36" :src="getModelLogo(assistant.model?.id)" 
                    :class="{ 'border-2 border-purple-500': currentAssistantId === assistant.id }" class="transition-all">
                    {{ assistant.emoji || '🤖' }}
                  </el-avatar>
                </div>

                <div class="flex flex-col w-full justify-between overflow-hidden">
                  <div class="flex items-center">
                    <div :class="{ 'text-purple-500': currentAssistantId === assistant.id }"
                      class="font-semibold text-base group-hover:text-purple-500 whitespace-nowrap text-ellipsis overflow-hidden mr-1.5">
                      {{ assistant.name }}
                    </div>
                  </div>
                  <div
                    class="bg-purple-100 text-purple-600 text-xs rounded-full px-1.5 min-w-[20px] text-center w-fit">
                    {{ getMessageCount(assistant.id) > 99 ? '99+' : getMessageCount(assistant.id) }}
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="flex bg-white dark:bg-black rounded-md shadow-sm">
                    <div @click.stop="duplicateAssistant(assistant.id)"
                      class="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-green-500 rounded-l-md">
                      <el-icon>
                        <!-- <CopyDocument /> -->
                      </el-icon>
                    </div>

                    <div @click.stop="deleteAssistant(assistant.id, $event)"
                      class="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 rounded-r-md"
                      :title="'删除助手 (按住 ' + (isMac ? 'Cmd' : 'Ctrl') + ' 键点击可跳过确认)'">
                      <el-icon>
                        <Delete />
                      </el-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </transition-group>
      </div>
      <div class="h-20 flex-shrink-0 flex items-center justify-center">
      </div>
    </div>
    <div @mousedown="handleLineMousedown($event)" ref="resizeLineRef"
      class="hover:cursor-col-resize absolute -right-1 top-0 h-full w-1 border-l-2 border-transparent hover:border-blue-500"
      :class="draging ? 'bg-blue-500 border-blue-500' : 'bg-transparent'">
    </div>
    <div @click="togglePanel" :class="showPanel ? 'translate-x-1/2' : 'translate-x-12 rotate-180'"
      class="absolute w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-md right-0 top-1/4 duration-300 flex justify-center items-center cursor-pointer font-extrabold text-base text-gray-800 dark:text-white max-md:hidden">
      <i class="iconfont">&#xe604;</i>
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect, onMounted, onBeforeUnmount, computed } from "vue";
import { ElMessageBox } from 'element-plus';
import { useAssistantsStore } from '@/stores/modules/assistants';
import { useWindowSize } from '@/hooks/size';
import { getModelLogo } from '@/config/model';
import { assistantService } from '@/services/AssistantService';

const { isMobile } = useWindowSize();
const props = defineProps({
  currentAssistantId: String,
});

const assistantsStore = useAssistantsStore();

// 检测操作系统，用于显示正确的快捷键提示
const isMac = computed(() => {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
});
const searchInput = ref("");
const searchFocus = ref(false);
const selectedAssistantRef = ref(null);
const showPanel = ref(true);
const currentAssistantId = computed(() => assistantsStore.currentAssistantId);

const scrollContainerRef = ref(null);
const scrollInterval = ref(null);
const scrollThreshold = 100; // 滚动阈值，单位为像素
const scrollSpeed = 20;     // 每次滚动的像素数
const scrollIntervalTime = 30; // 自动滚动的时间间隔，单位为毫秒

// 过滤助手列表
const filteredAssistants = computed(() => {
  return assistantService.searchAssistants(searchInput.value);
});

// 获取助手的消息数量
const getMessageCount = (assistantId) => {
  return assistantService.getAssistantMessageCount(assistantId);
};

// 开始滚动
const startAutoScroll = (direction) => {
  if (scrollInterval.value) return;
  scrollInterval.value = setInterval(() => {
    if (!scrollContainerRef.value) return;
    if (direction === 'up') {
      scrollContainerRef.value.scrollTop -= scrollSpeed;
    } else if (direction === 'down') {
      scrollContainerRef.value.scrollTop += scrollSpeed;
    }
  }, scrollIntervalTime);
};

// 停止滚动
const stopAutoScroll = () => {
  if (scrollInterval.value) {
    clearInterval(scrollInterval.value);
    scrollInterval.value = null;
  }
};

// 选择助手
const selectAssistant = (id) => {
  if (isMobile()) {
    togglePanel();
  }
  assistantService.setCurrentAssistant(id);
};

// 删除助手
const deleteAssistant = (id, event) => {
  // 检测是否按下了修饰键（Ctrl 或 Cmd）
  const isModifierPressed = event && (event.ctrlKey || event.metaKey);

  if (isModifierPressed) {
    // 按住修饰键时直接删除，跳过确认弹窗
    assistantService.deleteAssistant(id);
  } else {
    // 正常删除流程，显示确认弹窗
    ElMessageBox.confirm(
      '确定删除该助手吗？删除后将无法恢复。',
      '删除助手',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(async () => {
        await assistantService.deleteAssistant(id);
      })
      .catch(() => {});
  }
};

// 复制助手
const duplicateAssistant = (id) => {
  const newAssistant = assistantService.duplicateAssistant(id);
  if (newAssistant) {
    assistantService.setCurrentAssistant(newAssistant.id);
  }
};

// 创建新助手
const handleNewAssistant = () => {
  try {
    // 使用 AssistantService 创建新助手，自动应用系统默认助手模型的配置
    const newAssistant = assistantService.createNewAssistant();

    // 设置为当前选中的助手
    assistantService.setCurrentAssistant(newAssistant.id);

    // 如果是移动设备，切换面板
    if (isMobile()) {
      togglePanel();
    }
  } catch (error) {
    console.error('创建新助手失败:', error);
  }
};

const handleClearAssistants = () => {
  ElMessageBox.confirm(
    '是否清空所有助手及其对话记录？此操作不可恢复。',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      await assistantService.clearAllAssistants();
    })
    .catch(() => {});
};

const draggedIndex = ref(null);
let cloneElement = null;
const onDragStart = (e, index) => {
  draggedIndex.value = index;
  // 自定义拖拽视图
  cloneElement = e.target.cloneNode(true);
  const computedStyle = window.getComputedStyle(e.target);
  for (let key of computedStyle) {
    cloneElement.style[key] = computedStyle[key];
  }
  cloneElement.style.position = 'absolute';
  cloneElement.style.top = '-9999px';
  cloneElement.style.left = '-9999px';
  document.body.appendChild(cloneElement);
  const rect = e.target.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  e.dataTransfer.setDragImage(cloneElement, offsetX, offsetY);
  e.dataTransfer.effectAllowed = "move";
};

// 多节流
const throttleMap = new Map();
const throttle = (func, limit, key) => {
  if (!throttleMap.has(key)) {
    throttleMap.set(key, false);
  }
  return function () {
    const args = arguments;
    const context = this;
    if (!throttleMap.get(key)) {
      func.apply(context, args);
      throttleMap.set(key, true);
      setTimeout(() => throttleMap.set(key, false), limit);
    }
  }
};

const onDrag = (e, index) => {
  e.preventDefault();
  const container = scrollContainerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const y = e.clientY;

  if (y < rect.top + scrollThreshold) {
    // 鼠标靠近顶部，向上滚动
    startAutoScroll('up');
  } else if (y > rect.bottom - scrollThreshold) {
    // 鼠标靠近底部，向下滚动
    startAutoScroll('down');
  } else {
    // 鼠标不在滚动区域，停止滚动
    stopAutoScroll();
  }
};

// 注意：这里需要实现助手排序的逻辑，但assistantsStore目前没有直接的排序方法
// 暂时跳过这部分实现，如有需要可以添加相关方法到assistantsStore中
const onDragEnter = (e, index) => {
  e.preventDefault();
  // 如果添加了排序功能，可以在这里实现
};

const onDragEnterThrottled = (e, index, id) => {
  throttle(onDragEnter, 150, id).apply(this, [e, index]);
};

const onDragOver = (e, index) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

const onDragEnd = (e, index) => {
  e.preventDefault();
  draggedIndex.value = null;
  if (document.body.contains(cloneElement)) {
    document.body.removeChild(cloneElement);
  }
  stopAutoScroll(); // 确保停止滚动
};

// 切换列表显隐
const togglePanel = () => {
  showPanel.value = !showPanel.value;
  // 0或者NAN时,清除style影响
  if (showPanel.value && assistantListRef.value && !parseInt(assistantListRef.value.style.width)) {
    assistantListRef.value.style.width = '';
  }
};

const resizeLineRef = ref(null);
const assistantListRef = ref(null);
const draging = ref(false);
const minWidth = 160;

//拖动开始
const handleLineMousedown = (e) => {
  e.preventDefault();
  draging.value = true;
  let accuWidth = assistantListRef.value.getBoundingClientRect().width;
  let lastX = e.clientX;

  //拖动结束
  const lineMouseup = (e) => {
    e.preventDefault();
    draging.value = false;
    document.removeEventListener('mousemove', lineMousemove);
    document.removeEventListener('mouseup', lineMouseup);
  };

  //拖动ing
  const lineMousemove = (e) => {
    e.preventDefault();
    if (lastX !== null) {
      const deltaX = e.clientX - lastX;
      accuWidth += deltaX;
      let rectWidth;
      if (accuWidth <= 0) {
        showPanel.value = false;
        rectWidth = 0;
      }
      if (accuWidth >= minWidth) {
        showPanel.value = true;
        rectWidth = accuWidth;
      }
      assistantListRef.value.style.width = `${rectWidth}px`;
      lastX = e.clientX;
    }
  };

  document.addEventListener('mouseup', lineMouseup);
  document.addEventListener('mousemove', lineMousemove);
};

// 刚进来时，跳到选中的助手
onMounted(() => {
  if (selectedAssistantRef.value?.[0]) {
    selectedAssistantRef.value[0].scrollIntoView({ block: "center" });
  }
});

// 离开时，停止自动滚动
onBeforeUnmount(() => {
  stopAutoScroll();
});

defineExpose({ togglePanel, assistantListRef });
</script>

<style scoped lang="less">
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
}
</style>