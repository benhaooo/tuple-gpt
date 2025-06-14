<template>
  <div ref="sessionListRef"
    :class="{ 'transition-all duration-300': !draging, 'w-56': showPanel && !isMobile, '!w-0': !showPanel }"
    class=" relative first-line:border-r-2 border-solid w-56 max-md:h-full max-md:w-screen shrink-0 bg-white dark:bg-dark-hard-dark z-50">
    <div class=" mx-3 h-screen min-w-40 flex flex-col transition-all duration-300"
      :style="!showPanel && `transform: translateX(-120%);`">
      <div class="flex items-center h-9 flex-shrink-0 mt-8 overflow-hidden">
        <!-- 新增会话按钮 -->
        <button @click="handleNewSession" class="flex-1 flex items-center justify-center h-full px-6 space-x-1 transition-all duration-200 transform 
         bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 
         text-white dark:text-gray-100 
         rounded-[2rem] shadow-md hover:shadow-lg
         text-sm font-medium tracking-wide">
          <span>+</span>
        </button>

        <!-- 功能按钮组 -->
        <div class="ml-4 flex items-center space-x-3">
          <el-tooltip content="电子斗蛐蛐" placement="top">
            <i @click="sessionsStore.addAutoSession" class="iconfont center w-9 h-9 text-xl rounded-full cursor-pointer transition-colors
             text-gray-600 hover:text-purple-600 
             dark:text-gray-300 dark:hover:text-purple-300
             hover:bg-gray-100 dark:hover:bg-gray-600
             active:scale-95">
              &#xeca8;
            </i>
          </el-tooltip>

          <el-tooltip content="清除会话" placement="top">
            <i @click="handleClearSession" class="iconfont center w-9 h-9 text-lg rounded-full cursor-pointer transition-colors
             text-gray-600 hover:text-red-600 
             dark:text-gray-300 dark:hover:text-red-300
             hover:bg-gray-100 dark:hover:bg-gray-600
             active:scale-95">
              &#xe6c7;
            </i>
          </el-tooltip>
        </div>
      </div>

      <div :class="searchInput || searchFocus ? 'border-blue-500' : 'border-transparent'"
        class="overflow-hidden flex-shrink-0 rounded-xl border-4 mt-2">
        <div class="flex w-full bg-white dark:bg-dark-hard-dark rounded-md py-1 px-2">
          <i class="iconfont overflow-hidden">&#xe63f;</i>
          <input class=" outline-none flex-1 pl-2 w-full text-sm" v-model.laze="searchInput" @focus="searchFocus = true"
            @blur="searchFocus = false" placeholder="搜索历史会话"></input>
        </div>
      </div>

      <div ref="scrollContainerRef"
        class="relative mt-5 flex-grow overflow-y-scroll text-light-text dark:text-dark-text">
        <transition-group name="list">
          <template v-for="(session, index) in sessionsStore.filterSessions(searchInput)" :key="session?.id">
            <div v-if="session" draggable="true" :ref="currentSessionId === session.id ? 'selectedSessionRef' : null"
              @dragstart="onDragStart($event, index)" @drag="onDrag($event, index)"
              @dragenter="onDragEnterThrottled($event, index, session.id, session.type)"
              @dragover="onDragOver($event, index)" @dragend="onDragEnd($event, index)" class="group w-full rounded-[20px] cursor-grab transition-all
       bg-white/95 dark:bg-gray-900/95 backdrop-blur
       hover:bg-white dark:hover:bg-gray-800
       border border-transparent
       shadow-[0_12px_28px_-8px] shadow-gray-200/80 dark:shadow-black/30
       relative
       before:absolute before:inset-0 before:rounded-[20px] 
       before:bg-gradient-to-r before:from-blue-400/0 before:via-blue-400/0 before:to-blue-400/0
       hover:before:via-blue-400/10 hover:before:to-blue-400/5" :class="{
        'bg-white dark:border-blue-600/30 dark:bg-gray-800 border-blue-400/30 before:via-blue-400/20 before:to-blue-400/10': currentSessionId === session.id,
        'hover:bg-[#f3f3f3] dark:hover:bg-[#333333] hover:border-dark-blue-base bg-white dark:bg-dark-hard-dark': currentSessionId !== session.id,
        'opacity-0': index === draggedIndex,
        'h-32': session.type === 'auto'
      }" @click="selectSession(session.id)">
              <!-- 上 -->
              <div class="h-16 relative flex items-center px-3 py-2 group  rounded-md transition-colors">
                <div class="relative mr-3">
                  <el-avatar :size="36" :src="useModel(session.model).group.icon"
                    :class="{ 'border-2 border-purple-500': currentSessionId === session.id }" class="transition-all" />
                  <el-avatar :size="16" :src="useModel(session.model).service.logo"
                    class="absolute bottom-1 right-1 border border-white shadow-sm" />
                </div>

                <div class="flex flex-col w-full justify-between overflow-hidden">
                  <div class="flex items-center">
                    <div :class="{ 'text-purple-500': currentSessionId === session.id }"
                      class="font-semibold text-base group-hover:text-purple-500 whitespace-nowrap text-ellipsis overflow-hidden mr-1.5">
                      {{ session.name }}
                    </div>
                    <div v-if="session.locked" @click="handleToggleLockSession($event, session.id)"
                      class="cursor-pointer text-green-500 text-sm">
                      <el-icon :size="14">
                        <Lock />
                      </el-icon>
                    </div>
                  </div>
                  <div v-if="session.messages.length > 0"
                    class="bg-purple-100 text-purple-600 text-xs rounded-full px-1.5 min-w-[20px] text-center w-fit">
                    {{ session.messages.length > 99 ? '99+' : session.messages.length }}
                  </div>
                </div>

                <!-- 操作按钮 -->
                <div class="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="flex bg-white dark:bg-black rounded-md shadow-sm">
                    <div v-if="session.locked" @click="handleToggleLockSession($event, session.id)"
                      class="cursor-pointer text-green-500 p-1.5 hover:bg-gray-100 rounded-l-md">
                      <el-icon>
                        <Unlock />
                      </el-icon>
                    </div>
                    <div v-else @click="handleToggleLockSession($event, session.id)"
                      class="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-md">
                      <el-icon>
                        <Lock />
                      </el-icon>
                    </div>

                    <div @click.stop="sessionsStore.copySession(index)"
                      class="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-green-500">
                      <el-icon>
                        <CopyDocument />
                      </el-icon>
                    </div>

                    <div @click.stop="deleteSession(index)"
                      class="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-500 rounded-r-md">
                      <el-icon>
                        <Delete />
                      </el-icon>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 下 -->
              <div v-if="session.type === 'auto'" class="flex w-full h-16 justify-center items-center gap-2">
                <template v-for="(ai, jdex) in session.ai" :key="ai?.id">
                  <div v-if="ai" draggable="true" @dragenter="onDragEnterAuto($event, jdex)"
                    @dragleave="onDragLeaveAuto($event)" @drop="onDropAuto($event, index, jdex)"
                    class="flex-grow h-full rounded-md  py-2 px-1 bg-purple-500">
                    <div class="font-bold text-xs whitespace-nowrap text-ellipsis overflow-hidden">{{ ai.name }}
                    </div>
                  </div>
                  <div v-else
                    class="flex-grow h-full rounded-md py-2 px-1 bg-[#eee] cursor-pointer relative overflow-hidden transition-colors duration-300 ease-in-out hover:bg-purple-400"
                    @click="sessionsStore.autoPushSession(index, null, jdex)">
                    <div class="flex justify-center items-center h-full">
                      <span
                        class="text-2xl text-gray-500 transition-opacity duration-300 ease-in-out group-hover:opacity-100">+</span>
                    </div>
                    <div
                      class="absolute inset-0 bg-purple-400 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-20">
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </transition-group>
      </div>
      <div class="h-20 flex-shrink-0 flex items-center justify-center">

      </div>
    </div>
    <div @mousedown="handleLineMousedown($event)" ref="resizeLineRef"
      class=" hover:cursor-col-resize absolute -right-1 top-0 h-full w-1 border-l-2 border-transparent hover:border-blue-500"
      :class="draging ? 'bg-blue-500 border-blue-500' : 'bg-transparent'">
    </div>
    <div @click="togglePanel" :class="showPanel ? ' translate-x-1/2' : 'translate-x-12 rotate-180'"
      class=" absolute w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-md right-0 top-1/4 duration-300 flex justify-center items-center cursor-pointer font-extrabold text-base text-gray-800 dark:text-white max-md:hidden">
      <i class="iconfont">&#xe604;</i>
    </div>
  </div>

