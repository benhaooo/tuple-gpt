<template>
  <div class="loadingio-spinner-ellipsis-o39wckhq2z">
    <div class="ldio-pkjvywjoru">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  </div>
</template>

<script setup>
</script>

<style lang="less" scoped>
@keyframes ldio-pkjvywjoru {
  0% {
    transform: translate(6px, 40px) scale(0);
  }
  25% {
    transform: translate(6px, 40px) scale(0);
  }
  50% {
    transform: translate(6px, 40px) scale(1);
  }
  75% {
    transform: translate(40px, 40px) scale(1);
  }
  100% {
    transform: translate(74px, 40px) scale(1);
  }
}
@keyframes ldio-pkjvywjoru-r {
  0% {
    transform: translate(74px, 40px) scale(1);
  }
  100% {
    transform: translate(74px, 40px) scale(0);
  }
}
@keyframes ldio-pkjvywjoru-c {
  0% {
    background: #e15b64;
  }
  25% {
    background: #abbd81;
  }
  50% {
    background: #f8b26a;
  }
  75% {
    background: #f47e60;
  }
  100% {
    background: #e15b64;
  }
}
.ldio-pkjvywjoru div {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  transform: translate(40px, 40px) scale(1);
  background: #e15b64;
  animation: ldio-pkjvywjoru 1s infinite cubic-bezier(0, 0.5, 0.5, 1);
}
.ldio-pkjvywjoru div:nth-child(1) {
  background: #f47e60;
  transform: translate(74px, 40px) scale(1);
  animation: ldio-pkjvywjoru-r 0.25s infinite cubic-bezier(0, 0.5, 0.5, 1),
    ldio-pkjvywjoru-c 1s infinite step-start;
}
.ldio-pkjvywjoru div:nth-child(2) {
  animation-delay: -0.25s;
  background: #e15b64;
}
.ldio-pkjvywjoru div:nth-child(3) {
  animation-delay: -0.5s;
  background: #f47e60;
}
.ldio-pkjvywjoru div:nth-child(4) {
  animation-delay: -0.75s;
  background: #f8b26a;
}
.ldio-pkjvywjoru div:nth-child(5) {
  animation-delay: -1s;
  background: #abbd81;
}
.loadingio-spinner-ellipsis-o39wckhq2z {
  width: 51px;
  height: 51px;
  display: inline-block;
  overflow: hidden;
  background: transparent;
}
.ldio-pkjvywjoru {
  width: 100%;
  height: 100%;
  position: relative;
  transform: translateZ(0) scale(0.51);
  backface-visibility: hidden;
  transform-origin: 0 0; /* see note above */
}
.ldio-pkjvywjoru div {
  box-sizing: content-box;
}
</style>