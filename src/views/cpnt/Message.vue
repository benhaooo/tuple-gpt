<template>
  <div class="message group" :class="{ self: isUser }">
    <!-- 编辑窗口 -->
    <el-dialog v-model="showEditModal" title="编辑" append-to-body>
      <el-input v-model="editText" type="textarea" :rows="10" />
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handelEditOk">确定</el-button>
      </template>
    </el-dialog>
    <div>
      <div class="user-info flex items-center gap-x-2 font-extrabold">
        <div class="avater-wrapper">
          <el-tooltip content="编辑" placement="top">
            <i class="iconfont center edit" @click="handleEditMessage()">&#xeabd;</i>
          </el-tooltip>
          <img :src="isUser ? configStore.getAvatar : gptUrl" alt="" />
        </div>
        <span v-if="isUser" class="text-sm font-extrabold">{{ userConfig.name }}</span>
        <div class="flex gap-x-1 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <ExpandableBtn @click="sessionsStore.deleteMessage(message.id)" text="删除">
            <i class="iconfont">&#xec7b;</i>
          </ExpandableBtn>
          <ExpandableBtn v-if="isUser" @click="sessionsStore.reChat(message.id)" text="重试">
            <i class="iconfont">&#xe616;</i>
          </ExpandableBtn>
          <ExpandableBtn @click="copy" text="复制">
            <i class="iconfont">&#xe8b0;</i>
          </ExpandableBtn>
        </div>
      </div>
    </div>
    <div v-if="message.multiContent" class=" flex items-start gap-2 w-full overflow-x-scroll p-4">
      <template v-for="(oneOf, index) in message.multiContent" :key="index">
        <Content @click="message.selectedContent = index" :contentObj="oneOf"
          :selected="index === message.selectedContent" />
      </template>

    </div>
    <div v-else>
      <div
        class="content max-w-full text-sm hover:border-blue-500 border-4  transition-all duration-300 bg-light-hard dark:bg-dark-base"
        ref="contentRef">
        <img v-if="message.img" :src="message.img" alt="">
        <div class="contentValue" v-html="message.content" ref="contentValueRef"></div>
        <span v-if="message.chatting"
          class="typer absolute w-4 h-5 bg-[#B3C2F1] border-dark-blue-base border-2 rounded-md" />
      </div>
    </div>
  </div>

</template>

<script setup>
import { computed, ref, reactive, onMounted, onUpdated, onUnmounted } from "vue";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import { marked } from 'marked'
import ExpandableBtn from "../cpnt/ExpandableBtn.vue"
import { useToast } from 'vue-toast-notification';
import useSessionsStore from "@/stores/modules/chat";
import gptUrl from '@/assets/imgs/ye.png'
import Content from "./Content.vue"

const sessionsStore = useSessionsStore();
const configStore = useConfigStore();
const { userConfig } = storeToRefs(configStore)

const props = defineProps({
  message: Object,
});

const showEditModal = ref(false);
const editText = ref("");

const handelEditOk = () => {
  setContent(props.message, editText.value)
  showEditModal.value = false;
};
const handleEditMessage = () => {
  showEditModal.value = true;
  editText.value = getContent(props.message)
};

const getContent = (message) => {
  if (props.message.multiContent) {
    return props.message.multiContent[props.message.selectedContent].content
  } else {
    return props.message.content
  }
}
const setContent = (message, content) => {
  if (message.multiContent) {
    message.multiContent[message.selectedContent].content = content
  } else {
    message.content = content
  }
}
const isUser = computed(() => {
  return props.message.role === 'user'
})

const copy = () => {
  window.navigator.clipboard.writeText(getContent(props.message))
  useToast().success('复制成功')
}

//将选中的内容置首位
onMounted(() => {
  if (props.message.selectedContent && props.message.selectedContent > 0) {
    const { multiContent, selectedContent } = props.message;
    [multiContent[0], multiContent[selectedContent]] = [multiContent[selectedContent], multiContent[0]];
    props.message.selectedContent = 0;
  }
});
</script>

<style scoped lang="less">
.message {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .user-info {
    display: flex;

    .avater-wrapper {
      position: relative;
      height: 40px;
      width: 40px;
      clip-path: circle();
      // overflow: hidden;

      .edit {
        position: absolute;
        width: 100%;
        height: 100%;
        cursor: pointer;
        color: #000000;
        opacity: 0;
        background-color: rgba(67, 66, 87, 0.535);
        transition: 0.3s;
        z-index: 9;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
    }
  }

  .content {
    padding: 12px 12px;
    margin-top: 8px;
    border-radius: 20px;
    position: relative;

    &:hover {
      .handle {
        opacity: 1;
      }
    }
  }



  &:hover {
    .user-info {
      .avater-wrapper {
        .edit {
          opacity: 1;
        }

        img {
          opacity: 0.5;
        }
      }
    }
  }
}

.self {
  align-items: flex-end;

  .user-info {
    flex-direction: row-reverse;
  }

  .content {
    border-radius: 20px;
  }
}


:deep(code) {
  border-radius: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>