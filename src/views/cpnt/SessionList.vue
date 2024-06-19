<template>
  <div ref="sessionListRef"
    class="relative flex flex-col first-line:border-r-2 border-solid w-56  max-md:absolute max-md:h-full z-50 bg-light-base dark:bg-dark-hard-dark">
    <div class=" mx-3 h-full">
      <button @click="handleNewSession"
        class="flex items-center justify-center w-full mt-8 bg-[#806fef] hover:bg-[#6757cb] h-10 rounded-3xl overflow-hidden">+</button>
      <div class="overflow-hidden">
        <div class="flex w-full bg-white rounded-md mt-2 p-2">
          <i class="iconfont overflow-hidden">&#xe63f;</i>
          <input class=" outline-none flex-1 pl-2 w-full" v-model.laze="searchInput" placeholder="搜索历史会话"></input>
        </div>
      </div>

      <div class="hidden-scroll mt-5 h-4/5 overflow-y-scroll text-light-text dark:text-dark-text">
        <div v-for="(session, index) in sessionsStore.filterSessions(searchInput)" :key="session.id"
          class="group flex h-20 rounded-2xl transition duration-300 cursor-pointer my-5 relative overflow-hidden border-2 border-dark-border hover:border-dark-blue-base shadow-md hover:shadow-lg hover:shadow-blue-500/50"
          :class="currentSessionId === session.id ? 'bg-dark-blue-base' : 'transparent'"
          @click="selectSession(session.id)">
          <div class="flex flex-col w-full justify-between py-3 px-5 ">
            <div class="font-bold text-lg whitespace-nowrap text-ellipsis overflow-hidden">{{ session.evaluate ||
              session.name }}</div>
            <div class="text-xs">{{ session.messages.length }}条对话</div>
          </div>
          <i class="iconfont absolute top-1 right-1 hidden group-hover:block hover:text-red-500"
            @click.stop="deleteSession(index)">&#xe630;</i>
        </div>
      </div>
      <div @mousedown="handleLineMousedown($event)" ref="resizeLineRef"
        class=" hover:cursor-col-resize absolute -right-1 top-0 h-full w-1 border-l-2 border-grey-500"
        :class="draging ? 'bg-blue-500 border-blue-500' : 'bg-transparent'">
      </div>
      <div @click="togglePanel" :class="showPanel ? ' translate-x-1/2' : 'translate-x-12 rotate-180'"
        class=" absolute w-8 h-8 bg-white rounded-full shadow-md right-0 top-1/4 duration-300 flex justify-center items-center cursor-pointer font-extrabold text-base">
        <i class="iconfont">&#xe604;</i>
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import useSessionsStore from '@/stores/modules/chat'


const props = defineProps({
  sessions: Array,
  currentSessionId: String,
});
const searchInput = ref("")
const sessionsStore = useSessionsStore()

const showPanel = ref(true);



const emits = defineEmits(["select", "delete", "add"]);

const selectSession = (id) => {
  emits("select", id);
};
const deleteSession = (index) => {
  emits("delete", index);
};
const handleNewSession = () => {
  emits("add");
};

const togglePanel = () => {
  const sessionList = sessionListRef.value
  if (sessionList.style.width === '0px') {
    showPanel.value = true
    sessionList.style.width = '200px'
  } else {
    showPanel.value = false
    sessionList.style.width = '0px'
  }
}


const resizeLineRef = ref(null);
const sessionListRef = ref(null);
const draging = ref(false);
const minWidth = 150

const handleLineMousedown = (e) => {
  e.preventDefault();
  draging.value = true;
  let accuWidth = sessionListRef.value.getBoundingClientRect().width;
  let lastX = e.clientX;

  const lineMouseup = (e) => {
    e.preventDefault()
    draging.value = false;
    document.removeEventListener('mousemove', lineMousemove);
    document.removeEventListener('mouseup', lineMouseup);
  };

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
</script>

<style scoped lang="less"></style>