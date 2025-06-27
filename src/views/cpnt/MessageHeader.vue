<template>
  <div class="user-info w-full flex items-center gap-x-2 font-extrabold">
    <div class="avater-wrapper">
      <el-tooltip content="编辑" placement="top">
        <i class="iconfont center edit" @click="$emit('edit')">&#xeabd;</i>
      </el-tooltip>
      <el-avatar :size="40" :src="isUser ? configStore.getAvatar : modelAvatar" />
    </div>
    <span v-if="isUser" class="text-sm font-extrabold">{{ userConfig.name }}</span>
    <div 
      :class="{ 'flex-row-reverse': isUser }"
      class="flex gap-x-1 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100"
    >
      <ExpandableBtn @click="$emit('delete')" text="删除">
        <i class="iconfont">&#xec7b;</i>
      </ExpandableBtn>
      <ExpandableBtn v-if="isUser" @click="$emit('retry')" text="重试">
        <i class="iconfont">&#xe616;</i>
      </ExpandableBtn>
      <ExpandableBtn @click="$emit('copy')" text="复制">
        <i class="iconfont">&#xe8b0;</i>
      </ExpandableBtn>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import ExpandableBtn from './ExpandableBtn.vue';
import useConfigStore from '@/stores/modules/config';

const configStore = useConfigStore();

defineProps({
  isUser: {
    type: Boolean,
    required: true
  },
  userConfig: {
    type: Object,
    required: true
  },
  modelAvatar: {
    type: String,
    default: ''
  },
  message: {
    type: Object,
    required: true
  }
});

defineEmits(['edit', 'delete', 'retry', 'copy']);
</script>

<style scoped lang="less">
.user-info {
  display: flex;

  .avater-wrapper {
    position: relative;
    height: 40px;
    width: 40px;
    clip-path: circle();

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

.message:hover {
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
</style>
