<template>
    <div class="min-h-screen flex items-center justify-center">
      <div class="relative w-full max-w-lg px-4">
        <!-- 输入框和提交按钮容器 -->
        <div :class="['transition-all duration-500 ease-in-out', showContent ? 'transform -translate-y-32' : '']">
          <div class="flex items-center justify-center">
            <input
              v-model="inputText"
              type="text"
              placeholder="你是懂笔记的"
              class="w-full p-3 text-lg border-4 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              @click="handleSubmit"
              class=" px-6 py-4 text-lg font-semibold bg-blue-600 rounded-r-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <i class="iconfont">&#xe640;</i>
            </button>
          </div>
        </div>
  
        <!-- 加载指示器 -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
          <svg
            class="w-10 h-10 text-blue-600 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        </div>
  
        <!-- 内容显示区域 -->
        <transition name="fade">
          <div v-if="showContent" class="mt-16">
            <div class="p-6 bg-white rounded-lg shadow-2xl">
              <h2 class="mb-4 text-2xl font-bold text-gray-800">结果</h2>
              <p class="text-gray-700">{{ dataReceived }}</p>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const inputText = ref('')
  const loading = ref(false)
  const dataReceived = ref('')
  const showContent = ref(false)
  
  const handleSubmit = () => {
    if (!inputText.value) return
  
    if (showContent.value) {
      // 重置内容
      dataReceived.value = ''
      showContent.value = false
    }
  
    loading.value = true
    // 模拟 API 请求
    setTimeout(() => {
      loading.value = false
      dataReceived.value = `您输入的是：${inputText.value}`
      showContent.value = true
    }, 1000)
  }
  </script>
  
  <style>
  /* 渐隐渐现动画 */
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.5s ease-in-out;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
  .fade-enter-to,
  .fade-leave-from {
    opacity: 1;
  }
  </style>