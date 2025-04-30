<template>
    <div class="flex transition-colors duration-300 dark:bg-[#181818] bg-white text-gray-800 dark:text-gray-200 h-full">
        <!-- 侧边栏 -->
        <div class="w-72 p-4 border-r border-gray-200 dark:border-gray-700">
            <div v-for="(config, index) in serviceConfig" @click="selectedConfig = config" :key="index" :class="[
                'flex justify-start items-center w-full h-12 rounded-xl cursor-pointer mb-3 px-4 transition-all duration-200',
                config.provider === selectedConfig?.provider
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                    : 'border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
            ]">
                <img :src="config.logo" class="w-5 h-5 mr-3">
                <div class="text-sm font-medium">{{ config.provider }}</div>
                <div v-if="config.status"
                    class="ml-auto py-1 px-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-full text-xs font-medium">
                    ON
                </div>
            </div>
        </div>

        <!-- 主内容区 -->
        <div v-if="selectedConfig" class="flex-1 p-6 max-w-3xl">
            <div class="flex justify-between items-center mb-8 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h1 class="text-xl font-bold">{{ selectedConfig.provider }}</h1>
                <ElSwitch color="#53b672" v-model="selectedConfig.status" class="scale-110"></ElSwitch>
            </div>

            <div class="space-y-6">
                <FormItem>
                    <template #title>API 密钥</template>
                    <ElInput v-model="selectedConfig.api_key" placeholder="请输入API Key" show-password
                        class="dark:bg-gray-800 rounded-lg" />
                </FormItem>

                <FormItem>
                    <template #title>API 地址</template>
                    <ElInput v-model="selectedConfig.api_url" placeholder="请输入API 地址"
                        class="dark:bg-gray-800 rounded-lg" />
                </FormItem>

                <FormItem>
                    <template #title>模型</template>
                    <div class="space-y-4">
                        <div v-for="(group, index) in selectedConfig.groups" :key="group"
                            class="w-full border dark:border-gray-700 rounded-xl p-5 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
                            <div class="text-lg font-medium mb-3">{{ group.name }}</div>
                            <div class="space-y-3">
                                <div v-for="(model, idx) in group.models" :key="idx"
                                    class="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                                    <div
                                        class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                        <img :src="group.icon" class="w-5 h-5"
                                            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWJyYWluLWNpcmN1aXQiPjxwYXRoIGQ9Ik0xMiA0YTMgMyAwIDEgMCAwIDYgMyAzIDAgMSAwIDAtNloiLz48cGF0aCBkPSJNMTIgMTRhMyAzIDAgMSAwIDAgNiAzIDMgMCAxIDAgMC02WiIvPjxwYXRoIGQ9Ik0xMiAxMHYxIi8+PHBhdGggZD0iTTEyIDEzdjEiLz48cGF0aCBkPSJNOSA3SDQuNUEyLjUgMi41IDAgMCAwIDIgOS41djUuNUEyLjUgMi41IDAgMCAwIDQuNSAxN0g5Ii8+PHBhdGggZD0iTTE1IDdoNC41QTIuNSAyLjUgMCAwIDEgMjIgOS41djUuNWEyLjUgMi41IDAgMCAxLTIuNSAyLjVIMTUiLz48L3N2Zz4='">
                                    </div>
                                    <div class="text-sm font-medium flex-grow">{{ model.name }}</div>
                                    <div class="flex gap-2">
                                        <ElTag v-for="(tag, tagIdx) in filterTag(model.power)" :key="tagIdx"
                                            :type="tag.type" size="small" class="rounded-full px-2" effect="dark">
                                            {{ tag.label }}
                                        </ElTag>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </FormItem>
            </div>
        </div>

        <!-- 未选择配置时的提示 -->
        <div v-else class="flex-1 flex items-center justify-center">
            <div class="text-center text-gray-500 dark:text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto mb-4 opacity-50" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p class="text-lg font-medium">请选择一个服务配置</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import useConfigStore from '@/stores/modules/config'
import { deepClone } from '@/utils/commonUtils'
import { ref } from 'vue';
import FormItem from './cpnt/FormItem.vue'

const { serviceConfig } = useConfigStore();
const defaultConfig = deepClone(serviceConfig);
const selectedConfig = ref(null);


const tagConfigs = [
    { type: 'success', label: '图像' },
    { type: 'warning', label: '嵌入' },
    { type: 'danger', label: '推理' }
];
const filterTag = (tags) => {
    return tagConfigs.filter((_, index) => !!tags?.[index])
}
</script>
