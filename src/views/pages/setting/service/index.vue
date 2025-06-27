<template>
    <div class="flex transition-colors duration-300 dark:bg-[#181818] bg-white text-gray-800 dark:text-gray-200 h-full">
        <!-- 侧边栏 -->
        <div class="w-72 p-4 border-r border-gray-200 dark:border-gray-700">
            <div v-for="provider in providers" @click="selectedProviderId = provider.id" :key="provider.id" :class="[
                'flex justify-start items-center w-full h-12 rounded-xl cursor-pointer mb-3 px-4 transition-all duration-200',
                provider.id === selectedProviderId
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-sm'
                    : 'border border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
            ]">
                <img v-if="getProviderLogo(provider.type)" :src="getProviderLogo(provider.type)" class="w-5 h-5 mr-3">
                <div v-else class="w-5 h-5 mr-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="text-sm font-medium">{{ provider.name || provider.type }}</div>
                <div v-if="provider.enabled"
                    class="ml-auto py-1 px-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-full text-xs font-medium">
                    ON
                </div>
            </div>
        </div>

        <!-- 主内容区 -->
        <div v-if="currentProvider" class="flex-1 p-6 max-w-3xl">
            <div class="flex justify-between items-center mb-8 pb-3 border-b border-gray-200 dark:border-gray-700">
                <h1 class="text-xl font-bold">{{ currentProvider.name || currentProvider.type }}</h1>
                <ElSwitch color="#53b672" v-model="providerEnabled" class="scale-110"></ElSwitch>
            </div>

            <div class="space-y-6">
                <FormItem>
                    <template #title>API 密钥</template>
                    <ElInput v-model="currentProvider.apiKey" placeholder="请输入API Key" show-password
                        class="dark:bg-gray-800 rounded-lg" />
                </FormItem>

                <FormItem>
                    <template #title>API 地址</template>
                    <ElInput v-model="currentProvider.apiHost" placeholder="请输入API 地址"
                        class="dark:bg-gray-800 rounded-lg" />
                </FormItem>

                <FormItem v-if="currentProvider.models && currentProvider.models.length > 0">
                    <template #title>模型</template>
                    <div class="space-y-4">
                        <div class="w-full border dark:border-gray-700 rounded-xl p-5 bg-gray-50 dark:bg-gray-800/50 shadow-sm">
                            <div class="text-lg font-medium mb-3">可用模型</div>
                            <div class="space-y-3">
                                <div v-for="model in currentProvider.models" :key="model.id"
                                    class="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-700/30 rounded-lg transition-colors">
                                    <div
                                        class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                        <img v-if="getProviderLogo(currentProvider.type)" 
                                             :src="getProviderLogo(currentProvider.type)" 
                                             class="w-5 h-5"
                                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWJyYWluLWNpcmN1aXQiPjxwYXRoIGQ9Ik0xMiA0YTMgMyAwIDEgMCAwIDYgMyAzIDAgMSAwIDAtNloiLz48cGF0aCBkPSJNMTIgMTRhMyAzIDAgMSAwIDAgNiAzIDMgMCAxIDAgMC02WiIvPjxwYXRoIGQ9Ik0xMiAxMHYxIi8+PHBhdGggZD0iTTEyIDEzdjEiLz48cGF0aCBkPSJNOSA3SDQuNUEyLjUgMi41IDAgMCAwIDIgOS41djUuNUEyLjUgMi41IDAgMCAwIDQuNSAxN0g5Ii8+PHBhdGggZD0iTTE1IDdoNC41QTIuNSAyLjUgMCAwIDEgMjIgOS41djUuNWEyLjUgMi41IDAgMCAxLTIuNSAyLjVIMTUiLz48L3N2Zz4='">
                                    </div>
                                    <div class="text-sm font-medium flex-grow">{{ model.name || model.id }}</div>
                                    <div class="flex gap-2">
                                        <ElTag v-if="hasModelType(model.type, 'vision')" type="success" size="small" class="rounded-full px-2" effect="dark">
                                            图像
                                        </ElTag>
                                        <ElTag v-if="hasModelType(model.type, 'embedding')" type="warning" size="small" class="rounded-full px-2" effect="dark">
                                            嵌入
                                        </ElTag>
                                        <ElTag v-if="hasModelType(model.type, 'inference')" type="danger" size="small" class="rounded-full px-2" effect="dark">
                                            推理
                                        </ElTag>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </FormItem>
                
                <!-- 相关链接部分 - 从PROVIDER_CONFIG中获取 -->
                <FormItem v-if="providerWebsites">
                    <template #title>相关链接</template>
                    <div class="grid grid-cols-2 gap-3">
                        <a v-if="providerWebsites.official" :href="providerWebsites.official" target="_blank"
                            class="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <span class="text-sm">官方网站</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                        <a v-if="providerWebsites.apiKey" :href="providerWebsites.apiKey" target="_blank"
                            class="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <span class="text-sm">获取API Key</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                        <a v-if="providerWebsites.docs" :href="providerWebsites.docs" target="_blank"
                            class="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <span class="text-sm">API文档</span>
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
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
import { ref, computed } from 'vue';
import FormItem from './cpnt/FormItem.vue';
import { useLlmStore } from '@/stores/modules/llm';
import { getProviderLogo } from '@/config/providers';
import { PROVIDER_CONFIG } from '@/config/providers';

const llmStore = useLlmStore();
const providers = computed(() => llmStore.providers);

// 选中的提供商ID
const selectedProviderId = ref(null);

// 当前选中的提供商数据
const currentProvider = computed(() => {
    if (!selectedProviderId.value) {
        return null;
    }
    return providers.value.find(provider => provider.id === selectedProviderId.value);
});

// 获取提供商的网站链接信息（从原始PROVIDER_CONFIG中获取）
const providerWebsites = computed(() => {
    if (!currentProvider.value) return null;
    const providerType = currentProvider.value.type;
    return PROVIDER_CONFIG[providerType]?.websites || null;
});

// 检查模型是否有特定类型
function hasModelType(types, typeToCheck) {
    if (!types) return false;
    if (Array.isArray(types)) {
        return types.includes(typeToCheck);
    }
    return types === typeToCheck;
}

// 提供商是否启用
const providerEnabled = computed({
    get() {
        return currentProvider.value ? currentProvider.value.enabled : false;
    },
    set(val) {
        if (currentProvider.value) {
            // 更新提供商的enabled属性
            llmStore.updateProvider(currentProvider.value.id, { enabled: val });
        }
    }
});

// 初始选择第一个提供商
if (providers.value.length > 0) {
    selectedProviderId.value = providers.value[0].id;
}
</script>
