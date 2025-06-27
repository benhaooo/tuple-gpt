<template>
  <div 
    class="message mb-5 group" 
    :class="{ self: isUser }"
    :data-message-id="message.id"
  >
    <!-- 编辑窗口 -->
    <el-dialog v-model="showEditModal" title="编辑" append-to-body>
      <el-input v-model="editText" type="textarea" :rows="10" />
      <template #footer>
        <el-button @click="showEditModal = false">取消</el-button>
        <el-button type="primary" @click="handelEditOk">确定</el-button>
      </template>
    </el-dialog>

    <!-- 用户信息区域 -->
    <MessageHeader 
      :is-user="isUser"
      :user-config="userConfig"
      :model-avatar="modelAva"
      :message="message"
      @edit="handleEditMessage"
      @delete="$emit('delete')"
      @retry="$emit('reChat')"
      @copy="copy"
    />
    
    <!-- 消息内容区域 -->
    <MessageContent
      v-if="message.multiContent"
      :message="message"
      :is-user="isUser"
      :get-model-name="getModelName"
      ref="messageContentRef"
    />
    
    <!-- 单一内容显示 -->
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
import { computed, ref, shallowRef, markRaw, onMounted, onUnmounted, defineAsyncComponent } from "vue";
import { storeToRefs } from "pinia";
import useConfigStore from "@/stores/modules/config";
import { useToast } from 'vue-toast-notification';
import { copyToClip } from "@/utils/commonUtils";
import { useModel } from "@/models/data";
import { useResourceCleanup } from "@/utils/resource-manager";

// 懒加载组件
const MessageHeader = defineAsyncComponent(() => import('./MessageHeader.vue'));
const MessageContent = defineAsyncComponent(() => import('./MessageContent.vue'));

// 组合式函数
const { componentId, cleanup } = useResourceCleanup();
const configStore = useConfigStore();
const { userConfig } = storeToRefs(configStore);

// Props 和 Emits
const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  index: {
    type: Number,
    required: true
  },
});

const emit = defineEmits(['delete', 'reChat']);

// 响应式数据 - 使用 shallowRef 优化性能
const showEditModal = ref(false);
const editText = ref("");
const messageContentRef = shallowRef(null);

// 计算属性 - 使用缓存优化
const isUser = computed(() => props.message.role === 'user');

const modelAva = computed(() => {
  if (!props.message.multiContent || props.message.multiContent.length === 0) return '';
  const id = props.message.multiContent[0].model;
  const { group } = useModel(id);
  return group.icon;
});

// 方法
const getModelName = (modelId) => {
  const { model } = useModel(modelId);
  return model.name || `模型 ${modelId}`;
};

const handelEditOk = () => {
  setContent(props.message, editText.value);
  showEditModal.value = false;
};

const handleEditMessage = () => {
  showEditModal.value = true;
  editText.value = getContent(props.message);
};

const getContent = (message) => {
  if (message.multiContent) {
    return message.multiContent[message.selectedContent].content;
  } else {
    return message.content;
  }
};

const setContent = (message, content) => {
  if (message.multiContent) {
    message.multiContent[message.selectedContent].content = content;
  } else {
    message.content = content;
  }
};

const copy = () => {
  copyToClip(getContent(props.message)).then(() => {
    useToast().success('复制成功');
  });
};

// 生命周期
onMounted(() => {
  // 优化：将选中的内容置首位，但只在必要时执行
  if (props.message.multiContent && 
      props.message.selectedContent && 
      props.message.selectedContent > 0) {
    const { multiContent, selectedContent } = props.message;
    [multiContent[0], multiContent[selectedContent]] = [multiContent[selectedContent], multiContent[0]];
    props.message.selectedContent = 0;
  }
});

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped lang="less">
.message {
  .content {
    padding: 12px 12px;
    margin-top: 8px;
    border-radius: 20px;
    position: relative;
  }
}

.self {
  align-items: flex-end;

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
