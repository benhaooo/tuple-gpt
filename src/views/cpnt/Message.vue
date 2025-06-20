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
    </div>
    
    <div v-if="message.multiContent" :class="{ 'flex justify-end': isUser && message.multiContent.length === 1 }">
      <!-- 单个消息，直接全宽显示 -->
      <div v-if="message.multiContent.length === 1" class="mt-4" :class="{ 'max-w-[80%]': isUser }">
        <Content 
          :contentObj="message.multiContent[0]" 
          :selected="true"
          ref="contentValueRef" />
      </div>
      
      <!-- 多个消息，显示卡片模式或标签页模式 -->
      <div v-else class="mt-4 w-full">
        <!-- 卡片模式 -->
        <div v-if="!expandedView" :class="{ 'justify-end': isUser }"
          class="flex items-start gap-2 w-full overflow-x-auto p-4 message-cards">
          <template v-for="(oneOf, index) in message.multiContent" :key="oneOf.id">
            <div class="card-container" style="min-width: 50%; max-width: 50%;">
              <Content @click="selectContent(index)" :contentObj="oneOf"
                :selected="index === message.selectedContent"
                :ref="index === message.selectedContent ? 'contentValueRef' : null" />
            </div>
          </template>
        </div>
        
        <!-- 标签页模式 -->
        <div v-else>
          <div class="flex justify-between items-center mb-2">
            <el-button size="small" @click="expandedView = false" type="text">
              <i class="iconfont mr-1">&#xe66b;</i>返回卡片视图
            </el-button>
            <span class="text-xs text-gray-500">{{ message.selectedContent + 1 }} / {{ message.multiContent.length }}</span>
          </div>
          <el-tabs v-model="activeTab" type="border-card" class="custom-tabs">
            <el-tab-pane 
              v-for="(oneOf, index) in message.multiContent" 
              :key="oneOf.id"
              :label="getModelName(oneOf.model)"
              :name="`${index}`">
              <Content 
                :contentObj="oneOf" 
                :selected="true"
                :ref="index === message.selectedContent ? 'contentValueRef' : null" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </div>
    
    <div v-else :class="{ 'flex justify-end': isUser }">
      <div class="content max-w-full text-sm relative bg-surface-light-elevated dark:bg-surface-dark-elevated
           transition-all duration-300 rounded-[12px] p-4 border border-border-light-primary dark:border-border-dark-primary
           hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover group shadow-soft"
           :class="{ 'max-w-[80%]': isUser }">

        <img v-if="message.img" :src="message.img" class="rounded-lg mb-3 shadow-sm" alt="消息图片">

        <div class="contentValue prose prose-gray dark:prose-invert 
             text-gray-600 dark:text-gray-300" v-html="message.content">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted, onUpdated, onUnmounted, nextTick, watch } from "vue";
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
const expandedView = ref(false);
const activeTab = ref('0');

// 监听选中内容变化，同步标签页
watch(() => props.message.selectedContent, (newVal) => {
  activeTab.value = String(newVal);
});

// 监听标签页变化，同步选中内容
watch(() => activeTab.value, (newVal) => {
  props.message.selectedContent = Number(newVal);
});

const showEditModal = ref(false);
const editText = ref("");

const modelAva = computed(() => {
  if (!props.message.multiContent || props.message.multiContent.length === 0) return '';
  const id = props.message.multiContent[0].model
  const { group } = useModel(id)
  return group.icon
})

// 获取模型名称
const getModelName = (modelId) => {
  const { model } = useModel(modelId)
  return model.name || `模型 ${modelId}`
}

const handelEditOk = () => {
  setContent(props.message, editText.value)
  showEditModal.value = false;
};
const handleEditMessage = () => {
  showEditModal.value = true;
  editText.value = getContent(props.message)
};

// 选择内容并切换到扩展视图
const selectContent = (index) => {
  props.message.selectedContent = index;
  expandedView.value = true;
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
  if (props.message.multiContent && props.message.selectedContent && props.message.selectedContent > 0) {
    const { multiContent, selectedContent } = props.message;
    [multiContent[0], multiContent[selectedContent]] = [multiContent[selectedContent], multiContent[0]];
    props.message.selectedContent = 0;
  }
  
  // 默认设置标签页的活跃选项
  if (props.message.multiContent && props.message.multiContent.length > 1) {
    activeTab.value = String(props.message.selectedContent);
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

  .message-cards {
    .card-container {
      flex: 0 0 50%;
      transition: all 0.3s ease;
      
      &:hover {
        transform: translateY(-3px);
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

.custom-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 10px;
  }

  :deep(.el-tabs__item) {
    height: 30px;
    line-height: 30px;
    font-size: 12px;
    padding: 0 10px;
  }
  
  :deep(.el-tabs__nav) {
    border: none;
  }
}

:deep(code) {
  border-radius: 16px;
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>