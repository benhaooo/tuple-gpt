<template>
  <div class="audio-recognition-container h-screen bg-surface-light-primary dark:bg-surface-dark-primary overflow-auto">
    <!-- 头部标题 -->
    <div class="header-section p-6 border-b border-border-light-primary dark:border-border-dark-primary">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
            音频识别工具
          </h1>
          <p class="text-text-light-secondary dark:text-text-dark-secondary">
            使用 OpenAI Whisper API 将音频文件转换为文字
          </p>
        </div>
        <el-button 
          type="primary" 
          :icon="Setting" 
          @click="showConfigDialog = true"
          class="config-btn"
        >
          配置
        </el-button>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content p-6 space-y-6">
      <!-- 文件上传区域 -->
      <div class="upload-section">
        <div 
          class="upload-area"
          :class="{
            'drag-over': isDragOver,
            'has-file': selectedFile
          }"
          @drop="handleDrop"
          @dragover.prevent="handleDragOver"
          @dragleave="handleDragLeave"
          @click="triggerFileInput"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".mp3,.wav,.m4a,.flac,.aac,.ogg,.wma,.mp4"
            @change="handleFileSelect"
            class="hidden"
          />
          
          <div v-if="!selectedFile" class="upload-placeholder">
            <el-icon class="upload-icon" size="48">
              <Upload />
            </el-icon>
            <h3 class="upload-title">选择或拖拽音频文件</h3>
            <p class="upload-subtitle">
              支持 MP3、WAV、M4A、FLAC、AAC、OGG、WMA、MP4 格式
            </p>
            <p class="upload-limit">
              文件大小限制：{{ formatFileSize(FILE_SIZE_LIMITS.AUDIO) }}
            </p>
          </div>

          <div v-else class="file-info">
            <el-icon class="file-icon" size="32">
              <Document />
            </el-icon>
            <div class="file-details">
              <h4 class="file-name">{{ selectedFile.name }}</h4>
              <p class="file-size">{{ formatFileSize(selectedFile.size) }}</p>
            </div>
            <el-button 
              type="danger" 
              :icon="Delete" 
              circle 
              @click.stop="removeFile"
              class="remove-btn"
            />
          </div>
        </div>
      </div>

      <!-- 识别控制区域 -->
      <div class="control-section">
        <div class="flex items-center justify-between">
          <div class="recognition-options">
            <el-form :model="recognitionOptions" inline>
              <el-form-item label="语言">
                <el-select v-model="recognitionOptions.language" placeholder="自动检测">
                  <el-option label="自动检测" value="" />
                  <el-option label="中文" value="zh" />
                  <el-option label="英文" value="en" />
                  <el-option label="日文" value="ja" />
                  <el-option label="韩文" value="ko" />
                  <el-option label="法文" value="fr" />
                  <el-option label="德文" value="de" />
                  <el-option label="西班牙文" value="es" />
                </el-select>
              </el-form-item>
              <el-form-item label="输出格式">
                <el-select v-model="recognitionOptions.responseFormat">
                  <el-option label="纯文本" value="text" />
                  <el-option label="JSON" value="json" />
                  <el-option label="SRT字幕" value="srt" />
                  <el-option label="VTT字幕" value="vtt" />
                </el-select>
              </el-form-item>
            </el-form>
          </div>
          
          <el-button 
            type="primary" 
            size="large"
            :loading="isRecognizing"
            :disabled="!selectedFile || !isConfigValid"
            @click="startRecognition"
            class="recognize-btn"
          >
            <template v-if="isRecognizing">
              识别中...
            </template>
            <template v-else>
              开始识别
            </template>
          </el-button>
        </div>
      </div>

      <!-- 进度显示 -->
      <div v-if="isRecognizing" class="progress-section">
        <el-progress 
          :percentage="uploadProgress" 
          :status="uploadProgress === 100 ? 'success' : ''"
          class="mb-4"
        />
        <p class="text-center text-text-light-secondary dark:text-text-dark-secondary">
          {{ progressText }}
        </p>
      </div>

      <!-- 结果展示区域 -->
      <div v-if="recognitionResult" class="result-section">
        <div class="result-header">
          <h3 class="result-title">识别结果</h3>
          <div class="result-actions">
            <el-button
              :icon="CopyDocument"
              @click="copyResult"
              :disabled="!recognitionResult"
            >
              复制全部
            </el-button>
            <el-button
              v-if="isJsonResult"
              :icon="CopyDocument"
              @click="copyTextOnly"
              :disabled="!recognitionResult"
              type="primary"
            >
              复制文本
            </el-button>
            <el-button
              :icon="Download"
              @click="downloadResult"
              :disabled="!recognitionResult"
            >
              下载
            </el-button>
            <el-button
              :icon="Delete"
              type="danger"
              @click="clearResult"
            >
              清除
            </el-button>
          </div>
        </div>
        
        <div class="result-content">
          <el-input
            v-model="recognitionResult"
            type="textarea"
            :rows="12"
            readonly
            class="result-textarea"
          />
        </div>
      </div>
    </div>

    <!-- 配置对话框 -->
    <el-dialog 
      v-model="showConfigDialog" 
      title="音频识别配置" 
      width="500px"
      class="config-dialog"
    >
      <el-form :model="config" label-width="100px">
        <el-form-item label="API URL" required>
          <el-input 
            v-model="config.apiUrl" 
            placeholder="https://api.openai.com/v1/audio/transcriptions"
          />
        </el-form-item>
        <el-form-item label="API Key" required>
          <el-input 
            v-model="config.apiKey" 
            type="password" 
            placeholder="sk-..."
            show-password
          />
        </el-form-item>
        <el-form-item label="模型">
          <el-select v-model="config.model" placeholder="选择模型">
            <el-option label="whisper-1" value="whisper-1" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存配置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Upload,
  Setting,
  Document,
  Delete,
  CopyDocument,
  Download
} from '@element-plus/icons-vue'
import { FILE_SIZE_LIMITS } from '@/constants/app'
import { useClipboard } from '@/composables/use-clipboard'

