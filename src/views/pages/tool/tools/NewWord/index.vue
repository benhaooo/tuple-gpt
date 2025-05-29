<template>
  <div class="flex h-screen bg-gray-100">
    <!-- 左侧视频处理区域 -->
    <div class="w-1/2 p-4 flex flex-col h-full overflow-y-auto">
      <div class="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 class="text-xl font-bold">{{ taskInProgress ? '当前任务处理中' : '视频输入' }}</h2>
        <el-button v-if="taskInProgress" type="primary" @click="startNewTaskWorkflow" size="small">
          <el-icon><refresh-left /></el-icon> 创建新任务
        </el-button>
      </div>

      <!-- 输入方式选择 -->
      <div v-if="!taskInProgress" class="flex-shrink-0">
        <el-tabs v-model="inputType" class="mb-4">
          <el-tab-pane label="上传视频" name="upload">
            <el-upload class="upload-demo" drag action="/api/video/upload" :on-success="handleUploadSuccess"
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
      </div>

      <!-- 新的滚动容器，包裹视频信息、操作和下载 -->
      <div v-if="videoInfo.id && taskInProgress" class="flex flex-col pr-2 mb-4 flex-shrink-0">
        <!-- 视频信息 -->
        <div class="bg-white p-4 rounded-lg shadow mb-4">
          <div class="text-xs text-gray-500 mb-2 text-right">ID: {{ videoInfo.id }}</div>
          <img v-if="videoInfo.coverUrl" :src="videoInfo.coverUrl" alt="视频封面" class="w-full rounded-md mb-3 max-h-48 object-cover"/>
          <div>
            <h3 class="text-lg font-semibold mb-1">{{ videoInfo.title || '无标题' }}</h3>
          </div>
          <div>
            <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ videoInfo.description || '无简介' }}</p>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div v-if="videoInfo.id" class="bg-white p-4 rounded-lg shadow mb-4">
          <h3 class="font-bold mb-2">处理操作</h3>
          <div class="flex flex-wrap gap-2">
            <el-button 
              type="primary" 
              @click="extractAudioHandler" 
              :disabled="!!videoInfo.audioUrl || processingAudio" 
              :loading="processingAudio">
              {{ videoInfo.audioUrl ? '音频已分离' : '分离音频' }}
            </el-button>
            <el-button 
              type="primary" 
              @click="recognizeSubtitlesHandler" 
              :disabled="!videoInfo.audioUrl || processingSubtitles || subtitles.length > 0" 
              :loading="processingSubtitles">
              {{ subtitles.length > 0 ? '字幕已生成' : '生成字幕' }}
            </el-button>
            <el-button 
              type="primary" 
              @click="translateSubtitlesHandler" 
              :disabled="!subtitles.length || subtitles.every(s => s.translatedText) || processingTranslatedSubtitles" 
              :loading="processingTranslatedSubtitles">
              {{ subtitles.every(s => s.translatedText) && subtitles.length > 0 ? '字幕已翻译' : '翻译字幕' }}
            </el-button>
            <el-button 
              type="primary" 
              @click="generateAudioHandler" 
              :loading="processingGeneratedAudio">
              {{ videoInfo.generatedAudioUrl ? '音频已生成' : '生成音频' }}
            </el-button>
          </div>
        </div>
        
        <!-- 处理结果下载 -->
        <div v-if="videoInfo.id" class="bg-white p-4 rounded-lg shadow">
          <h3 class="font-bold mb-2">下载资源</h3>
          <div class="flex flex-wrap gap-2">
            <el-button type="success" @click="downloadOriginalVideo" :disabled="!videoInfo.videoUrl">
              <el-icon><download /></el-icon> 下载原视频
            </el-button>
            <el-button type="success" @click="downloadProcessedVideo" :disabled="!videoInfo.processedVideoUrl && !videoInfo.videoUrl">
              <el-icon><download /></el-icon> 下载处理后视频
            </el-button>
            <el-button type="success" @click="downloadAudio" :disabled="!videoInfo.audioUrl">
              <el-icon><download /></el-icon> 下载音频
            </el-button>
            <el-button type="success" @click="downloadGeneratedAudio" :disabled="!videoInfo.generatedAudioUrl">
              <el-icon><download /></el-icon> 下载生成音频
            </el-button>
          </div>
          <el-progress v-if="processing" :percentage="processingProgress"
            :status="processingProgress === 100 ? 'success' : ''" class="mt-2" />
        </div>
      </div>
      
      <!-- 视频播放器 -->
      <div v-if="videoInfo.id" class="flex-grow bg-black rounded-lg overflow-hidden relative min-h-[200px]">
        <video ref="videoPlayer" class="w-full h-full" controls :src="videoInfo.videoUrl"></video>
      </div>

      <!-- 占位符：如果没有任何任务进行中，并且输入也隐藏了（理论上不应发生），或者任务完成了但没有视频播放器 -->
      <div v-if="!videoInfo.id && taskInProgress" class="flex-grow flex items-center justify-center text-gray-500">
        请先选择或上传一个视频任务。
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
            <div v-if="item.translatedText" class="mt-1 text-sm text-blue-600">翻译: {{ item.translatedText }}</div>
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
          <el-form-item label="翻译文本">
            <el-input type="textarea" v-model="editingSubtitle.translatedText" rows="3" />
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
          <div>
            <el-button type="primary" @click="exportSubtitles('srt')" :disabled="!subtitles.length">导出SRT</el-button>
            <el-button type="primary" @click="exportSubtitles('vtt')" :disabled="!subtitles.length">导出VTT</el-button>
          </div>
          <div>
            <el-button type="info" @click="showTaskListModal = true">
              <el-icon><tickets /></el-icon> 选择已有任务
            </el-button>
            <el-button type="success" @click="saveChanges" :disabled="!videoInfo.id">保存更改</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务列表弹窗 -->
    <TaskList v-model="showTaskListModal" @task-selected="loadTaskAndDisplay" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { UploadFilled, Download, Edit, Delete, Tickets, Loading as IconLoading, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  downloadVideoFromUrlAPI,
  extractAudioAPI,
  recognizeSubtitlesAPI,
  exportSubtitlesAPI,
  updateTaskAPI,
  getTaskByIdAPI,
  translateSubtitlesAPI,
  generateAudioAPI,
} from './api'
import TaskList from './TaskList.vue'

