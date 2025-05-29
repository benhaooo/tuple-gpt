// API 基础 URL，根据实际情况修改
const API_BASE_URL = 'http://localhost:3000'; // 注意这里修改了基础URL，去掉了多余的/api

// 定义一些通用的响应和请求类型
interface ApiErrorResponse {
  success: false;
  code: string;
  message: string;
  data?: any;
}

// 根据 api.md 中的 Task 结构定义
interface Task {
  taskId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  sourceVideo?: {
    ossPath?: string;
    ossUrl?: string;
    originalUrl?: string;
    originalName?: string;
    videoInfo?: { title?: string; description?: string; [key: string]: any };
  };
  extracted?: {
    pureAudio?: {
      ossPath?: string;
      ossUrl?: string;
      originalExt?: string;
    };
    silentVideo?: {
      ossPath?: string;
      ossUrl?: string;
      originalExt?: string;
    };
  };
  subtitles?: {
    segments: {
      id: string | number;
      start: number;
      end: number;
      text: string;
      translatedText?: string;
      translatedAudioDuration?: number;
    }[];
    overall_duration?: number;
  };
  finalVideo?: {
    ossPath?: string;
    ossUrl?: string;
  };
}

// 1. 创建新任务 (POST /tasks) - 如果需要手动创建任务的场景
// (当前流程中，视频上传/下载会自动创建任务，但为完整性可以添加)
interface CreateTaskPayload {
  taskId?: string;
}
interface CreateTaskResponse {
  taskId: string;
  task: Task;
  isNew: boolean;
  message: string;
}
export const createTaskAPI = async (payload?: CreateTaskPayload): Promise<CreateTaskResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json();
  if (!response.ok || data.code) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 2. 上传视频文件的 action URL (供 el-upload 使用)
export const UPLOAD_VIDEO_URL = `${API_BASE_URL}/api/video/upload`;

// 3. 从链接下载视频 (POST /video/download-and-upload)
interface DownloadVideoPayload {
  videoUrl: string;
  taskId?: string; // 可选
}
interface DownloadVideoResponse {
  taskId: string;
  task: Task;
  message: string;
}
export const downloadVideoFromUrlAPI = async (payload: DownloadVideoPayload): Promise<DownloadVideoResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/video/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.taskId) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 4. 提取音频 (POST /audio/extract)
interface ExtractAudioPayload {
  taskId: string;
}
interface ExtractAudioResponse {
  taskId: string;
  task: Task;
  message: string;
}
export const extractAudioAPI = async (payload: ExtractAudioPayload): Promise<ExtractAudioResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/audio/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.taskId) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 5. 音频字幕识别 (POST /subtitles/recognize)
interface RecognizeSubtitlesPayload {
  taskId: string;
}
interface RecognizeSubtitlesResponse {
  taskId: string;
  task: Task;
  message: string;
}
export const recognizeSubtitlesAPI = async (payload: RecognizeSubtitlesPayload): Promise<RecognizeSubtitlesResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/subtitles/recognize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.taskId) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 6. 导出字幕 (GET /subtitles/export/{taskId}?format={format})
export const exportSubtitlesAPI = async (taskId: string, format: 'srt' | 'vtt'): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/subtitles/export/${taskId}?format=${format}`, {
    method: 'GET',
  });
  if (!response.ok) {
    let errorMessage = `Export failed with status: ${response.status}`;
    try {
      const errorData: ApiErrorResponse = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // 忽略响应体不是JSON的错误
    }
    throw new Error(errorMessage);
  }
  return response.blob();
};

// 7. 更新任务（例如保存字幕编辑） (PUT /tasks/{taskId})
// API 文档中未明确指出 PUT /tasks/{taskId} 可以用来更新字幕。
// 此函数基于推测，具体 payload 结构需要后端确认。
interface UpdateTaskPayload {
  recognizedSubtitles?: {
    segments: {
      id?: string | number;
      start: number;
      end: number;
      text: string;
      translatedText?: string;
    }[];
  };
  // 可以添加其他允许更新的字段
}
interface UpdateTaskResponse {
  task?: Task;
  message?: string;
}
export const updateTaskAPI = async (taskId: string, payload: UpdateTaskPayload): Promise<UpdateTaskResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 如果将来有获取任务详情的纯GET请求，可以添加：
// export const getTaskDetailsAPI = async (taskId: string): Promise<{task: Task, resourcePaths: any}> => { ... }

// 获取所有任务列表 (GET /tasks)
interface GetAllTasksResponse {
  tasks: Task[];
}
export const getAllTasksAPI = async (): Promise<GetAllTasksResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: 'GET',
  });
  const data = await response.json();
  if (!response.ok || !data.tasks) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 获取特定任务信息 (GET /tasks/{taskId})
interface GetTaskByIdResponse {
  task: Task;
  resourcePaths?: {
    sourceVideo?: string;
    sourceVideoUrl?: string;
    pureAudio?: string;
    pureAudioUrl?: string;
    silentVideo?: string;
    silentVideoUrl?: string;
    finalTranslatedVideo?: string;
    finalTranslatedVideoUrl?: string;
  };
}
export const getTaskByIdAPI = async (taskId: string): Promise<GetTaskByIdResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/task/${taskId}`, {
    method: 'GET',
  });
  const data = await response.json();
  if (!response.ok || !data.task) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 注意: el-upload 的 action 通常是字符串，它会自己处理请求。
// 我们这里为 el-upload 的 action 属性提供了一个常量 UPLOAD_VIDEO_URL。
// handleUploadSuccess 仍然在 .vue 文件中，因为它需要处理组件状态和 Element Plus 的回调参数。

// 新增：字幕翻译API
interface TranslateSubtitlesPayload {
  taskId: string;
}
interface TranslateSubtitlesResponse {
  taskId: string;
  task: Task;
  message: string;
}
export const translateSubtitlesAPI = async (payload: TranslateSubtitlesPayload): Promise<TranslateSubtitlesResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/subtitles/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.taskId) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 新增：字幕音频生成API
interface GenerateAudioPayload {
  taskId: string;
}
interface GenerateAudioResponse {
  taskId: string;
  task: Task;
  message: string;
}
export const generateAudioAPI = async (payload: GenerateAudioPayload): Promise<GenerateAudioResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/audio/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.taskId) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 新增：获取音色列表
interface Voice {
  id: string;
  name: string;
  gender: string;
  language: string;
  platform: string;
  subPlatform?: string;
}
interface GetVoicesResponse {
  success: boolean;
  data: Voice[];
}
export const getVoicesAPI = async (platform?: string, subPlatform?: string): Promise<GetVoicesResponse> => {
  let url = `${API_BASE_URL}/api/tts/voices`;
  const params = new URLSearchParams();
  if (platform) params.append('platform', platform);
  if (subPlatform) params.append('subPlatform', subPlatform);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || `HTTP error! status: ${response.status}`);
  }
  return data;
};

// 新增：生成语音
interface GenerateTtsPayload {
  text: string;
  voiceId: string;
  platform: string;
  subPlatform?: string;
  format?: string;
  speed?: number;
  volume?: number;
  pitch?: number;
}
export const generateTtsAPI = async (payload: GenerateTtsPayload): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/api/tts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    let errorMessage = `TTS generation failed with status: ${response.status}`;
    try {
      const errorData: ApiErrorResponse = await response.json();
      if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // 忽略响应体不是JSON的错误
    }
    throw new Error(errorMessage);
  }
  return response.blob();
}; 