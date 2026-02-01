<template>
    <div v-if="assistant"
        class="flex items-center gap-2 font-black bg-light-hard dark:bg-dark-hard-dark rounded-b-md py-1 px-4 cursor-pointer z-10 hover:text-blue-500 shadow-md"
        @click="handelShowConfig">
        <el-avatar :size="20" :src="modelLogo" />
        {{ modelName }}
    </div>
</template>


<script setup>
import { computed } from 'vue'
import { useAssistantsStore } from '@/stores/modules/assistants'
import { getModelLogo } from '@/config/model'
import { openConfigDialog } from '@/utils/configDialogService'

const props = defineProps({
    modelValue: {
        type: Object,
        default: () => null
    }
})

const assistantsStore = useAssistantsStore()

const assistant = computed(() => props.modelValue)

const modelLogo = computed(() => {
    if (assistant.value && assistant.value.model) {
        return getModelLogo(assistant.value.model.id)
    }
    return getModelLogo('')
})

const modelName = computed(() => {
  console.log("🚀 ~ file: ConfigDialog.vue:39 ~ assistant.value:", assistant.value)

    return assistant.value?.model?.name || '选择模型'
})

const handelShowConfig = () => {
    if (!assistant.value) return

    // 直接传递完整的assistant对象，无需转换
    openConfigDialog(assistant.value, (updatedAssistant) => {
        // 直接使用更新后的assistant对象
        assistantsStore.updateAssistant(assistant.value.id, updatedAssistant)
    })
}
</script>