// 响应式数据
const fileInputRef = ref<HTMLInputElement>()
const selectedFile = ref<File | null>(null)
const isDragOver = ref(false)
const isRecognizing = ref(false)
const uploadProgress = ref(0)
const progressText = ref('')
const recognitionResult = ref('')
const showConfigDialog = ref(false)

// 识别选项
const recognitionOptions = reactive({
  language: '',
  responseFormat: 'text'
})

// 配置信息
const config = reactive({
  apiUrl: 'https://api.openai.com/v1/audio/transcriptions',
  apiKey: '',
  model: 'whisper-1'
})

// 剪贴板功能
const { copy } = useClipboard()

// 计算属性
const isConfigValid = computed(() => {
  return config.apiUrl && config.apiKey
})

// 判断识别结果是否为 JSON 格式
const isJsonResult = computed(() => {
  if (!recognitionResult.value) return false
  try {
    const parsed = JSON.parse(recognitionResult.value)
    return parsed && typeof parsed === 'object' && parsed.text
  } catch {
    return false
  }
})

// 提取 JSON 结果中的纯文本
const extractTextFromJson = (jsonString: string): string => {
  try {
    const parsed = JSON.parse(jsonString)
    if (parsed && typeof parsed === 'object') {
      // 处理 Whisper API 的标准响应格式
      if (parsed.text) {
        return parsed.text
      }
      // 处理可能的其他格式
      if (parsed.transcript) {
        return parsed.transcript
      }
      // 如果有 segments，提取所有文本
      if (parsed.segments && Array.isArray(parsed.segments)) {
        return parsed.segments.map((segment: any) => segment.text || '').join(' ')
      }
    }
    return jsonString // 如果无法提取，返回原始内容
  } catch {
    return jsonString // 如果解析失败，返回原始内容
  }
}

// 文件大小格式化
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 验证文件类型
const isValidAudioFile = (file: File): boolean => {
  const validTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/flac',
    'audio/aac',
    'audio/ogg',
    'audio/x-ms-wma',
    'video/mp4'  // MP4 视频文件（通常包含音频轨道）
  ]
  const validExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg', '.wma', '.mp4']

  return validTypes.includes(file.type) ||
         validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
}

