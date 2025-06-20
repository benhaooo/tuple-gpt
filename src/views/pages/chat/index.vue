<script setup>
import { ref, onMounted, onActivated, nextTick, watch, computed } from "vue";
import useSessionsStore from "@/stores/modules/chat";
import { storeToRefs } from "pinia";
import Message from "@/views/cpnt/Message.vue";
import SessionList from "@/views/cpnt/SessionList.vue";
import useAutoScrollToBottom from "@/hooks/scroll";
import Editor from './cpnt/Editor.vue'
import ConfigDialog from "./cpnt/ConfigDialog.vue";
import { useWindowSize } from '@/hooks/size'


const sessionsStore = useSessionsStore();

const { scrollRef, smoothScrollToBottom, scrollToBottom, scrollToButtomNearBottom } = useAutoScrollToBottom()

const { sessions, currentSessionId, currentSession } =
  storeToRefs(sessionsStore);

const localCurrentSession = computed({
  get() {
    return currentSession.value;
  },
  set(newValue) {
    sessionsStore.updateSession(newValue);
  }
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


// 切换会话
const handleSelectSession = async (id) => {
  sessionsStore.setCurrentSession(id);
  scrollToBottom()
};

// 新会话
const handleNewSession = () => {
  sessionsStore.addSession();
};

// 删除会话
const handleDeleteSession = (index) => {
  sessionsStore.deleteSession(index);
};

const onSendMessage = () => {
  smoothScrollToBottom()
};

</script>
<template>
  <div ref="chatRef" class="h-full w-full overflow-hidden">
    <div class="flex max-md:w-[200vw] h-full max-md:-translate-x-1/2 ">
      <SessionList ref="sessionListRef" :sessions="sessions" :currentSessionId="currentSessionId"
        @select="handleSelectSession" @delete="handleDeleteSession" @add="handleNewSession" />
      <div v-if="currentSession"
        class="relative grow-1 max-md:shrink-0 max-md:w-screen overflow-hidden bg-surface-light-secondary dark:bg-surface-dark-secondary w-full rounded-3xl p-5 box-border max-md:pb-0 flex flex-col md:m-4">
        <div class="w-full flex-1 overflow-y-scroll" ref="scrollRef">
          <div class="absolute w-full h-9 top-0 left-1/2 -translate-x-1/2 flex justify-evenly font-black z-10">
            <ConfigDialog v-if="localCurrentSession.ai?.[0]" v-model="localCurrentSession.ai[0]">
            </ConfigDialog>
            <ConfigDialog v-model="localCurrentSession"></ConfigDialog>
            <ConfigDialog v-if="localCurrentSession.ai?.[1]" v-model="localCurrentSession.ai[1]">
            </ConfigDialog>
          </div>

          <div v-if="currentSession?.clearedCtx">
            <template v-for="(message, index) in currentSession.clearedCtx" :key="message.id">
              <Message :message="message" :index="index" />
            </template>
            <div @click="sessionsStore.clearCtx()"
              class="leading-5 text-center border-y border-border-light-secondary dark:border-border-dark-secondary hover:border-primary-500 cursor-pointer text-text-light-tertiary dark:text-text-dark-tertiary text-xs transition-colors duration-200"
              style="mask-image: linear-gradient(90deg, transparent, #000, transparent);">上下文已清除</div>
          </div>

          <template v-for="(message, index) in currentSession?.messages" :key="message.id">
            <Message :message="message" :index="index" @delete="sessionsStore.deleteMessage(index)"
              @reChat="sessionsStore.reChat(index)" class="animate__animated animate__fadeIn duration-75" />
          </template>
        </div>
        <!-- editor -->
        <Editor @send="onSendMessage"></Editor>
      </div>
      <div v-else>

      </div>
    </div>
  </div>
</template>


<style lang="less" scoped></style>