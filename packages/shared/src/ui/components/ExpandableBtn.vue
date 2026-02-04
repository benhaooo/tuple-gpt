<template>
  <div
    class="expandable-btn"
    @mouseenter="handleHover"
    @mouseleave="handleLeave"
  >
    <slot />
    <span class="exp-text" ref="expText">{{ props.text }}</span>
  </div>
</template>

<script setup>
import { onMounted, ref, onBeforeUnmount } from "vue";

const props = defineProps({
  text: String,
});

const expText = ref(null);
let timeoutId;
let naturalWidth;

onMounted(() => {
  naturalWidth = `${expText.value.scrollWidth}px`;
});

const handleHover = () => {
  timeoutId = setTimeout(() => {
    expText.value.style.width = naturalWidth;
    expText.value.style.opacity = 1;
    expText.value.style.transform = "translateX(8px)";
  }, 300);
};

const handleLeave = () => {
  clearTimeout(timeoutId);
  expText.value.style.width = 0;
  expText.value.style.opacity = 0;
  expText.value.style.transform = "translateX(-8px)";
};

onBeforeUnmount(() => clearTimeout(timeoutId));
</script>

<style scoped>
.expandable-btn {
  @apply inline-flex items-center px-2 py-1 rounded-lg border transition-all duration-300 overflow-hidden cursor-pointer;
  @apply border-border-light-primary dark:border-border-dark-primary;
  @apply bg-transparent;
  @apply text-text-light-primary dark:text-text-dark-primary;
  @apply text-xs h-7;
}

.expandable-btn:hover {
  @apply bg-interactive-light-hover dark:bg-interactive-dark-hover;
  @apply border-border-light-secondary dark:border-border-dark-secondary;
}

.exp-text {
  @apply whitespace-nowrap w-0 opacity-0 transition-all duration-300 pl-1;
  transform: translateX(-8px);
}
</style>