// 文件上传相关方法
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    validateAndSetFile(file)
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  const files = event.dataTransfer?.files
  if (files && files.length > 0 && files[0]) {
    validateAndSetFile(files[0])
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const validateAndSetFile = (file: File) => {
  // 验证文件类型
  if (!isValidAudioFile(file)) {
    ElMessage.error('请选择有效的音频文件格式')
    return
  }

  // 验证文件大小
  if (file.size > FILE_SIZE_LIMITS.AUDIO) {
    ElMessage.error(`文件大小不能超过 ${formatFileSize(FILE_SIZE_LIMITS.AUDIO)}`)
    return
  }

  selectedFile.value = file
  ElMessage.success('文件选择成功')
}

const removeFile = () => {
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

// 音频识别相关方法
const startRecognition = async () => {
  if (!selectedFile.value || !isConfigValid.value) {
    ElMessage.error('请选择文件并配置API信息')
    return
  }

  isRecognizing.value = true
  uploadProgress.value = 0
  progressText.value = '准备上传文件...'
  recognitionResult.value = ''

  try {
    await performRecognition()
  } catch (error) {
    console.error('识别失败:', error)
    ElMessage.error('音频识别失败，请检查配置和网络连接')
  } finally {
    isRecognizing.value = false
    uploadProgress.value = 0
    progressText.value = ''
  }
}

const performRecognition = async () => {
  const formData = new FormData()
  formData.append('file', selectedFile.value!)
  formData.append('model', config.model)

  if (recognitionOptions.language) {
    formData.append('language', recognitionOptions.language)
  }

  formData.append('response_format', recognitionOptions.responseFormat)

  // 模拟上传进度
  const progressInterval = setInterval(() => {
    if (uploadProgress.value < 90) {
      uploadProgress.value += Math.random() * 10
      progressText.value = `上传中... ${Math.round(uploadProgress.value)}%`
    }
  }, 200)

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: formData
    })

    clearInterval(progressInterval)
    uploadProgress.value = 100
    progressText.value = '处理中...'

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    let result
    if (recognitionOptions.responseFormat === 'json') {
      const jsonResult = await response.json()
      result = JSON.stringify(jsonResult, null, 2)
    } else {
      result = await response.text()
    }

    recognitionResult.value = result
    progressText.value = '识别完成！'
    ElMessage.success('音频识别完成')

  } catch (error) {
    clearInterval(progressInterval)
    throw error
  }
}

