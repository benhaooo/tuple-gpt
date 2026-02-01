<template>
    <div class="transition-colors duration-300">
        <div class="max-w-6xl mx-auto">
            <!-- 页面标题和说明 -->
            <div class="mb-8">
                <h1 class="text-3xl font-bold mb-4 text-text-light-primary dark:text-text-dark-primary">
                    系统功能模型配置
                </h1>
                <p class="text-text-light-secondary dark:text-text-dark-secondary mb-2">
                    配置系统核心功能模型。这些模型是系统运行的基础组件，分别负责不同的功能任务。
                </p>
                <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    您可以为每个功能模型选择合适的AI模型并调整参数，但不能删除或新增这些系统模型。
                </p>
            </div>

            <!-- 默认助手列表 -->
            <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div v-for="assistant in defaultAssistants" :key="assistant.id"
                    class="p-6 rounded-lg border border-border-light-primary dark:border-border-dark-primary bg-surface-light-elevated dark:bg-surface-dark-elevated shadow-soft hover:shadow-md transition-shadow duration-200">

                    <!-- 助手信息 -->
                    <div class="flex flex-col h-full">
                        <div class="flex-1">
                            <!-- 头部信息 -->
                            <div class="flex items-center mb-3">
                                <div class="text-2xl mr-3">{{ assistant.emoji }}</div>
                                <div class="flex-1">
                                    <h3 class="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                                        {{ assistant.name }}
                                    </h3>
                                    <div class="flex flex-wrap gap-1 mt-1">
                                        <span v-for="tag in assistant.tags" :key="tag"
                                            class="px-2 py-1 text-xs rounded-full bg-primary-light-subtle dark:bg-primary-dark-subtle text-primary-light-emphasis dark:text-primary-dark-emphasis">
                                            {{ tag }}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- 描述 -->
                            <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4"
                               style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                                {{ assistant.description }}
                            </p>

                            <!-- 当前模型信息 -->
                            <div class="mb-4">
                                <div class="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2">
                                    当前模型:
                                </div>
                                <div class="flex items-center gap-2">
                                    <div v-if="assistant.model" class="flex items-center gap-2 px-3 py-1 rounded-md bg-surface-light-base dark:bg-surface-dark-base">
                                        <img v-if="getModelLogo(assistant.model.id)"
                                             :src="getModelLogo(assistant.model.id)"
                                             :alt="assistant.model.name"
                                             class="w-4 h-4 object-contain" />
                                        <span class="text-sm">{{ assistant.model.name }}</span>
                                    </div>
                                    <div v-else class="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                                        未选择模型
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 操作按钮 -->
                        <div class="flex items-center gap-2 mt-4">
                            <ModelSelect v-model="assistant.model" class="flex-1" />

                            <button @click="openConfig(assistant)"
                                class="p-2 hover:bg-interactive-light-hover dark:hover:bg-interactive-dark-hover rounded-md text-text-light-secondary dark:text-text-dark-secondary transition-colors duration-200"
                                title="配置助手">
                                <Cog6ToothIcon class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-if="defaultAssistants.length === 0"
                 class="text-center py-12 text-text-light-secondary dark:text-text-dark-secondary">
                <div class="text-4xl mb-4">⚙️</div>
                <p>暂无系统功能模型</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import ModelSelect from '@/views/cpnt/ModelSelect.vue'
import { openConfigDialog } from '@/utils/configDialogService'
import { useAssistantsStore } from '@/stores/modules/assistants'
import { getModelLogo } from '@/config/model'
import { ElMessage } from 'element-plus'

// 使用assistants store
const assistantsStore = useAssistantsStore()

// 获取系统功能模型列表
const defaultAssistants = computed(() => assistantsStore.defaultAssistants)

// 打开配置对话框
const openConfig = (assistant) => {
    openConfigDialog(assistant, (updatedAssistant) => {
        // 更新系统功能模型配置
        const result = assistantsStore.updateDefaultAssistant(assistant.id, updatedAssistant)

        if (result) {
            ElMessage.success('系统功能模型配置已更新')
        } else {
            ElMessage.error('更新失败，请重试')
        }
    })
}
</script>