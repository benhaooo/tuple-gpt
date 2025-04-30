<template>
  <div class="h-full w-full  py-12 px-4">
    <div class="max-w-3xl mx-auto space-y-8">
      <!-- 标题 -->
      <h1 class="text-4xl font-bold text-center text-gray-800">
        Speech to Text
        <span class="text-blue-500">.</span>
      </h1>

      <!-- API 选择 -->
      <div class="flex justify-end">
        <select 
          v-model="selectedApi"
          class="px-4 py-2 rounded-lg bg-white text-black border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
        >
          <option v-for="api in apis" :key="api.value" :value="api.value">
            {{ api.label }}
          </option>
        </select>
      </div>

      <!-- 文件上传区域 -->
      <div 
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="handleDrop"
        class="group relative h-64 border-4 border-dashed rounded-3xl transition-all duration-200"
        :class="[
          isDragging 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-200 hover:border-blue-200',
          isConverting ? 'opacity-50 pointer-events-none' : ''
        ]"
      >
        <input 
          type="file"
          ref="fileInput"
          @change="handleFileSelect"
          class="hidden"
          accept="audio/*"
        />
        
        <div class="absolute inset-0 flex flex-col items-center justify-center space-y-4">
          <CloudArrowUpIcon class="w-16 h-16 text-gray-400 group-hover:text-blue-400 transition-colors" />
          
          <div class="text-center space-y-1">
            <p class="text-lg font-medium text-gray-700">
              拖放文件或
              <button 
                @click="openFilePicker"
                class="text-blue-500 hover:text-blue-600 underline"
              >
                选择文件
              </button>
            </p>
            <p class="text-sm text-gray-400">
              支持格式：MP3, WAV, AAC（最大200MB）
            </p>
          </div>
          
          <div v-if="selectedFile" class="mt-4 flex items-center space-x-2">
            <DocumentIcon class="w-5 h-5 text-green-500" />
            <span class="font-medium text-gray-700">{{ selectedFile.name }}</span>
            <button 
              @click="removeFile"
              class="text-red-400 hover:text-red-500"
            >
              &times;
            </button>
          </div>
        </div>
      </div>

      <!-- 转换按钮 -->
      <button
        @click="handleConvert"
        :disabled="!selectedFile || isConverting"
        class="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        <svg 
          v-if="isConverting"
          class="animate-spin h-5 w-5 mr-2 text-white" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ isConverting ? '转换中...' : '开始转换' }}
      </button>

      <!-- 转换结果 -->
      <div v-if="conversionResult" class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 class="font-medium text-gray-700">转换结果</h3>
          <button
            @click="copyResult"
            class="text-blue-500 hover:text-blue-600 text-sm flex items-center"
          >
            <ClipboardDocumentIcon class="w-4 h-4 mr-1" />
            复制
          </button>
        </div>
        <pre class="p-4 overflow-auto max-h-96 text-gray-700 bg-gray-50 rounded-b-xl">{{ conversionResult }}</pre>
      </div>

      <!-- 错误提示 -->
      <div 
        v-if="errorMessage"
        class="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100"
      >
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { CloudArrowUpIcon, DocumentIcon, ClipboardDocumentIcon } from '@heroicons/vue/24/outline'

const apis = [
  { label: 'Google Speech API', value: 'google' },
  { label: 'Microsoft Azure API', value: 'azure' },
  { label: 'Amazon Transcribe', value: 'aws' }
]

const selectedApi = ref('google')
const isDragging = ref(false)
const selectedFile = ref(null)
const isConverting = ref(false)
const conversionResult = ref('')
const errorMessage = ref('')
const fileInput = ref(null)

const handleDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (validateFile(file)) {
    selectedFile.value = file
  }
  isDragging.value = false
}

const openFilePicker = () => {
  fileInput.value.click()
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (validateFile(file)) {
    selectedFile.value = file
  }
}

const validateFile = (file) => {
  if (!file) return false
  const validTypes = ['audio/mpeg', 'audio/wav', 'audio/aac']
  if (!validTypes.includes(file.type)) {
    errorMessage.value = '不支持的文件格式'
    return false
  }
  if (file.size > 200 * 1024 * 1024) {
    errorMessage.value = '文件大小超过限制'
    return false
  }
  errorMessage.value = ''
  return true
}

const removeFile = () => {
  selectedFile.value = null
}

const handleConvert = async () => {
  try {
    isConverting.value = true
    // 这里调用实际的API转换逻辑
    await new Promise(resolve => setTimeout(resolve, 2000))
    conversionResult.value = `示例转换结果：
    这是模拟的转换文本内容，实际应用中将会显示真实的语音识别结果。
    ${new Date().toLocaleTimeString()}
    `
  } catch (err) {
    errorMessage.value = '转换失败，请重试'
  } finally {
    isConverting.value = false
  }
}

const copyResult = () => {
  navigator.clipboard.writeText(conversionResult.value)
}
</script>

<style>
/* 自定义滚动条 */
pre::-webkit-scrollbar {
  @apply w-2 h-2;
}

pre::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

pre::-webkit-scrollbar-thumb {
  @apply bg-gray-300 rounded hover:bg-gray-400;
}
</style>