// 结果操作方法
const copyResult = async () => {
  if (!recognitionResult.value) return

  try {
    await copy(recognitionResult.value)
    ElMessage.success('完整结果已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const copyTextOnly = async () => {
  if (!recognitionResult.value) return

  try {
    const textContent = extractTextFromJson(recognitionResult.value)
    await copy(textContent)
    ElMessage.success('文本内容已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制文本失败')
  }
}

const downloadResult = () => {
  if (!recognitionResult.value) return

  const fileName = selectedFile.value?.name.replace(/\.[^/.]+$/, '') || 'audio_transcription'
  const extension = recognitionOptions.responseFormat === 'json' ? 'json' : 'txt'

  const blob = new Blob([recognitionResult.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}_transcription.${extension}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success('文件下载成功')
}

const clearResult = async () => {
  try {
    await ElMessageBox.confirm('确定要清除识别结果吗？', '确认', {
      type: 'warning'
    })
    recognitionResult.value = ''
    ElMessage.success('结果已清除')
  } catch {
    // 用户取消
  }
}

// 配置管理方法
const saveConfig = () => {
  if (!config.apiUrl || !config.apiKey) {
    ElMessage.error('请填写完整的配置信息')
    return
  }

  // 保存到本地存储
  localStorage.setItem('audio-recognition-config', JSON.stringify(config))
  showConfigDialog.value = false
  ElMessage.success('配置保存成功')
}

const loadConfig = () => {
  try {
    const savedConfig = localStorage.getItem('audio-recognition-config')
    if (savedConfig) {
      const parsedConfig = JSON.parse(savedConfig)
      Object.assign(config, parsedConfig)
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.audio-recognition-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.upload-area {
  @apply border-2 border-dashed border-border-light-primary dark:border-border-dark-primary
         rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
         bg-surface-light-secondary dark:bg-surface-dark-secondary
         hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-surface-dark-tertiary;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area.drag-over {
  @apply border-primary-500 bg-primary-50 dark:bg-surface-dark-tertiary;
  transform: scale(1.02);
}

.upload-area.has-file {
  @apply border-semantic-success-light dark:border-semantic-success-dark
         bg-green-50 dark:bg-green-900/20;
}

.upload-placeholder {
  @apply space-y-4;
}

.upload-icon {
  @apply text-text-light-tertiary dark:text-text-dark-tertiary mx-auto;
}

.upload-title {
  @apply text-lg font-semibold text-text-light-primary dark:text-text-dark-primary;
}

.upload-subtitle {
  @apply text-text-light-secondary dark:text-text-dark-secondary;
}

.upload-limit {
  @apply text-sm text-text-light-tertiary dark:text-text-dark-tertiary;
}

.file-info {
  @apply flex items-center space-x-4 w-full max-w-md;
}

.file-icon {
  @apply text-semantic-success-light dark:text-semantic-success-dark;
}

.file-details {
  @apply flex-1 text-left;
}

.file-name {
  @apply font-medium text-text-light-primary dark:text-text-dark-primary truncate;
}

.file-size {
  @apply text-sm text-text-light-secondary dark:text-text-dark-secondary;
}

.remove-btn {
  @apply flex-shrink-0;
}

.control-section {
  @apply bg-surface-light-elevated dark:bg-surface-dark-elevated
         rounded-xl p-6 border border-border-light-primary dark:border-border-dark-primary;
}

.recognize-btn {
  @apply px-8 py-3 font-medium;
}

.progress-section {
  @apply bg-surface-light-elevated dark:bg-surface-dark-elevated
         rounded-xl p-6 border border-border-light-primary dark:border-border-dark-primary;
}

.result-section {
  @apply bg-surface-light-elevated dark:bg-surface-dark-elevated
         rounded-xl border border-border-light-primary dark:border-border-dark-primary;
}

.result-header {
  @apply flex items-center justify-between p-6 border-b border-border-light-primary dark:border-border-dark-primary;
}

.result-title {
  @apply text-lg font-semibold text-text-light-primary dark:text-text-dark-primary;
}

.result-actions {
  @apply flex space-x-2;
}

.result-content {
  @apply p-6;
}

.result-textarea :deep(.el-textarea__inner) {
  @apply bg-surface-light-secondary dark:bg-surface-dark-secondary
         border-border-light-primary dark:border-border-dark-primary
         text-text-light-primary dark:text-text-dark-primary
         font-mono text-sm leading-relaxed;
}

.config-dialog :deep(.el-dialog) {
  @apply bg-surface-light-primary dark:bg-surface-dark-primary;
}

.config-dialog :deep(.el-dialog__header) {
  @apply border-b border-border-light-primary dark:border-border-dark-primary;
}

.config-dialog :deep(.el-dialog__title) {
  @apply text-text-light-primary dark:text-text-dark-primary;
}

/* Element Plus 组件样式覆盖 */
:deep(.el-form-item__label) {
  @apply text-text-light-primary dark:text-text-dark-primary;
}

:deep(.el-input__inner) {
  @apply bg-surface-light-secondary dark:bg-surface-dark-secondary
         border-border-light-primary dark:border-border-dark-primary
         text-text-light-primary dark:text-text-dark-primary;
}

:deep(.el-select .el-input__inner) {
  @apply bg-surface-light-secondary dark:bg-surface-dark-secondary;
}

:deep(.el-button) {
  @apply transition-all duration-200;
}

:deep(.el-progress-bar__outer) {
  @apply bg-surface-light-tertiary dark:bg-surface-dark-tertiary;
}

:deep(.el-progress-bar__inner) {
  @apply bg-gradient-to-r from-primary-500 to-primary-600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    @apply p-4 space-y-4;
  }

  .upload-area {
    @apply p-6;
    min-height: 150px;
  }

  .control-section .flex {
    @apply flex-col space-y-4;
  }

  .recognition-options .el-form {
    @apply block;
  }

  .recognition-options .el-form-item {
    @apply mb-4;
  }

  .result-header {
    @apply flex-col space-y-4 items-start;
  }

  .result-actions {
    @apply w-full justify-start;
  }
}
</style>
