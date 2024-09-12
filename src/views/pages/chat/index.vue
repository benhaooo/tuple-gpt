<script setup>
import { ref, onMounted, onActivated, nextTick, watch, computed } from "vue";
import useSessionsStore from "@/stores/modules/chat";
import useConfigStore from '@/stores/modules/config'
import { storeToRefs } from "pinia";
import Message from "@/views/cpnt/Message.vue";
import SessionList from "@/views/cpnt/SessionList.vue";
import useAutoScrollToBottom from "@/hooks/scroll";
import Editor from './cpnt/Editor.vue'
import ConfigDialog from "./cpnt/ConfigDialog.vue";

const sessionsStore = useSessionsStore();

const { scrollRef, smoothScrollToBottom, scrollToBottom, scrollToButtomNearBottom } = useAutoScrollToBottom()

const sessionListRef = ref(null);

const { sessions, currentSessionId, currentSession } =
  storeToRefs(sessionsStore);

const localCurrentSession = ref(currentSession.value);
watch(localCurrentSession, (newValue) => {
  sessionsStore.updateSession(newValue);
});
watch(currentSession, (newValue) => {
  localCurrentSession.value = newValue;
});

// 切换会话
const handleSelectSession = async (id) => {
  sessionsStore.setCurrentSession(id);
  scrollToBottom()
};

// 新会话
const handleNewSession = () => {
  sessionsStore.addSession({ name: "New Chat", prompt: "" });
};

// 删除会话
const handleDeleteSession = (index) => {
  sessionsStore.deleteSession(index);
};

const onSendMessage = () => {
  smoothScrollToBottom()
};
// 唤出会话列表面板
const handleCallSessionList = () => {
  sessionListRef.value.togglePanel();
}


</script>
<template>
  <div class="flex h-full">
    <SessionList ref="sessionListRef" :sessions="sessions" :currentSessionId="currentSessionId"
      @select="handleSelectSession" @delete="handleDeleteSession" @add="handleNewSession" />
    <div
      class="relative flex-1 overflow-hidden max-w-full bg-light-wrapper dark:bg-dark-wrapper w-full rounded-3xl p-5 max-md:pb-0 flex flex-col md:m-4">
      <div class="w-full flex-1 overflow-y-scroll" ref="scrollRef">
        <div @click="handleCallSessionList" class="absolute top-1 left-4 cursor-pointer z-10 md:hidden ">
          <i class="iconfont  text-2xl text-blue-500">&#xe66b;</i>
        </div>
        <div class="absolute w-full h-9 top-0 left-1/2 -translate-x-1/2 flex justify-evenly font-black z-10">
          <template v-if="localCurrentSession.ai && localCurrentSession.ai.length">
            <ConfigDialog v-for="(aiItem, index) in localCurrentSession.ai" :key="index"
              v-model="localCurrentSession.ai[index]"></ConfigDialog>
          </template>
          <ConfigDialog v-else v-model="localCurrentSession"></ConfigDialog>
        </div>

        <div v-if="currentSession.clearedCtx">
          <template v-for="(message, index) in currentSession.clearedCtx" :key="message.id">
            <Message :message="message" :index="index" />
          </template>
          <div @click="sessionsStore.clearCtx()"
            class="leading-5 text-center border-y border-slate-300 hover:border-dark-blue-base cursor-pointer text-slate-300 text-xs"
            style="mask-image: linear-gradient(90deg, transparent, #000, transparent);">上下文已清除</div>
        </div>

        <template v-for="(message, index) in currentSession.messages" :key="message.id">
          <Message :message="message" :index="index" @delete="sessionsStore.deleteMessage(index)"
            @reChat="sessionsStore.reChat(index)" class="animate__animated animate__fadeIn duration-75" />
        </template>
      </div>
      <!-- editor -->
      <Editor @send="onSendMessage"></Editor>
    </div>
  </div>
</template>


<style lang="less" scoped></style>