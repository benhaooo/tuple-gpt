<template>
  <div class="flex-1 flex items-center justify-center bg-surface">
    <h1 class="text-2xl text-text-secondary">{{ title }} 页面</h1>
  </div>
</template>
 
<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script> 