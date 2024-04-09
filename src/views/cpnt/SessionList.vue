<template>
  <div class="session-list mt-5 h-4/5 overflow-y-scroll">
    <div v-for="(session, index) in sessions" :key="session.id"
      class="group flex h-20 rounded-2xl transition duration-300 cursor-pointer my-5 mx-3 relative overflow-hidden hover:bg-blue-500 shadow-md hover:shadow-lg hover:shadow-blue-500/50"
      :class="currentSessionId === session.id ? 'bg-blue-500' : 'bg-gray-600'" @click="selectSession(session.id)">
      <div class="flex flex-col justify-between py-3 px-5 text-white">
        <div class="font-bold text-white text-lg">{{ session.name }}</div>
        <div class=" text-xs">{{ session.messages.length }}条对话</div>
      </div>
      <i class="iconfont absolute top-1 right-1 hidden group-hover:block hover:text-rose-600"
        @click.stop="deleteSession(index)">&#xe630;</i>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  sessions: Array,
  currentSessionId: String,
});

const emits = defineEmits(["select", "delete"]);

const selectSession = (id) => {
  emits("select", id);
};

const deleteSession = (index) => {
  emits("delete", index);
};
</script>

<style lang="less" scoped>
.session-list {
  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

}
</style>
