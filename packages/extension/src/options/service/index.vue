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
                <div class="flex items-center gap-3">
                    <ElButton type="primary" size="small" @click="openModelManager">
                        模型管理
                    </ElButton>
                    <ElSwitch v-if="editableProvider" color="#53b672" v-model="editableProvider.enabled" class="scale-110"></ElSwitch>
                </div>
            </div>

            <div class="space-y-6">
                <FormItem>
                    <template #title>API 密钥</template>
                    <ElInput v-if="editableProvider" v-model="editableProvider.apiKey" placeholder="请输入API Key" show-password
                        class="dark:bg-gray-800 rounded-lg" />
                </FormItem>

                <FormItem>
                    <template #title>API 地址</template>
                    <ElInput v-if="editableProvider" v-model="editableProvider.apiHost" placeholder="请输入API 地址"
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
                                        <ElButton 
                                            type="danger" 
                                            size="small" 
                                            circle
                                            @click="removeModelFromProvider(model)">
                                            <TrashIcon class="w-4 h-4" />
                                        </ElButton>
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
                            <ArrowUpRightIcon class="h-4 w-4 ml-auto" />
                        </a>
                        <a v-if="providerWebsites.apiKey" :href="providerWebsites.apiKey" target="_blank"
                            class="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <span class="text-sm">获取API Key</span>
                            <ArrowUpRightIcon class="h-4 w-4 ml-auto" />
                        </a>
                        <a v-if="providerWebsites.docs" :href="providerWebsites.docs" target="_blank"
                            class="flex items-center gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            <span class="text-sm">API文档</span>
                            <ArrowUpRightIcon class="h-4 w-4 ml-auto" />
                        </a>
                    </div>
                </FormItem>
            </div>
        </div>

        <!-- 未选择配置时的提示 -->
        <div v-else class="flex-1 flex items-center justify-center">
            <div class="text-center text-gray-500 dark:text-gray-400">
                <Cog6ToothIcon class="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p class="text-lg font-medium">请选择一个服务配置</p>
            </div>
        </div>
    </div>

    <!-- 模型管理弹窗 -->
    <ElDialog v-model="modelDialogVisible" title="模型管理" width="80%" class="model-dialog">
        <div class="flex flex-col h-[600px]">
            <!-- 搜索和过滤栏 -->
            <div class="mb-4 flex items-center gap-4">
                <ElInput v-model="modelSearchQuery" placeholder="搜索模型 ID 或名称" class="flex-1">
                    <template #prefix>
                        <MagnifyingGlassIcon class="w-4 h-4" />
                    </template>
                </ElInput>
                <ElButton type="primary" circle @click="refreshModels">
                    <ArrowPathIcon class="w-4 h-4" />
                </ElButton>
            </div>

            <!-- 分类标签栏 -->
            <div class="mb-4">
                <ElTabs v-model="activeModelTab">
                    <ElTabPane label="全部" name="all"></ElTabPane>
                    <ElTabPane label="推荐" name="recommended"></ElTabPane>
                    <ElTabPane label="视觉" name="vision"></ElTabPane>
                    <ElTabPane label="联网" name="web"></ElTabPane>
                    <ElTabPane label="免费" name="free"></ElTabPane>
                    <ElTabPane label="嵌入" name="embedding"></ElTabPane>
                    <ElTabPane label="重排" name="rerank"></ElTabPane>
                    <ElTabPane label="工具" name="tools"></ElTabPane>
                </ElTabs>
            </div>

            <!-- 模型列表 -->
            <div class="flex-1 overflow-y-auto">
                <div v-if="loading" class="flex justify-center items-center h-full">
                    <ElSkeleton :rows="10" animated />
                </div>
                <div v-else-if="filteredModels.length === 0" class="flex justify-center items-center h-full text-gray-500">
                    无符合条件的模型
                </div>
                <div v-else class="grid grid-cols-1 gap-4">
                    <div v-for="model in filteredModels" :key="model.id" 
                         :class="[
                            'border dark:border-gray-700 rounded-xl p-4 flex items-center transition-colors',
                            isModelInProvider(model) 
                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                         ]">
                        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-4">
                            <img :src="getModelLogo(model.id)" class="w-6 h-6"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWJyYWluLWNpcmN1aXQiPjxwYXRoIGQ9Ik0xMiA0YTMgMyAwIDEgMCAwIDYgMyAzIDAgMSAwIDAtNloiLz48cGF0aCBkPSJNMTIgMTRhMyAzIDAgMSAwIDAgNiAzIDMgMCAxIDAgMC02WiIvPjxwYXRoIGQ9Ik0xMiAxMHYxIi8+PHBhdGggZD0iTTEyIDEzdjEiLz48cGF0aCBkPSJNOSA3SDQuNUEyLjUgMi41IDAgMCAwIDIgOS41djUuNUEyLjUgMi41IDAgMCAwIDQuNSAxN0g5Ii8+PHBhdGggZD0iTTE1IDdoNC41QTIuNSAyLjUgMCAwIDEgMjIgOS41djUuNWEyLjUgMi41IDAgMCAxLTIuNSAyLjVIMTUiLz48L3N2Zz4='">
                        </div>
                        <div class="flex-1">
                            <div class="flex justify-between items-center">
                                <div class="text-base font-medium">{{ model.name || model.id }}</div>
                                <ElButton
                                    :type="isModelInProvider(model) ? 'danger' : 'primary'"
                                    size="small"
                                    circle
                                    @click="isModelInProvider(model) ? removeModelFromProvider(model) : addModelToProvider(model)">
                                    <TrashIcon v-if="isModelInProvider(model)" class="w-4 h-4" />
                                    <PlusIcon v-else class="w-4 h-4" />
                                </ElButton>
                            </div>
                            <div class="flex gap-2 mt-2">
                                <ElTag v-if="hasModelType(model.type, 'vision')" type="success" size="small" class="rounded-full px-2" effect="light">
                                    图像
                                </ElTag>
                                <ElTag v-if="hasModelType(model.type, 'embedding')" type="warning" size="small" class="rounded-full px-2" effect="light">
                                    嵌入
                                </ElTag>
                                <ElTag v-if="hasModelType(model.type, 'inference')" type="danger" size="small" class="rounded-full px-2" effect="light">
                                    推理
                                </ElTag>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </ElDialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import FormItem from './cpnt/FormItem.vue';
