<template>
  <div class="flex h-screen bg-gray-100">
    <!-- 左侧视频处理区域 -->
    <div class="w-1/2 p-4 flex flex-col h-full overflow-hidden">
      <h2 class="text-xl font-bold mb-4">视频输入</h2>

      <!-- 输入方式选择 -->
      <el-tabs v-model="inputType" class="mb-4">
        <el-tab-pane label="上传视频" name="upload">
          <el-upload class="upload-demo" drag action="/api/upload-video" :on-success="handleUploadSuccess"
            :before-upload="beforeUpload">
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持mp4, mov, avi等常见视频格式
              </div>
            </template>
          </el-upload>
        </el-tab-pane>

        <el-tab-pane label="视频链接" name="link">
          <el-form :model="linkForm" class="mb-4">
            <el-form-item>
              <el-input v-model="linkForm.url" placeholder="输入YouTube或Bilibili链接" class="mb-2" />
              <el-button type="primary" @click="fetchVideoFromLink">获取视频</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <!-- 视频信息 -->
      <div v-if="videoInfo.id" class="bg-white p-4 rounded-lg shadow mb-4">
        <el-form :model="videoInfo" label-width="80px">
          <el-form-item label="标题">
            <el-input v-model="videoInfo.title" />
          </el-form-item>
          <el-form-item label="简介">
            <el-input type="textarea" v-model="videoInfo.description" rows="3" />
          </el-form-item>
        </el-form>
      </div>

      <!-- 视频播放器 -->
      <div v-if="videoInfo.id" class="flex-grow bg-black rounded-lg overflow-hidden relative">
        <video ref="videoPlayer" class="w-full h-full" controls :src="videoInfo.videoUrl"></video>
      </div>

      <!-- 处理结果 -->
      <div v-if="processingComplete" class="mt-4 bg-white p-4 rounded-lg shadow">
        <h3 class="font-bold mb-2">处理结果</h3>
        <div class="flex flex-wrap gap-2">
          <el-button type="success" @click="downloadOriginalVideo">
            <el-icon>
              <download />
            </el-icon> 下载原视频
          </el-button>
          <el-button type="success" @click="downloadProcessedVideo">
            <el-icon>
              <download />
            </el-icon> 下载处理后视频
          </el-button>
          <el-button type="success" @click="downloadAudio">
            <el-icon>
              <download />
            </el-icon> 下载音频
          </el-button>
        </div>

        <el-progress v-if="processing" :percentage="processingProgress"
          :status="processingProgress === 100 ? 'success' : ''" class="mt-2" />
      </div>
    </div>

    <!-- 右侧字幕编辑区域 -->
    <div class="w-1/2 p-4 bg-white border-l border-gray-200 flex flex-col h-full">
      <h2 class="text-xl font-bold mb-4">字幕编辑</h2>

      <!-- 字幕列表 -->
      <div class="flex-grow overflow-y-auto">
        <el-empty v-if="!subtitles.length" description="暂无字幕数据" />

        <div v-else class="space-y-2">
          <div v-for="(item, index) in subtitles" :key="index"
            class="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
            :class="{ 'bg-blue-50 border-blue-300': currentSubtitleIndex === index }"
            @click="jumpToTimestamp(item.start, index)">
            <div class="flex justify-between text-sm text-gray-500 mb-1">
              <span>{{ formatTime(item.start) }} - {{ formatTime(item.end) }}</span>
              <div>
                <el-button type="primary" size="small" text @click.stop="editSubtitle(index)">
                  <el-icon>
                    <edit />
                  </el-icon>
                </el-button>
                <el-button type="danger" size="small" text @click.stop="deleteSubtitle(index)">
                  <el-icon>
                    <delete />
                  </el-icon>
                </el-button>
              </div>
            </div>
            <div>{{ item.text }}</div>
          </div>
        </div>
      </div>

      <!-- 字幕编辑对话框 -->
      <el-dialog v-model="editDialogVisible" title="编辑字幕" width="50%">
        <el-form :model="editingSubtitle" label-width="80px">
          <el-form-item label="开始时间">
            <el-input v-model="editingSubtitle.start" />
          </el-form-item>
          <el-form-item label="结束时间">
            <el-input v-model="editingSubtitle.end" />
          </el-form-item>
          <el-form-item label="字幕文本">
            <el-input type="textarea" v-model="editingSubtitle.text" rows="3" />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="editDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveSubtitleEdit">
              确认
            </el-button>
          </span>
        </template>
      </el-dialog>

      <!-- 底部操作栏 -->
      <div class="mt-4 pt-4 border-t border-gray-200">
        <div class="flex justify-between">
          <el-button type="primary" @click="exportSubtitles('srt')">导出SRT</el-button>
          <el-button type="primary" @click="exportSubtitles('vtt')">导出VTT</el-button>
          <el-button type="success" @click="saveChanges">保存更改</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { UploadFilled, Download, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 状态变量
const inputType = ref('upload')
const videoInfo = reactive({
  id: '',
  title: '',
  description: '',
  videoUrl: '',
  audioUrl: '',
  processedVideoUrl: ''
})
const linkForm = reactive({
  url: ''
})
const processing = ref(false)
const processingProgress = ref(0)
const processingComplete = ref(false)
const videoPlayer = ref(null)

// 字幕相关
const subtitles = ref([])
const currentSubtitleIndex = ref(-1)
const editDialogVisible = ref(false)
const editingSubtitle = reactive({
  index: -1,
  start: '',
  end: '',
  text: ''
})

// 处理上传成功
const handleUploadSuccess = (response) => {
  if (response.success) {
    videoInfo.id = response.videoId
    videoInfo.title = response.filename || '未命名视频'
    videoInfo.description = ''
    videoInfo.videoUrl = response.videoUrl

    // 开始处理视频
    processVideo(response.videoId)
  } else {
    ElMessage.error('上传失败: ' + response.message)
  }
}

// 上传前检查
const beforeUpload = (file) => {
  const isVideo = file.type.indexOf('video/') !== -1
  if (!isVideo) {
    ElMessage.error('请上传视频文件!')
  }
  return isVideo
}

// 从链接获取视频
const fetchVideoFromLink = () => {
  if (!linkForm.url) {
    ElMessage.warning('请输入视频链接')
    return
  }

  processing.value = true
  processingProgress.value = 10

  // 调用API获取视频
  fetch('/api/fetch-video-from-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: linkForm.url })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        videoInfo.id = data.videoId
        videoInfo.title = data.title || '未命名视频'
        videoInfo.description = data.description || ''
        videoInfo.videoUrl = data.videoUrl

        // 开始处理视频
        processVideo(data.videoId)
      } else {
        ElMessage.error('获取视频失败: ' + data.message)
        processing.value = false
      }
    })
    .catch(err => {
      ElMessage.error('获取视频出错: ' + err.message)
      processing.value = false
    })
}