</template>

<script setup>
import { ref, watchEffect, onMounted, onBeforeUnmount } from "vue";
import { ElMessageBox } from 'element-plus';
import useSessionsStore from '@/stores/modules/chat'
import { useWindowSize } from '@/hooks/size'
import { useModel } from "@/models/data"

const { isMobile } = useWindowSize()
const props = defineProps({
  sessions: Array,
  currentSessionId: String,
});

const sessionsStore = useSessionsStore()
const searchInput = ref("")
const searchFocus = ref(false)
const selectedSessionRef = ref(null)
const showPanel = ref(true);

const scrollContainerRef = ref(null);
const scrollInterval = ref(null);
const scrollThreshold = 100; // 滚动阈值，单位为像素
const scrollSpeed = 20;     // 每次滚动的像素数
const scrollIntervalTime = 30; // 自动滚动的时间间隔，单位为毫秒

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

const emits = defineEmits(["select", "delete", "add"]);

const selectSession = (id) => {
  if (isMobile()) {
    togglePanel()
  }
  emits("select", id);
};
const deleteSession = (index) => {
  emits("delete", index);
};
const handleNewSession = () => {
  emits("add");
};
const handleClearSession = () => {
  ElMessageBox.confirm(
    '是否清空所有会话记录（除锁定会话）',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      sessionsStore.clearChat()
    })
}
const handleToggleLockSession = (e, id) => {
  e.stopPropagation()
  sessionsStore.toggleLockSession(id)
}

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
  e.dataTransfer.effectAllowed = "move"
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
}
const onDragEnter = (e, index, type) => {
  e.preventDefault();
  if (type === 'auto') return
  if (draggedIndex.value !== index) {
    sessionsStore.swapSession(draggedIndex.value, index);
    draggedIndex.value = index;
  }
}
const onDragEnterThrottled = (e, index, id, type) => {
  throttle(onDragEnter, 150, id).apply(this, [e, index, type]);
};

