<template>
    <div v-if="modelValue"
        class="flex items-center gap-2 font-black bg-light-hard dark:bg-dark-hard-dark rounded-b-md py-1 px-4 cursor-pointer z-10 hover:text-blue-500 shadow-md"
        @click="handelShowConfig">
        <el-avatar :size="20" :src="model.group.icon" />
        {{ model.model.name }}
    </div>
</template>


<script setup>
import { ref, computed } from 'vue'
import { useModel } from "@/models/data"
import useConfigStore from '@/stores/modules/config'
import { openConfigDialog } from '@/utils/configDialogService'

const configStore = useConfigStore()
const services = configStore.availableServices

const props = defineProps({
    modelValue: Object,
})

const model = computed(() => useModel(props.modelValue.model))

const handelShowConfig = () => {
    openConfigDialog(props.modelValue)
};
</script>