<script setup>
import Chat from './views/Chat.vue';
import { onMounted, ref } from 'vue';
import { configDialogRef } from '@/utils/configDialogService';
import ConfigDialog from '@/views/cpnt/ConfigDialog.vue';
import { useTheme } from '@/composables/use-theme';

const localDialogRef = ref(null)

// 初始化主题系统
const { } = useTheme()

onMounted(() => {
    configDialogRef.value = localDialogRef.value
})
</script>

<template>
    <Chat />
    <ConfigDialog ref="localDialogRef" />
</template>