// API基础URL (不再需要，由 api.ts 管理)
// const baseUrl = 'http://localhost:3000' 

// 状态变量
const inputType = ref('upload')
const videoInfo = reactive({
  id: '',
  title: '',
  description: '',
  videoUrl: '',
  coverUrl: '',
  audioUrl: '',
  processedVideoUrl: '',
  generatedAudioUrl: '',
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
  text: '',
  translatedText: ''
})

// 新增状态
const processingAudio = ref(false)
const processingSubtitles = ref(false)
const processingTranslatedSubtitles = ref(false)
const processingGeneratedAudio = ref(false)
const showTaskListModal = ref(false)
const loadingTaskData = ref(false)
const taskInProgress = ref(false)

// 处理上传成功
const handleUploadSuccess = (response, uploadFile) => {
  if (response.taskId && response.task && response.task.sourceVideo) {
    videoInfo.id = response.taskId;
    videoInfo.title = response.task.sourceVideo.videoInfo?.title || response.task.sourceVideo.originalName || uploadFile.name || '未命名视频';
    videoInfo.description = response.task.sourceVideo.videoInfo?.description || '';
    videoInfo.videoUrl = response.task.sourceVideo.ossUrl;
    videoInfo.coverUrl = response.task.sourceVideo.videoInfo?.coverUrl || '';

    // 重置后续步骤状态
    resetTaskState();
    taskInProgress.value = true;

    ElMessage.success('视频上传成功。任务ID: ' + videoInfo.id);
  } else {
    ElMessage.error('上传失败: ' + (response.message || '响应格式不正确'));
  }
}

// 上传前检查
const beforeUpload = (file) => {
  const isVideo = file.type.indexOf('video/') !== -1
  if (!isVideo) {
    ElMessage.error('请上传视频文件!')
  }
  // Reset all states when a new file is chosen for upload
  resetFullState();
  return isVideo
}

