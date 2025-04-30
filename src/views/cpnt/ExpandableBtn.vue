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

<style lang="less" scoped>
.expandable-btn {
  --primary-text-color: rgba(0, 0, 0, 0.9);
  --border-color: rgba(0, 0, 0, 0.1);
  --hover-bg: rgba(0, 0, 0, 0.05);
  
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--primary-text-color);
  font-size: 12px;
  height: 26px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &:hover {
    background: var(--hover-bg);
    border-color: rgba(0, 0, 0, 0.15);
  }

  .exp-text {
    white-space: nowrap;
    width: 0;
    opacity: 0;
    transform: translateX(-8px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding-left: 4px;
    color: inherit;
  }
}

.dark .expandable-btn {
  --primary-text-color: rgba(255, 255, 255, 0.9);
  --border-color: rgba(255, 255, 255, 0.1);
  --hover-bg: rgba(255, 255, 255, 0.05);

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }
}
</style>