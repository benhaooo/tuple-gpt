<template>
    <el-select
        :model-value="currentModelId"
        @update:model-value="handleChange"
        placeholder="请选择模型"
        filterable
        value-key="id"
        ref="selectRef"
        @visible-change="isPopperVisible = $event"
        class="w-full"
    >
        <template #label="{ label, value }">
            <div class="flex items-center gap-2 pl-1">
                <div class="w-5 h-5 flex items-center justify-center">
                    <img v-if="selectedModelLogo" :src="selectedModelLogo" :alt="selectedModelName" class="w-4 h-4 object-contain" />
                    <div v-else class="w-4 h-4 bg-gray-300 rounded"></div>
                </div>
                <span class="truncate">{{ selectedModelName || label }}</span>
            </div>
        </template>

        <el-option-group
            v-for="provider in availableProviders"
            :key="provider.id"
            :label="provider.name"
        >
            <template v-if="provider.models.length > 0">
                <el-option
                    v-for="model in provider.models"
                    :key="model.id"
                    :value="model.id"
                    :label="model.name"
                    :disabled="!provider.enabled"
                    class="hover:!bg-indigo-50 active:!bg-indigo-100 rounded-lg mx-2 my-1"
                >
                    <div class="flex items-center gap-2">
                        <div class="w-5 h-5 flex items-center justify-center">
                            <img :src="getModelLogo(model.id)" :alt="model.name" class="w-4 h-4 object-contain" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="font-medium truncate">{{ model.name }}</div>
                            <div v-if="model.group" class="text-xs text-gray-500 truncate">{{ model.group }}</div>
                        </div>
                        <div v-if="!provider.enabled" class="text-xs text-gray-400">未启用</div>
                    </div>
                </el-option>
            </template>
            <el-option v-else :value="''" :label="'暂无可用模型'" disabled class="text-gray-400 text-center">
                暂无可用模型
            </el-option>
        </el-option-group>

        <template v-if="availableProviders.length === 0">
            <el-option :value="''" :label="'请先配置模型提供商'" disabled class="text-gray-400 text-center">
                请先配置模型提供商
            </el-option>
        </template>
    </el-select>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, defineExpose } from 'vue'
import { useLlmStore } from '@/stores/modules/llm'
import { getModelLogo } from '@/config/model'

const props = defineProps({
    modelValue: {
        type: [String, Object], // 支持字符串ID或完整Model对象
        default: null
    },
    // 可选：外部传入的providers（用于测试或特殊场景）
    providers: {
        type: Array,
        default: null
    }
})

const emit = defineEmits(['update:model-value'])

const selectRef = ref(null)
const isPopperVisible = ref(false)
const llmStore = useLlmStore()

// 获取可用的提供商和模型
const availableProviders = computed(() => {
    // 如果外部传入了providers，使用外部的
    if (props.providers) {
        return props.providers
    }

    // 否则使用llmStore中的providers
    return llmStore.providers
        .filter(provider => provider.enabled) // 只显示启用的提供商
        .map(provider => ({
            ...provider,
            models: provider.models.filter(model => model.id) // 确保模型有有效的ID
        }))
        .filter(provider => provider.models.length > 0) // 过滤掉没有模型的提供商
})

// 获取当前选中的模型ID
const currentModelId = computed(() => {
    if (!props.modelValue) return null

    // 如果是字符串，直接返回
    if (typeof props.modelValue === 'string') {
        return props.modelValue
    }

    // 如果是Model对象，返回其ID
    if (typeof props.modelValue === 'object' && props.modelValue.id) {
        return props.modelValue.id
    }

    return null
})

// 获取选中模型的信息
const selectedModel = computed(() => {
    if (!currentModelId.value) return null

    // 如果modelValue已经是完整的Model对象，直接使用
    if (typeof props.modelValue === 'object' && props.modelValue.id) {
        return props.modelValue
    }

    // 否则从llmStore查找
    return llmStore.findModelById(currentModelId.value)
})

const selectedModelName = computed(() => {
    return selectedModel.value?.name || ''
})

const selectedModelLogo = computed(() => {
    if (!selectedModel.value) return null
    return getModelLogo(selectedModel.value.id)
})

// 选择器控制方法
const openSelect = () => {
    if (!isPopperVisible.value) {
        selectRef.value?.toggleMenu()
    }
}

const closeSelect = () => {
    if (isPopperVisible.value) {
        selectRef.value?.toggleMenu()
        selectRef.value?.blur()
    }
}

// 处理模型选择变化
const handleChange = (value) => {
    // 查找完整的模型对象
    const model = llmStore.findModelById(value)
    if (model) {
        // 发出完整的Model对象，而不是ID
        emit('update:model-value', model)
    } else {
        console.warn(`Model with ID "${value}" not found in llmStore`)
        // 兼容性：如果找不到模型，仍然发出ID
        emit('update:model-value', value)
    }
}

defineExpose({
    openSelect,
    closeSelect,
    isPopperVisible
})
</script>