// 从链接获取视频
const fetchVideoFromLink = async () => {
  if (!linkForm.url) {
    ElMessage.warning('请输入视频链接')
    return
  }
  processing.value = true
  processingProgress.value = 10

  try {
    const data = await downloadVideoFromUrlAPI({ videoUrl: linkForm.url });
      processing.value = false;
      if (data.taskId && data.task && data.task.sourceVideo) {
        videoInfo.id = data.taskId;
        videoInfo.title = data.task.sourceVideo.videoInfo?.title || data.task.sourceVideo.originalUrl?.split('/').pop() || '未命名视频';
        videoInfo.description = data.task.sourceVideo.videoInfo?.description || '';
        videoInfo.videoUrl = data.task.sourceVideo.ossUrl;
        videoInfo.coverUrl = data.task.sourceVideo.videoInfo?.coverUrl || '';

      resetTaskState();
      taskInProgress.value = true;
        ElMessage.success('视频信息获取成功。任务ID: ' + videoInfo.id);
      } else {
        ElMessage.error('获取视频失败: ' + (data.message || '响应格式不正确'));
      }
  } catch (err) {
      processing.value = false;
      ElMessage.error('获取视频出错: ' + err.message);
  }
}

// 重置与任务相关的状态 (音频、字幕等)
const resetTaskState = () => {
  videoInfo.audioUrl = '';
  videoInfo.processedVideoUrl = '';
  videoInfo.generatedAudioUrl = '';
  subtitles.value = [];
  currentSubtitleIndex.value = -1;
  processingComplete.value = false;
  processingAudio.value = false;
  processingSubtitles.value = false;
  processingTranslatedSubtitles.value = false;
  processingGeneratedAudio.value = false;
  if (videoPlayer.value) {
    videoPlayer.value.pause();
    videoPlayer.value.currentTime = 0;
    videoPlayer.value.src = videoInfo.videoUrl; // Re-assign src if needed, or ensure it updates reactively
  }
};

// 重置所有主要状态 (用于新上传或新链接)
const resetFullState = () => {
  videoInfo.id = '';
  videoInfo.title = '';
  videoInfo.description = '';
  videoInfo.videoUrl = '';
  videoInfo.coverUrl = '';
  linkForm.url = ''; // Clear link input if uploading
  resetTaskState();
};

// 提取音频处理函数
const extractAudioHandler = () => {
  if (!videoInfo.id) {
    ElMessage.warning('请先上传或指定视频任务ID');
    return;
  }
  processingAudio.value = true;
  extractAudioAPI({ taskId: videoInfo.id })
    .then(data => {
      if (data.taskId && data.task && data.task.extracted && data.task.extracted.pureAudio && data.task.extracted.pureAudio.ossUrl) {
        videoInfo.audioUrl = data.task.extracted.pureAudio.ossUrl;
        ElMessage.success('音频提取成功');
      } else {
        ElMessage.error('音频提取失败: ' + (data.message || '响应格式不正确或未返回音频路径'));
      }
    })
    .catch(err => {
      ElMessage.error('音频提取请求出错: ' + err.message);
    })
    .finally(() => {
      processingAudio.value = false;
    });
};

// 字幕识别处理函数
const recognizeSubtitlesHandler = () => {
  if (!videoInfo.id) {
    ElMessage.warning('请先处理视频以获取任务ID');
    return;
  }
  if (!videoInfo.audioUrl) {
    ElMessage.warning('请先提取音频');
    return;
  }
  processingSubtitles.value = true;
  recognizeSubtitlesAPI({ taskId: videoInfo.id })
    .then(data => {
      if (data.taskId && data.task && data.task.subtitles && Array.isArray(data.task.subtitles.segments)) {
        subtitles.value = data.task.subtitles.segments.map(seg => {
          return {
            id: seg.id,
            start: typeof seg.start === 'number' ? seg.start : parseTimeToSeconds(seg.start),
            end: typeof seg.end === 'number' ? seg.end : parseTimeToSeconds(seg.end),
            text: seg.text,
            translatedText: seg.translatedText || '' // 初始化时 translatedText 为空
          };
        });
        if (subtitles.value.length > 0) {
          ElMessage.success('字幕识别成功');
        } else {
          ElMessage.info('字幕识别完成，但未生成任何字幕内容。');
        }
      } else {
        ElMessage.error('字幕识别失败: ' + (data.message || '未返回有效字幕数据'));
      }
    })
    .catch(err => {
      ElMessage.error('字幕识别请求出错: ' + err.message);
    })
    .finally(() => {
      processingSubtitles.value = false;
    });
};

