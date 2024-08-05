<template>
  <div ref="sessionListRef" :class="{ 'transition-all duration-300': !draging }"
    class=" relative first-line:border-r-2 border-solid w-56 max-md:absolute max-md:h-full max-md:w-full bg-white z-50">
    <div class=" mx-3 h-screen flex flex-col">
      <div class="flex items-center h-9 flex-shrink-0 mt-8 overflow-hidden">
        <button @click="handleNewSession"
          class="flex items-center justify-center flex-1 bg-[#806fef] hover:bg-[#6757cb] h-full rounded-3xl text-xs whitespace-nowrap">+新的聊天</button>
        <el-tooltip content="清除会话" placement="right">
          <i @click="handleClearSession" class="iconfont ml-4 w-9 h-9 center rounded-full hover:bg-[#eee]">&#xe6c7;</i>
        </el-tooltip>
      </div>

      <div :class="searchInput || searchFocus ? 'border-blue-500' : 'border-transparent'"
        class="overflow-hidden flex-shrink-0 rounded-xl border-4 mt-2">
        <div class="flex w-full bg-white rounded-md py-1 px-2">
          <i class="iconfont overflow-hidden">&#xe63f;</i>
          <input class=" outline-none flex-1 pl-2 w-full text-sm" v-model.laze="searchInput" @focus="searchFocus = true"
            @blur="searchFocus = false" placeholder="搜索历史会话"></input>
        </div>
      </div>

      <div class="relative mt-5 flex-grow overflow-y-scroll text-light-text dark:text-dark-text">
        <transition-group name="list">
          <div v-for="(session, index) in sessionsStore.filterSessions(searchInput)" :key="session.id" draggable="true"
            :ref="currentSessionId === session.id ? 'selectedSessionRef' : null" @dragstart="onDragStart($event, index)"
            @drag="onDrag($event, index)" @dragenter="onDragEnterThrottled($event, index, session.id)"
            @dragover="onDragOver($event, index)" @dragend="onDragEnd($event, index)"
            class="group flex h-16 w-full rounded-2xl cursor-grab mb-2 last:mb-0 relative overflow-hidden border-2 border-dark-border shadow-md transition-transform scroll-smooth"
            :class="{
              'bg-dark-blue-base': currentSessionId === session.id,
              'hover:bg-[#f3f3f3] hover:border-dark-blue-base bg-white': currentSessionId !== session.id,
              'opacity-0': index === draggedIndex,
            }" @click="selectSession(session.id)">
            <div class="flex flex-col w-full justify-between py-2 px-5 ">
              <div class="font-bold text-base whitespace-nowrap text-ellipsis overflow-hidden">{{ session.name }}</div>
              <div class="text-xs whitespace-nowrap">{{ session.messages.length }}条对话</div>
            </div>


            <div v-if="session.locked" @click="handleToggleLockSession($event, session.id)"
              class="absolute bottom-1 right-2 cursor-pointer text-green-500">
              <el-icon>
                <Lock />
              </el-icon>
            </div>
            <div v-else>
              <div @click="handleToggleLockSession($event, session.id)"
                class="absolute bottom-1 -right-5 group-hover:right-2 transition-all cursor-pointer">
                <el-icon>
                  <Unlock />
                </el-icon>
              </div>
              <i class="iconfont absolute top-1 -right-5 group-hover:right-2 transition-all hover:text-red-500 cursor-pointer"
                @click.stop="deleteSession(index)">&#xe630;</i>
            </div>

          </div>
        </transition-group>
      </div>
      <div class="h-20 flex-shrink-0 flex items-center justify-center">

      </div>

      <div @mousedown="handleLineMousedown($event)" ref="resizeLineRef"
        class=" hover:cursor-col-resize absolute -right-1 top-0 h-full w-1 border-l-2 border-grey-500"
        :class="draging ? 'bg-blue-500 border-blue-500' : 'bg-transparent'">
      </div>
      <div @click="togglePanel" :class="showPanel ? ' translate-x-1/2' : 'translate-x-12 rotate-180'"
        class=" absolute w-8 h-8 bg-white rounded-full shadow-md right-0 top-1/4 duration-300 flex justify-center items-center cursor-pointer font-extrabold text-base max-md:hidden">
        <i class="iconfont">&#xe604;</i>
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, watchEffect, onMounted } from "vue";
import useSessionsStore from '@/stores/modules/chat'
import { useWindowSize } from '@/hooks/size'

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
  // sessionsStore.clearSession()
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
}
const onDragEnter = (e, index) => {
  e.preventDefault();
  if (draggedIndex.value !== index) {
    sessionsStore.swapSession(draggedIndex.value, index);
    draggedIndex.value = index;
    e.target.scrollIntoView({ behavior: "smooth", block: "center" })
  }
}
const onDragEnterThrottled = (e, index, id) => {
  throttle(onDragEnter, 100, id).apply(this, [e, index]);
};

const onDragOver = (e, index) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

const onDragEnd = (e, index) => {
  e.preventDefault();
  draggedIndex.value = null;
  document.body.removeChild(cloneElement);
}

const togglePanel = () => {
  const sessionList = sessionListRef.value
  if (sessionList.style.width === '0px') {
    showPanel.value = true
    sessionList.style.width = isMobile() ? '100%' : '200px'
  } else {
    showPanel.value = false
    sessionList.style.width = '0px'
  }
}
const resizeLineRef = ref(null);
const sessionListRef = ref(null);
const draging = ref(false);
const minWidth = 150

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

onMounted(() => {
  selectedSessionRef.value[0].scrollIntoView({ block: "center" })
})

defineExpose({ togglePanel });
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