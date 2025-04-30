<template>
  <div class="message mb-5 group" :class="{ self: isUser }">
    <!-- 编辑窗口 -->
    <el-dialog v-model="showEditModal" title="编辑" append-to-body>
      <el-input v-model="editText" type="textarea" :rows="10" />
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handelEditOk">确定</el-button>
      </template>
    </el-dialog>
    <div class="user-info w-full flex items-center gap-x-2 font-extrabold">
      <div class="avater-wrapper">
        <el-tooltip content="编辑" placement="top">
          <i class="iconfont center edit" @click="handleEditMessage()">&#xeabd;</i>
        </el-tooltip>
        <el-avatar :size="40" :src="isUser ? configStore.getAvatar : modelAva" />
      </div>
      <span v-if="isUser" class="text-sm font-extrabold">{{ userConfig.name }}</span>
      <div :class="{ 'flex-row-reverse': isUser }"
        class="flex gap-x-1 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
      <!-- <div class="mx-auto">
        <ExpandableBtn @click="sessionsStore.createMessage(index, message.role)" text="向上创建">
          <i class="iconfont">&#xe605;</i>
        </ExpandableBtn>
        <ExpandableBtn @click="sessionsStore.createMessage(index + 1, message.role)" text="向下创建">
          <i class="iconfont">&#xe606;</i>
        </ExpandableBtn>
      </div> -->
    </div>
    <div v-if="message.multiContent" :class="{ 'justify-end': isUser }"
      class=" flex items-start gap-2 w-full overflow-scroll p-4">
      <template v-for="(oneOf, index) in message.multiContent" :key="oneOf.id">
        <Content @click="message.selectedContent = index" :contentObj="oneOf"
          :selected="index === message.selectedContent"
          :ref="index === message.selectedContent ? 'contentValueRef' : null" />
      </template>
    </div>
    <div v-else>
      <div class="content max-w-full text-sm relative bg-white dark:bg-[#262626] 
           transition-all duration-300 rounded-[12px] p-4
           hover:bg-gray-50/40 dark:hover:bg-[#303030] group">

        <img v-if="message.img" :src="message.img" class="rounded-lg mb-3 shadow-sm" alt="消息图片">

        <div class="contentValue prose prose-gray dark:prose-invert 
             text-gray-600 dark:text-gray-300" v-html="message.content">
        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import { computed, ref, reactive, onMounted, onUpdated, onUnmounted, nextTick } from "vue";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import ExpandableBtn from "../cpnt/ExpandableBtn.vue"
import { useToast } from 'vue-toast-notification';
import useSessionsStore from "@/stores/modules/chat";
import Content from "./Content.vue"
import { copyToClip } from "@/utils/commonUtils";
import { useModel } from "@/models/data"


const sessionsStore = useSessionsStore();
const configStore = useConfigStore();
const { userConfig } = storeToRefs(configStore)

const props = defineProps({
  message: Object,
  index: Number,
});

const contentValueRef = ref(null)

const showEditModal = ref(false);
const editText = ref("");

const modelAva = computed(() => {
  const id = props.message.multiContent[0].model
  const { group } = useModel(id)
  return group.icon
})

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
  copyToClip(getContent(props.message)).then(() => {
    useToast().success('复制成功')
  })
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