<template>
  <div
    class="expandable-btn"
    @mouseenter="handleHover"
    @mouseleave="handleLeave"
  >
    <slot> </slot>
    <span class="exp-text" ref="expText">{{ props.text }}</span>
  </div>
</template>

<script setup>
import { onMounted, ref, onBeforeUnmount } from "vue";
const props = defineProps({
  text: "",
});

const expText = ref(null);

let timeoutId;
let naturalWidth;

onMounted(() => {
  // 获取自然宽度
  naturalWidth = expText.value.scrollWidth + "px";
});

const handleHover = () => {
  timeoutId = setTimeout(() => {
    expText.value.style.width = naturalWidth;
    expText.value.style.opacity = "1";
    expText.value.style.transform = "translateX(5px)";
  }, 800);
};

const handleLeave = () => {
  clearTimeout(timeoutId);
  expText.value.style.width = "0";
  expText.value.style.opacity = "0";
  expText.value.style.transform = "translateX(-5px)";
};

onBeforeUnmount(() => {
  clearTimeout(timeoutId);
});
</script>

<style lang="less" scoped>
.expandable-btn {
  display: flex;
  align-items: center;
  overflow: hidden;
  cursor: pointer;

  padding: 0 10px;
  border-radius: 12px;
  border: 1px solid #CDCDCD;
  color: #303030;
  font-size: 12px;
  height: 22px;

  &:hover {
    background-color: #E7E7E7;
  }
  .exp-text {
    white-space: nowrap;
    width: 0;
    transform: translateX(-5px);
    opacity: 0;
    transition: width 0.5s ease, opacity 0.5s ease, transform 0.5s ease;
  }
}
</style>
