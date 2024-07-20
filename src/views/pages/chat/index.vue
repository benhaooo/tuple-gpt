<script setup>
import { ref, onMounted, onActivated, nextTick, watch, computed } from "vue";
import useSessionsStore from "@/stores/modules/chat";
import useUserStore from "@/stores/modules/user";
import { storeToRefs } from "pinia";
import Message from "@/views/cpnt/Message.vue";
import SessionList from "@/views/cpnt/SessionList.vue";
import useAutoScrollToBottom from "@/hooks/scroll";
import Editor from './cpnt/Editor.vue'

const sessionsStore = useSessionsStore();
const userStore = useUserStore();
const { smoothScrollToBottom, scrollToBottom, scrollToButtomNearBottom } = useAutoScrollToBottom()


const showConfigModal = ref(false);

const configForm = ref({});

const sessionListRef = ref(null);


const { sessions, currentSessionId, currentSession } =
  storeToRefs(sessionsStore);

// 加载
onMounted(() => {
  //没有回话
  if (!currentSessionId.value) {
    handleNewSession();
  }
  scrollToBottom()
});
onActivated(() => {
  const askprompt = sessionsStore.askprompt;
  sessionsStore.askprompt = null;
  if (Object.keys(askprompt).length > 0) {
    sessionsStore.addSession();
    text.value = askprompt.content;
  }
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


const handelOkConfig = () => {
  sessionsStore.updateSession(configForm.value);
  showConfigModal.value = false;
};

const handelShowConfig = () => {
  configForm.value = {
    ...currentSession.value,
  };
  showConfigModal.value = true;
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
    <!-- 配置窗口 -->
    <el-dialog v-model="showConfigModal" title="会话配置" class="max-md:w-full">
      <el-form :model="configForm" label-width="auto" label-position="left">
        <el-form-item label="名称">
          <el-input v-model="configForm.name" />
        </el-form-item>
        <el-form-item label="模型">
          <el-select ref="select" v-model="configForm.model">

            <el-option value="0125-preview">gpt-4</el-option>
            <el-option value="gpt-4o">gpt-4o</el-option>
            <el-option value="gpt-3.5-turbo">gpt-3.5-turbo</el-option>
            <!-- <el-option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</el-option>
            <el-option value="gpt-4-vision-preview">gpt-4-vision-preview</el-option>
            <el-option value="dall-e-3">dall-e-3</el-option> -->
          </el-select>
        </el-form-item>
        <el-form-item label="上下文数量">
          <el-slider v-model="configForm.ctxLimit" :max="50" show-input />
        </el-form-item>
        <el-form-item label="回复长度">
          <el-slider v-model="configForm.maxTokens" :max="4096" show-input />
        </el-form-item>
        <el-form-item label="回复数">
          <el-slider v-model="configForm.replyCount" :max="10" show-input />
        </el-form-item>
        <el-form-item label="角色设定">
          <el-input v-model="configForm.system" type="textarea" :rows="4" aria-placeholder="给你的会话任命一个专属角色设定吧~" />
        </el-form-item>
        <el-collapse>
          <el-collapse-item title="高级配置" name="advanced">
            <el-form-item label="随机性">
              <el-slider v-model="configForm.temperature" :max="1" :step="0.01" show-input />
            </el-form-item>
            <el-form-item label="核采样">
              <el-slider v-model="configForm.top_p" :max="1" :step="0.01" show-input />
            </el-form-item>
            <el-form-item label="话题新鲜度">
              <el-slider v-model="configForm.presence_penalty" :max="1" :step="0.01" show-input />
            </el-form-item>
            <el-form-item label="频率惩罚度">
              <el-slider v-model="configForm.frequency_penalty" :max="1" :step="0.01" show-input />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>
      </el-form>
      <template #footer>
        <el-button @click="showConfigModal = false">取消</el-button>
        <el-button type="primary" @click="handelOkConfig">确定</el-button>
      </template>
    </el-dialog>

    <SessionList ref="sessionListRef" :sessions="sessions" :currentSessionId="currentSessionId"
      @select="handleSelectSession" @delete="handleDeleteSession" @add="handleNewSession" />
    <div
      class="relative flex-1 overflow-hidden max-w-full bg-light-wrapper dark:bg-dark-wrapper w-full rounded-3xl p-5 max-md:pb-0 flex flex-col md:m-4">
      <div class="hidden-scroll w-full flex-1 overflow-y-scroll" ref="scrollRef">
        <div @click="handleCallSessionList" class="absolute top-1 left-4 cursor-pointer z-10 md:hidden ">
          <i class="iconfont  text-2xl text-blue-500">&#xe66b;</i>
        </div>
        <div
          class="absolute top-0 left-1/2 -translate-x-1/2 font-black bg-light-hard dark:bg-dark-hard-dark rounded-b-md py-1 px-4 cursor-pointer z-10 hover:text-blue-500 shadow-md"
          @click="handelShowConfig">
          {{ currentSession.model }}
        </div>
        <div v-if="currentSession.clearedCtx">
          <template v-for="(message, index) in currentSession.clearedCtx" :key="index">
            <Message :message="message" @delete="sessionsStore.deleteMessage(index)"
              @reChat="sessionsStore.reChat(index)" />
          </template>
          <div @click="sessionsStore.clearCtx()"
            class="leading-5 text-center border-y border-slate-300 hover:border-dark-blue-base cursor-pointer text-slate-300 text-xs"
            style="mask-image: linear-gradient(90deg, transparent, #000, transparent);">上下文已清除</div>
        </div>

        <template v-for="(message, index) in currentSession.messages" :key="index">
          <Message :message="message" @delete="sessionsStore.deleteMessage(index)" @reChat="sessionsStore.reChat(index)"
            @edit="handleEditMessage" />
        </template>
      </div>
      <!-- editor -->
      <Editor @send="onSendMessage"></Editor>
    </div>
  </div>
</template>


<style lang="less" scoped></style>