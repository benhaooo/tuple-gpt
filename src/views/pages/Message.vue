<script setup>
import { ref, onMounted, onActivated, nextTick, watch } from "vue";
import useSessionsStore from "@/stores/modules/chat";
import useUserStore from "@/stores/modules/user";
import { storeToRefs } from "pinia";
import ExpandableButtom from "../cpnt/ExpandableBtn.vue";
import Message from "../cpnt/Message.vue";
import SessionList from "../cpnt/SessionList.vue";
import useAutoScrollToBottom from "@/hooks/scroll";

const sessionsStore = useSessionsStore();
const userStore = useUserStore();
const scrollRef = ref(null);
const { resetAndScrollToBottom } = useAutoScrollToBottom(scrollRef)


const text = ref("");
const showEditModal = ref(false);
const showConfigModal = ref(false);
const editMessage = ref({});
const editText = ref("");
const configForm = ref({});
const fileUrl = ref("");
const formRef = ref(null);


const { sessions, currentSessionId, currentSession } =
  storeToRefs(sessionsStore);

// 加载
onMounted(() => {
  if (!currentSessionId.value) {
    handleNewSession();
  }
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
};

// 新会话
const handleNewSession = () => {
  sessionsStore.addSession();
};

// 删除会话
const handleDeleteSession = (index) => {
  sessionsStore.deleteSession(index);
};
// 发送消息
const handleSendMessage = async () => {
  if (!text.value) return;
  if(fileUrl.value){
    sessionsStore.senImgMessage(text.value, fileUrl.value)
    return
  }
  sessionsStore.sendMessage(text.value).then(() => {
    resetAndScrollToBottom()
  })

  text.value = "";
  fileUrl.value = "";
};

// 编辑消息
const handleEditMessage = (message) => {
  showEditModal.value = true;
  editMessage.value = message;
  editText.value = message.content;
};
//确定编辑
const handelOk = () => {
  editMessage.value.content = editText.value;
  showEditModal.value = false;
};
const handelOkConfig = () => {
  sessionsStore.updataSession(configForm.value);
  showConfigModal.value = false;
};

const handelShowConfig = () => {
  configForm.value = {
    ...currentSession.value,
  };
  showConfigModal.value = true;
};

// 文本框高度自适应
const handleInputMessage = (e) => {
  const textarea = e.target;
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 100) + "px";
}
const handleImgChange = (e) => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = () => {
    fileUrl.value = reader.result;
    formRef.value.reset()
  };
  reader.readAsDataURL(file);

}
</script>


<template>
  <div class="flex h-full">
    <!-- 编辑窗口 -->
    <el-dialog v-model="showEditModal" title="编辑">
      <el-input v-model="editText" type="textarea" :rows="10" />
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handelOk">确定</el-button>
      </template>
    </el-dialog>
    <!-- 配置窗口 -->
    <el-dialog v-model="showConfigModal" title="会话配置" class="max-md:w-full">
      <el-form :model="configForm" label-width="auto" label-position="left">
        <el-form-item label="名称">
          <el-input v-model="configForm.name" />
        </el-form-item>
        <el-form-item label="模型">
          <el-select ref="select" v-model="configForm.model">
            
            <el-option value="0125-preview">0125-preview</el-option>
            <el-option value="gpt-4o">gpt-4o</el-option>
            <!-- <el-option value="gpt-3.5-turbo">gpt-3.5-turbo</el-option>
            <el-option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</el-option>
            <el-option value="gpt-4-vision-preview">gpt-4-vision-preview</el-option>
            <el-option value="dall-e-3">dall-e-3</el-option> -->
          </el-select>
        </el-form-item>
        <el-form-item label="上下文数量">
          <el-slider v-model="configForm.ctxLimit" :max="50" show-input />
        </el-form-item>
        <el-form-item label="回复数">
          <el-slider v-model="configForm.maxTokens" :max="4096" show-input />
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

    <SessionList :sessions="sessions" :currentSessionId="currentSessionId" @select="handleSelectSession"
      @delete="handleDeleteSession" @add="handleNewSession" />

    <div class="relative flex-1 bg-light-wrapper dark:bg-dark-wrapper w-full rounded-3xl md:p-5 flex flex-col md:m-8">
      <div class="hidden-scroll w-full flex-1 overflow-y-scroll" ref="scrollRef">
        <div
          class="absolute top-0 left-1/2 -translate-x-1/2 font-black bg-light-hard dark:bg-dark-hard-dark rounded-b-md py-1 px-4 cursor-pointer z-10 hover:text-blue-500"
          @click="handelShowConfig">
          {{ currentSession.model }}
        </div>
        <div v-if="currentSession.clearedCtx">
          <template v-for="(message, index) in currentSession.clearedCtx" :key="index">
            <Message :message="message" @delete="sessionsStore.deleteMessage(index)"
              @reChat="sessionsStore.reChat(index)" @edit="handleEditMessage" />
          </template>
          <div @click="sessionsStore.clearCtx()"
            class="leading-5 text-center border-y border-slate-300 hover:border-dark-blue-base cursor-pointer text-slate-300 text-xs"
            style="mask-image: linear-gradient(90deg, transparent, #000, transparent);">上下文已清除</div>
        </div>

        <template v-for="(message,index) in currentSession.messages" :key="index">
          <Message :message="message" @delete="sessionsStore.deleteMessage(index)" @reChat="sessionsStore.reChat(index)"
            @edit="handleEditMessage" />
        </template>
      </div>
      <div class="p-4">
        <div class="flex justify-between mb-3">
          <div class="flex gap-4">
            <ExpandableButtom @click="sessionsStore.clearCtx()" :text="'清除上下文'">
              <i class="iconfont text-xs">&#xe62e;</i>
            </ExpandableButtom>
            <form ref="formRef" class="relative cursor-pointer hover:bg-light-blue-base rounded px-1">
              <i class="iconfont">&#xe601;</i>
              <input type="file" @change="handleImgChange" class="absolute w-full h-full top-0 left-0 opacity-0" />
            </form>
          </div>

          <el-tooltip content="剩余tokens" placement="top">
            <div class="text-xs rounded-full bg-[#E4F0FD] px-2 leading-5">
              <i class="iconfont font-extrabold mr-2 text-green-400">&#xe8c5;</i><span
                class="text-dark-blue-base cursor-pointer">{{ userStore.getSurplusQuota }}</span>
            </div>
          </el-tooltip>
        </div>
        <div class="relative">
          <div v-if="fileUrl" class="relative w-20 h-20 rounded-md">
            <img :src="fileUrl" alt="">
            <i class="iconfont absolute right-0 top-0" @click="clearFile">&#xe630;</i>
          </div>
          <textarea
            class="p-2 text-sm rounded-xl dark:bg-dark-input-wrapper w-full h-auto border-2 border-light-border dark:border-dark-border focus:border-dark-blue-base transition-colors duration-700"
            v-model="text" placeholder="ctrl + enter 发送" @keydown.ctrl.enter="handleSendMessage"
            @input="handleInputMessage"></textarea>
          <el-tooltip content="发送" placement="top" :show-after="500">
            <button
              class="text-xs absolute right-2 bottom-2 w-10 h-8 rounded-lg border-0 bg-dark-blue-base transition-all duration-300 shadow "
              @click="handleSendMessage()"><i class="iconfont text-pink-400">&#xe888;</i></button>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>


<style lang="less" scoped></style>