// 处理视频
const processVideo = (videoId) => {
  processing.value = true
  processingProgress.value = 30

  // 模拟API调用
  setTimeout(() => {
    processingProgress.value = 60

    // 模拟获取处理结果
    setTimeout(() => {
      processingProgress.value = 100
      processing.value = false
      processingComplete.value = true

      // 模拟字幕数据
      subtitles.value = [
        { start: 0, end: 3.5, text: '大家好，欢迎来到这个视频' },
        { start: 4, end: 7.2, text: '今天我们将讨论一个非常有趣的话题' },
        { start: 8, end: 12, text: '希望你们能够喜欢并从中学到知识' },
        // ... 更多字幕
      ]

      ElMessage.success('视频处理完成')
    }, 1500)
  }, 1500)
}

// 下载功能
const downloadOriginalVideo = () => {
  window.open(videoInfo.videoUrl, '_blank')
}

const downloadProcessedVideo = () => {
  window.open(videoInfo.processedVideoUrl || videoInfo.videoUrl, '_blank')
}

const downloadAudio = () => {
  window.open(videoInfo.audioUrl || '/api/download-audio/' + videoInfo.id, '_blank')
}

// 时间格式化
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

// 跳转到时间戳
const jumpToTimestamp = (time, index) => {
  if (videoPlayer.value) {
    videoPlayer.value.currentTime = time
    videoPlayer.value.play()
    currentSubtitleIndex.value = index
  }
}

// 编辑字幕
const editSubtitle = (index) => {
  const subtitle = subtitles.value[index]
  editingSubtitle.index = index
  editingSubtitle.start = subtitle.start
  editingSubtitle.end = subtitle.end
  editingSubtitle.text = subtitle.text
  editDialogVisible.value = true
}

// 保存字幕编辑
const saveSubtitleEdit = () => {
  if (editingSubtitle.index >= 0) {
    subtitles.value[editingSubtitle.index] = {
      start: parseFloat(editingSubtitle.start),
      end: parseFloat(editingSubtitle.end),
      text: editingSubtitle.text
    }
  }
  editDialogVisible.value = false
  ElMessage.success('字幕已更新')
}

// 删除字幕
const deleteSubtitle = (index) => {
  subtitles.value.splice(index, 1)
  ElMessage.success('字幕已删除')
}

// 导出字幕
const exportSubtitles = (format) => {
  ElMessage.success(`字幕已导出为${format.toUpperCase()}格式`)
  // 实际应用中这里会调用API进行导出
}

// 保存更改
const saveChanges = () => {
  fetch('/api/save-subtitles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoId: videoInfo.id,
      subtitles: subtitles.value
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        ElMessage.success('更改已保存')
      } else {
        ElMessage.error('保存失败: ' + data.message)
      }
    })
    .catch(err => {
      ElMessage.error('保存出错: ' + err.message)
    })
}
</script>

<style scoped>
/* 可以添加额外的样式 */
</style>