// 时间字符串转换为秒数 (00:00:01.500 -> 1.5)
const parseTimeToSeconds = (timeStr) => {
  if (typeof timeStr === 'number') return timeStr
  
  const parts = timeStr.split(':')
  const seconds = parts.length > 2 
    ? parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
    : parseInt(parts[0]) * 60 + parseFloat(parts[1])
  
  return seconds
}

// 将秒数转换为时间格式 (用于显示)
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

// 下载功能
const downloadOriginalVideo = () => {
  if (!videoInfo.videoUrl) {
    ElMessage.warning('没有可下载的原始视频');
    return;
  }
  window.open(videoInfo.videoUrl, '_blank')
}

const downloadProcessedVideo = () => {
  if (!videoInfo.processedVideoUrl && !videoInfo.videoUrl) {
     ElMessage.warning('没有可下载的处理后视频');
     return;
  }
  window.open(videoInfo.processedVideoUrl || videoInfo.videoUrl, '_blank')
}

const downloadAudio = () => {
  if (!videoInfo.audioUrl) {
    ElMessage.warning('没有可下载的音频文件');
    return;
  }
  window.open(videoInfo.audioUrl, '_blank')
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
  editingSubtitle.translatedText = subtitle.translatedText
  editDialogVisible.value = true
}