const onDragOver = (e, index) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

const onDragEnd = (e, index) => {
  e.preventDefault();
  draggedIndex.value = null;
  document.body.removeChild(cloneElement);
  stopAutoScroll(); // 确保停止滚动
}

const onDragEnterAuto = (e, index) => {
  e.preventDefault();
  e.target.classList.add('border-4', 'border-purple-500')
}

const onDragLeaveAuto = (e) => {
  e.target.classList.remove('border-4', 'border-purple-500');
};

const onDropAuto = (e, index, no) => {
  e.preventDefault();
  e.target.classList.remove('border-4', 'border-purple-500');
  sessionsStore.autoPushSession(index, draggedIndex.value, no)
};

// 切换列表显隐
const togglePanel = () => {
  showPanel.value = !showPanel.value
  // 0或者NAN时,清除style影响
  if (showPanel.value && !parseInt(sessionListRef.value.style.width)) {
    sessionListRef.value.style.width = ''
  }
}
const resizeLineRef = ref(null);
const sessionListRef = ref(null);
const draging = ref(false);
const minWidth = 160

//拖动开始
const handleLineMousedown = (e) => {
  e.preventDefault();
  draging.value = true;
  let accuWidth = sessionListRef.value.getBoundingClientRect().width;
  let lastX = e.clientX;

  //拖动结束
  const lineMouseup = (e) => {
    e.preventDefault()
    draging.value = false;
    document.removeEventListener('mousemove', lineMousemove);
    document.removeEventListener('mouseup', lineMouseup);
  };

  //拖动ing
  const lineMousemove = (e) => {
    e.preventDefault()
    if (lastX !== null) {
      const deltaX = e.clientX - lastX;
      accuWidth += deltaX;
      let rectWidth
      if (accuWidth <= 0) {
        showPanel.value = false
        rectWidth = 0
      }
      if (accuWidth >= minWidth) {
        showPanel.value = true
        rectWidth = accuWidth
      }
      sessionListRef.value.style.width = `${rectWidth}px`;
      lastX = e.clientX;
    }
  };

  document.addEventListener('mouseup', lineMouseup);
  document.addEventListener('mousemove', lineMousemove);
};

// 刚进来时，跳到选中的会话
onMounted(() => {
  selectedSessionRef.value?.[0].scrollIntoView({ block: "center" })
})
// 离开时，停止自动滚动
onBeforeUnmount(() => {
  stopAutoScroll();
});


defineExpose({ togglePanel, sessionListRef });
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