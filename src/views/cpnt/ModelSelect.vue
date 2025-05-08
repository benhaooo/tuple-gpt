<template>
    <el-select :model-value="modelValue" @update:model-value="handleChange" placeholder="请选择模型" filterable
        value-key="id" ref="selectRef" @visible-change="isPopperVisible = $event">
        <template #label="{ label, value }">
            <div class="flex items-center gap-1 pl-1">
                <el-avatar :src="selectedModelIcon" size="small" /> {{ label }}
            </div>
        </template>
        <el-option-group v-for="service in mergedServices" :key="service.provider" :label="service.provider">
            <template v-for="group in service.groups" :key="group.name">
                <el-option v-for="model in group.models" :key="model.id" :value="model.id" :label="model.name"
                    :disabled="!service.status"
                    class="hover:!bg-indigo-50 active:!bg-indigo-100 rounded-lg mx-2 my-1">
                    <div class="flex items-center gap-2">
                        <el-avatar :src="group.icon" size="small" />
                        <span>{{ model.name }}</span>
                    </div>
                </el-option>
            </template>
        </el-option-group>
    </el-select>
</template>

<script setup>
import { defineProps, defineEmits, computed } from 'vue'
import useConfigStore from '@/stores/modules/config'
import { useModel } from "@/models/data"
import { ref, defineExpose } from 'vue'

const props = defineProps({
    modelValue: {
        type: String,
        default: null
    },
    // 外部传入的 services
    services: {
        type: Array,
        default: null
    }
})

const selectRef = ref(null)
const isPopperVisible = ref(false)


const openSelect = () => {
    if (!isPopperVisible.value) {
        selectRef.value.toggleMenu()
    }
}
const closeSelect = () => {
    if (isPopperVisible.value) {
        selectRef.value.toggleMenu()
        selectRef.value.blur()
    }
}

const emit = defineEmits(['update:model-value'])

const configStore = useConfigStore()

const mergedServices = computed(() => {
    return props.services || configStore.availableServices
})
const selectedModelIcon = computed(() => {
    const { group } = useModel(props.modelValue)
    return group.icon
})


const handleChange = (value) => {
    emit('update:model-value', value)
}


defineExpose({
    openSelect,
    closeSelect,
    isPopperVisible
})
</script>