// 保存字幕编辑
const saveSubtitleEdit = () => {
  if (editingSubtitle.index >= 0) {
    subtitles.value[editingSubtitle.index] = {
      start: parseFloat(editingSubtitle.start),
      end: parseFloat(editingSubtitle.end),
      text: editingSubtitle.text,
      translatedText: editingSubtitle.translatedText
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
  if (!videoInfo.id) {
    ElMessage.warning('没有任务ID，无法导出字幕。');
    return;
  }
  exportSubtitlesAPI(videoInfo.id, format)
    .then(blob => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `subtitles.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      ElMessage.success(`字幕已导出为${format.toUpperCase()}格式`)
    })
    .catch(err => {
      ElMessage.error('导出失败: ' + err.message)
    })
}

// 保存更改
const saveChanges = () => {
  if (!videoInfo.id) {
    ElMessage.warning('没有有效的任务ID');
    return;
  }

  const apiSegments = subtitles.value.map((sub, index) => {
    return {
      id: sub.id || index,
      start: sub.start,
      end: sub.end,
      text: sub.text,
      translatedText: sub.translatedText || null
    }
  })
  
  updateTaskAPI(videoInfo.id, {
    recognizedSubtitles: {
      segments: apiSegments
    }
  })
  .then(response => {
    ElMessage.success('更改已保存成功！');
  })
  .catch(err => {
    ElMessage.error('保存更改失败: ' + err.message);
  });
}

// 新增：翻译字幕处理函数
const translateSubtitlesHandler = () => {
  if (!videoInfo.id) {
    ElMessage.warning('请先处理视频以获取任务ID');
    return;
  }
  if (!subtitles.value || subtitles.value.length === 0) {
    ElMessage.warning('请先生成字幕');
    return;
  }
  processingTranslatedSubtitles.value = true;
  translateSubtitlesAPI({ taskId: videoInfo.id })
    .then(data => {
      if (data.taskId && data.task && data.task.subtitles && Array.isArray(data.task.subtitles.segments)) {
        // 直接使用返回的带翻译的字幕数据
        subtitles.value = data.task.subtitles.segments.map(seg => {
          return {
            id: seg.id,
            start: typeof seg.start === 'number' ? seg.start : parseTimeToSeconds(seg.start),
            end: typeof seg.end === 'number' ? seg.end : parseTimeToSeconds(seg.end),
            text: seg.text,
            translatedText: seg.translatedText || ''
          };
        });
        ElMessage.success('字幕翻译成功');
      } else {
        ElMessage.error('字幕翻译失败: ' + (data.message || '未返回有效翻译数据'));
      }
    })
    .catch(err => {
      ElMessage.error('字幕翻译请求出错: ' + err.message);
    })
    .finally(() => {
      processingTranslatedSubtitles.value = false;
    });
};

// 新增：生成音频处理函数
const generateAudioHandler = () => {
  if (!videoInfo.id) {
    ElMessage.warning('请先处理视频以获取任务ID');
    return;
  }
  if (!subtitles.value.every(s => s.translatedText)) {
    ElMessage.warning('请先翻译所有字幕');
    return;
  }
  processingGeneratedAudio.value = true;
  generateAudioAPI({ taskId: videoInfo.id })
    .then(data => {
      if (data.taskId && data.task && data.task.finalVideo && data.task.finalVideo.ossUrl) {
        videoInfo.generatedAudioUrl = data.task.finalVideo.ossUrl;
        videoInfo.processedVideoUrl = data.task.finalVideo.ossUrl;
        ElMessage.success('音频生成成功');
      } else {
        ElMessage.error('音频生成失败: ' + (data.message || '未返回有效音频链接'));
      }
    })
    .catch(err => {
      ElMessage.error('音频生成请求出错: ' + err.message);
    })
    .finally(() => {
      processingGeneratedAudio.value = false;
    });
};

// 新增：下载生成音频功能
const downloadGeneratedAudio = () => {
  if (!videoInfo.generatedAudioUrl) {
    ElMessage.warning('没有可下载的生成音频');
    return;
  }
  window.open(videoInfo.generatedAudioUrl, '_blank');
};

// Added: Method to load selected task data
const loadTaskAndDisplay = async (taskId) => {
  if (!taskId) return;
  loadingTaskData.value = true;
  ElMessage.info({ message: `正在加载任务 ${taskId}...`, duration: 1500 });
  try {
    const response = await getTaskByIdAPI(taskId);
    if (response && response.task) {
      const taskData = response.task;
      
      resetFullState(); 

      videoInfo.id = taskData.taskId;
      videoInfo.title = taskData.sourceVideo?.videoInfo?.title || taskData.sourceVideo?.originalName || '未命名视频';
      videoInfo.description = taskData.sourceVideo?.videoInfo?.description || '';
      videoInfo.videoUrl = taskData.sourceVideo?.ossUrl || '';
      videoInfo.coverUrl = taskData.sourceVideo?.videoInfo?.coverUrl || '';
      videoInfo.audioUrl = taskData.extracted?.pureAudio?.ossUrl || '';
      videoInfo.generatedAudioUrl = taskData.finalVideo?.ossUrl || '';
      // Ensure processedVideoUrl is also updated if it comes from finalVideo
      if (taskData.finalVideo?.ossUrl) {
        videoInfo.processedVideoUrl = taskData.finalVideo.ossUrl;
      }

      if (taskData.subtitles && Array.isArray(taskData.subtitles.segments)) {
        subtitles.value = taskData.subtitles.segments.map(seg => ({
          id: seg.id,
          start: typeof seg.start === 'number' ? seg.start : parseTimeToSeconds(seg.start),
          end: typeof seg.end === 'number' ? seg.end : parseTimeToSeconds(seg.end),
          text: seg.text,
          translatedText: seg.translatedText || ''
        }));
      } else {
        subtitles.value = [];
      }
      
      currentSubtitleIndex.value = -1;
      processingComplete.value = taskData.status === 'completed';
      
      if (videoPlayer.value && videoInfo.videoUrl) {
        videoPlayer.value.src = videoInfo.videoUrl;
        videoPlayer.value.load();
      }

      if (videoInfo.id) {
        taskInProgress.value = true;
      } else {
        taskInProgress.value = false; // Fallback if ID wasn't set, though unlikely if task loaded
      }
      ElMessage.success(`任务 ${taskData.taskId} 已成功加载。`);
    } else {
      ElMessage.error('加载任务失败: 未找到任务数据或响应格式不正确。');
      taskInProgress.value = false;
    }
  } catch (error) {
    console.error('加载任务数据时出错:', error);
    ElMessage.error('加载任务数据时出错: ' + (error.message || '未知错误'));
    taskInProgress.value = false;
  } finally {
    loadingTaskData.value = false;
  }
};

// 新增：用于开始新任务流程的方法
const startNewTaskWorkflow = () => {
  ElMessageBox.confirm(
    '这将清除当前所有处理状态并开始一个新任务，确定吗?',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    resetFullState();
    taskInProgress.value = false;
    ElMessage.info('已重置，可以开始新任务。');
  }).catch(() => {
    ElMessage.info('操作已取消');
  });
};
</script>

<style scoped>
/* 可以添加额外的样式 */
.el-icon--upload { font-size: 60px; margin-bottom: 10px; }
.el-upload__tip { font-size: 12px; color: #909399; }
</style>
