<template>
  <div class="border-r-2 border-solid transition-all w-0 duration-300 max-md:absolute max-md:h-full z-50 bg-light-base dark:bg-dark-hard-dark"
    :class="panelShow ? ['translate-x-0', 'w-56'] : '-translate-x-full'">

    <el-button @click="handleNewSession">+</el-button>

    <div class="hidden-scroll mt-5 h-4/5 overflow-y-scroll text-light-text dark:text-dark-text">
      <div v-for="(session, index) in sessions" :key="session.id"
        class="group flex h-20 rounded-2xl transition duration-300 cursor-pointer my-5 mx-3 relative overflow-hidden border-2 border-dark-border hover:border-dark-blue-base shadow-md hover:shadow-lg hover:shadow-blue-500/50"
        :class="currentSessionId === session.id ? 'bg-dark-blue-base' : 'transparent'"
        @click="selectSession(session.id)">
        <div class="flex flex-col justify-between py-3 px-5 ">
          <div class="font-bold text-lg">{{ session.name }}</div>
          <div class="text-xs">{{ session.messages.length }}条对话</div>
        </div>
        <i class="iconfont absolute top-1 right-1 hidden group-hover:block hover:text-red-500"
          @click.stop="deleteSession(index)">&#xe630;</i>
      </div>
    </div>
    <div @click="panelShow = !panelShow"
      class="rounded-full w-6 h-6 bg-light-hard dark:bg-gray-500 absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex justify-center items-center cursor-pointer z-10">
      <i :class="panelShow ? 'rotate-0 translate-x-0' : 'rotate-180 translate-x-1'"
        class="iconfont  transition-transform">&#xe604;</i>
    </div>
  </div>

</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  sessions: Array,
  currentSessionId: String,
});

const panelShow = ref(true)

const emits = defineEmits(["select", "delete","add"]);

const selectSession = (id) => {
  emits("select", id);
};

const deleteSession = (index) => {
  emits("delete", index);
};

const handleNewSession = () => {
  emits("add");
};
</script>