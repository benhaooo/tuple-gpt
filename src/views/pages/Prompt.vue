<template>
  <div class=" p-16">
    <div v-for="(categoryData, categoryName) in promptsData" :key="categoryName" class="">
      <h2 class=" font-extrabold text-3xl text-center mb-8">{{ categoryName }}</h2>

      <div class=" flex flex-wrap gap-10 justify-center">
        <div v-for="promptData in categoryData" :key="promptData.name" @click="usePrompt(promptData)"
          :style="{ backgroundImage: getBG() }"
          class=" flex w-56 h-40 rounded-xl p-4 cursor-pointer hover:shadow-md duration-500">
          <div></div>
          <div class="">
            <div class=" font-extrabold mb-2">
              {{ promptData.name }}
            </div>
            <div class=" text-sm">
              {{ promptData.scription }}
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import prompts from '@/script/output/combine.json';
import { ref, reactive, toRefs } from 'vue';
import { useRouter, useRoute } from "vue-router"
import useSessionsStore from "@/stores/modules/chat";
const sessionsStore = useSessionsStore();

const router = useRouter()
const promptsData = reactive(prompts)

const bg_dist = ['linear-gradient( 90deg, #D2E0FA 0%, #B1CCFF 100%)', 'linear-gradient( 90deg, #C7EBFF 0%, #5FC5FF 100%)', 'linear-gradient( 94deg, #FFEBC1 0%, #FFD98C 100%)', 'linear-gradient( 90deg, #CDF6E8 0%, #8CE7C8 100%)']
//随机颜色
const getBG = () => {
  return bg_dist[Math.floor(Math.random() * bg_dist.length)]
}
const usePrompt = (promptData) => {
  sessionsStore.addSession(promptData)
  router.push('/chat/message')
}

</script>

<style lang="less" scoped></style>
