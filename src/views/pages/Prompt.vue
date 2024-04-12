<template>
  <div class="w-11/12 my-0 mx-auto">
    <div class="flex justify-evenly flex-wrap">
      <template v-for="askprompt in askprompts" :key="askprompt.id">
        <div class="askprompt-card group relative w-72 h-96 bg-light-hard dark:bg-dark-wrapper p-5 rounded-2xl my-5 hover:shadow">
          <div class=" text-green-500 text-base text-center font-black mb-5">{{ askprompt.name }}</div>
          <div class="flex flex-col items-center overflow-hidden h-full">
            <div class="text-sm">{{ askprompt.content }}</div>
            <button class="absolute w-24 h-10 bg-emerald-400 rounded-3xl opacity-0 bottom-2 transition-all duration-500 hover:shadow-sm group-hover:bottom-5 group-hover:opacity-100" @click="handelUse(askprompt)">使用-></button>
          </div>
        </div>
      </template>
    </div>

  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
const router = useRouter();
import useSessionsStore from "@/stores/modules/chat";
const sessionsStore = useSessionsStore();
import { queryPromptList } from "@/apis";

const askprompts = ref([]);

onMounted(() => {
  getList();
});

const handelUse = (askprompt) => {
  sessionsStore.askprompt = askprompt;
  router.push({
    name: "message",
  });
};
const getList = async () => {
  const res = await queryPromptList()
  const { data } = await res.json()
  askprompts.value = data
};
</script>

<style lang="less" scoped>

</style>
