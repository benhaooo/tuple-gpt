<script setup>
import { ref, onMounted, onActivated, nextTick } from "vue";
import { generateUniqueId, delay } from "@/utils/commonUtils";
import useSessionsStore from "@/stores/modules/chat";
import useConfigStoe from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import ExpandableButtom from "../cpnt/ExpandableBtn.vue";
import Message from "../cpnt/Message.vue";
import SessionList from "../cpnt/SessionList.vue";
import { completions } from "@/apis/index.js"

const sessionsStore = useSessionsStore();
const configStore = useConfigStoe();


const text = ref("");
const showEditModal = ref(false);
const showConfigModal = ref(false);
const editMessage = ref({});
const editText = ref("");
const configForm = ref({});


const scroll = ref(null);

const { sessions, currentSessionId, currentSession } =
  storeToRefs(sessionsStore);
const { moduleConfig } = storeToRefs(configStore)
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
    sessionsStore.addSession(getBaseSession(moduleConfig.value));
    text.value = askprompt.content;
  }
});

// 切换会话
const handleSelectSession = async (id) => {
  sessionsStore.setCurrentSession(id);

  await nextTick();
  smoothScrollToBottom();
};

// 新会话
const handleNewSession = () => {
  sessionsStore.addSession(getBaseSession(moduleConfig.value));
};

const getBaseSession = (config) => {
  return {
    id: generateUniqueId(),
    messages: [
      {
        role: "system",
        content: "您好，请问有什么可以帮助您的吗？",
      },
    ],
    ...config

  };
};
// 删除会话
const handleDeleteSession = (index) => {
  sessionsStore.deleteSession(index);
};
// 发送消息
const handleSendMessage = async () => {
  if (!text.value) return;
  currentSession.value.messages.push({
    id: generateUniqueId(),
    role: "user",
    content: text.value,
  });
  text.value = "";
  const msgId = generateUniqueId();
  const systemMessage = {
    id: generateUniqueId(),
    role: "system",
    content: currentSession.value.system || "你是一名智能AI助手"
  }
  const data = {
    model: currentSession.value.model,
    message_id: msgId,
    messages: [systemMessage, ...currentSession.value.messages],
  }
  currentSession.value.messages.push({
    id: msgId,
    role: "assistant",
    content: "",
    chatting: true
  });
  const chatting = currentSession.value.messages.filter(
    (msg) => msg.id == msgId
  )[0];
  const response = await completions(data)
  console.log("接收到消息")

  handleStreamMsg(response, chatting)
  await nextTick();
  smoothScrollToBottom();
};

const handleStreamMsg = (response, chatting) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  new ReadableStream({
    start(controller) {
      async function push() {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          await delay(1000)
          delete chatting["chatting"]
          return;
        }
        controller.enqueue(value);
        const text = decoder.decode(value);
        // 权限校验
        if (text === "0003") {
          controller.close();
        }
        for (let word of text) {
          chatting.content += word;
          await delay(4);
        }
        push();
      }
      push();
    },
  });
}


// 删除消息
const handleDeleteMessage = (id) => {
  currentSession.value.messages = currentSession.value.messages.filter(
    (msg) => msg.id != id
  );
};

// // 清楚上下文
const handelClearCtx = () => {
  if (!currentSession.value.clearedCtx) {
    currentSession.value.clearedCtx = [];
  }
  currentSession.value.clearedCtx.push(...currentSession.value.messages);
  currentSession.value.messages = [];
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

// 滚动到底部
const smoothScrollToBottom = () => {
  const maxScrollTop = scroll.value.scrollHeight - scroll.value.clientHeight;
  let currentScrollTop = scroll.value.scrollTop;

  const step = () => {
    currentScrollTop += 20;

    if (currentScrollTop >= maxScrollTop) {
      scroll.value.scrollTop = maxScrollTop;
    } else {
      scroll.value.scrollTop = currentScrollTop;
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};
</script>


<template>
  <div class="flex h-full">
    <el-dialog v-model="showEditModal" title="编辑">
      <textarea class="input" v-model="editText" style="height: 300px"></textarea>

      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handelOk">确定</el-button>
      </template>
    </el-dialog>
    <!-- 会话配置 -->
    <el-dialog v-model="showConfigModal" title="会话配置" class="max-md:w-full">
      <el-form :model="configForm" label-width="auto" label-position="left">
        <el-form-item label="名称">
          <el-input v-model="configForm.name" />
        </el-form-item>
        <el-form-item label="模型">
          <el-select ref="select" v-model="configForm.model">
            <el-option value="gpt-3.5-turbo">gpt-3.5-turbo</el-option>
            <el-option value="gpt-3.5-turbo-16k">gpt-3.5-turbo-16k</el-option>
            <el-option value="gpt-4">gpt-4</el-option>
            <el-option value="gpt-4-vision-preview">gpt-4-vision-preview</el-option>
            <el-option value="glm-3-turbo">glm-3-turbo</el-option>
            <el-option value="chatglm_pro">chatglm_pro</el-option>
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

    <div class="relative flex-1 bg-light-wrapper dark:bg-dark-wrapper w-full rounded-3xl p-5 flex flex-col md:m-8">
      <div class="hidden-scroll w-full flex-1 overflow-y-scroll" ref="scroll">
        <div
          class="absolute top-0 left-1/2 -translate-x-1/2 font-black bg-light-hard dark:bg-dark-hard-dark rounded-b-md py-1 px-4 cursor-pointer z-10 hover:text-blue-500"
          @click="handelShowConfig">
          {{ currentSession.model }}
        </div>
        <div v-if="currentSession.clearedCtx">
          <template v-for="message in currentSession.clearedCtx" :key="message.id">
            <Message :message="message" @delete="handleDeleteMessage" @edit="handleEditMessage" />
          </template>
          <div class="leading-5 text-center border-y border-slate-300 cursor-pointer text-slate-300 text-xs"
            style="mask-image: linear-gradient(90deg, transparent, #000, transparent);">上下文已清除</div>
        </div>

        <template v-for="message in currentSession.messages" :key="message.id">
          <Message :message="message" @delete="handleDeleteMessage" @edit="handleEditMessage" />
        </template>
      </div>
      <div class="md:p-5">
        <div class="flex mb-5">
          <ExpandableButtom @click="handelClearCtx" :text="'清除上下文'">
            <i class="iconfont" style="font-size: 12px">&#xe62e;</i>
          </ExpandableButtom>
        </div>
        <div class="relative">
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