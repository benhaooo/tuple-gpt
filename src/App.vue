<script setup>
import Chat from './views/Chat.vue';
import { onMounted, ref } from 'vue';
import { configDialogRef } from '@/utils/configDialogService';
import ConfigDialog from '@/views/cpnt/ConfigDialog.vue';
import useConfigStore from '@/stores/modules/config'
import { modelService, mergeServiceConfigurations } from './constants/model';

const localDialogRef = ref(null)
onMounted(() => {
    configDialogRef.value = localDialogRef.value
    const configStore = useConfigStore()
    configStore.serviceConfig = mergeServiceConfigurations(configStore.serviceConfig, modelService)
})
</script>

<template>
    <Chat />
    <ConfigDialog ref="localDialogRef" />
</template>