import { useLlmStore, getProviderLogo, PROVIDER_CONFIG, llmService, getModelLogo } from '@shared';
import { ArrowUpRightIcon, Cog6ToothIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/vue/24/outline';

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

// 使用Proxy创建一个计算属性，用于双向绑定整个provider对象
const editableProvider = computed(() => {
    if (!currentProvider.value) {
        return null;
    }
    // 创建一个代理来拦截对provider对象的修改
    return new Proxy(currentProvider.value, {
        set(target, key, value) {
            if (currentProvider.value) {
                llmStore.updateProvider(currentProvider.value.id, { [key]: value });
            }
            return true;
        }
    });
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

// 检查模型是否已添加到当前提供商
function isModelInProvider(model) {
    if (!currentProvider.value || !currentProvider.value.models) return false;
    return currentProvider.value.models.some(m => m.id === model.id);
}

// 将模型添加到提供商
function addModelToProvider(model) {
    if (!currentProvider.value || !editableProvider.value) return;
    
    // 检查模型是否已存在
    const existingModels = currentProvider.value.models || [];
    const isModelExists = existingModels.some(m => m.id === model.id);
    
    if (isModelExists) return;
    
    // 通过editableProvider更新models
    const updatedModels = [...existingModels, model];
    editableProvider.value.models = updatedModels;
}

// 从提供商中移除模型
function removeModelFromProvider(model) {
    if (!currentProvider.value || !editableProvider.value) return;
    
    const existingModels = currentProvider.value.models || [];
    const updatedModels = existingModels.filter(m => m.id !== model.id);
    
    // 通过editableProvider更新models
    editableProvider.value.models = updatedModels;
}

// 模型管理相关状态
const modelDialogVisible = ref(false);
const modelSearchQuery = ref('');
const activeModelTab = ref('all');
const loading = ref(false);
const availableModels = ref([]);

// 打开模型管理器
function openModelManager() {
    modelDialogVisible.value = true;
    refreshModels();
}

// 刷新模型列表
async function refreshModels() {
    if (!currentProvider.value) return;

    loading.value = true;
    try {
        // 设置当前提供商
        llmService.setProvider(currentProvider.value);
        
        // 获取模型列表
        const models = await llmService.listModels();
        availableModels.value = models;
    } catch (error) {
        console.error('获取模型列表失败:', error);
        availableModels.value = [];
    } finally {
        loading.value = false;
    }
}

// 过滤后的模型列表
const filteredModels = computed(() => {
    if (!availableModels.value || availableModels.value.length === 0) return [];
    
    let result = availableModels.value;
    
    // 根据搜索条件筛选
    if (modelSearchQuery.value) {
        const query = modelSearchQuery.value.toLowerCase();
        result = result.filter(model => 
            (model.id && model.id.toLowerCase().includes(query)) || 
            (model.name && model.name.toLowerCase().includes(query))
        );
    }
    
    // 根据标签筛选
    if (activeModelTab.value !== 'all') {
        const tabFilter = activeModelTab.value;
        result = result.filter(model => {
            if (tabFilter === 'vision' && hasModelType(model.type, 'vision')) return true;
            if (tabFilter === 'embedding' && hasModelType(model.type, 'embedding')) return true;
            if (tabFilter === 'tools' && hasModelType(model.type, 'tools')) return true;
            // 其他标签筛选逻辑可以根据需要添加
            return false;
        });
    }
    
    return result;
});

// 初始选择第一个提供商
if (providers.value.length > 0) {
    selectedProviderId.value = providers.value[0].id;
}
</script>

<style scoped>
.model-dialog .el-dialog__body {
    padding: 0 20px 20px;
}
</style>
