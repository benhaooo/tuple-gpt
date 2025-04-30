<template>
    <ModelSelect class="w-0 h-0 overflow-hidden opacity-0" ref="selectRef" :value='modelValue'
        @update:model-value="handleChange" :services="services" popper-class="at-popper" :filterable="false">
    </ModelSelect>
</template>

<script setup>
import { defineProps, defineEmits, defineExpose, computed, ref, watch, watchEffect } from 'vue'
import ModelSelect from './ModelSelect.vue'
import useConfigStore from '@/stores/modules/config'

const props = defineProps({
    modelValue: {
        type: String,
        default: null
    },
    services: {
        type: Array,
        default: null
    }
})
const selectRef = ref(null)
const filterText = ref('')

const openAtSelect = (text) => {
    filterText.value = text
    selectRef.value.openSelect()
}
const closeAtSelect = () => {
    selectRef.value.closeSelect()
}
watchEffect(() => {
    if (selectRef.value?.isPopperVisible && !services.value.length > 0) {
        closeAtSelect()
    }
})


const emit = defineEmits(['update:model-value'])

const configStore = useConfigStore()

const services = computed(() => {
    const mergedServices = props.services || configStore.availableServices
    return mergedServices.map(service => ({
        ...service,
        groups: service.groups.map(group => ({
            ...group,
            models: group.models.filter(model => model.name.toLowerCase().includes(filterText.value.toLowerCase()))
        }))
    })).filter(service => service.groups.some(group => group.models.length > 0))
})
const handleChange = (value) => {
    emit('update:model-value', value)
}

defineExpose({
    openAtSelect,
    closeAtSelect,
})

</script>

<style lang="less"></style>