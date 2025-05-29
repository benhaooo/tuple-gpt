# API文档

## 基本信息

- 基础URL: `http://localhost:3000` (可根据实际PORT值调整)
- 所有请求和响应均采用JSON格式（除非特别说明）
- 所有POST请求的Content-Type为`application/json`（除上传文件外）

## 视频翻译API

### 1. 下载远程视频

**端点**: `POST /api/video/download`

**描述**: 从URL下载视频并保存到系统中

**请求参数**:
```json
{
  "videoUrl": "视频URL地址",
  "taskId": "可选，自定义任务ID"
}
```

**响应**:
```json
{
  "taskId": "任务ID",
  "task": {
    "taskId": "任务ID",
    "status": "video_uploaded",
    "createdAt": "创建时间",
    "updatedAt": "更新时间",
    "sourceVideo": {
      "ossPath": "OSS存储路径",
      "ossUrl": "OSS访问URL",
      "originalUrl": "原始视频URL",
      "videoInfo": "视频信息对象"
    }
  },
  "message": "视频已成功下载并上传到OSS"
}
```

### 2. 上传视频文件

**端点**: `POST /api/video/upload`

**描述**: 上传本地视频文件

**请求参数**:
- `file`: 要上传的视频文件 (multipart/form-data)
- `taskId`: 可选，自定义任务ID (multipart/form-data)

**支持的视频格式**: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.mkv`, `.webm`

**文件大小限制**: 100MB

**响应**:
```json
{
  "taskId": "任务ID",
  "task": {
    "taskId": "任务ID",
    "status": "video_uploaded",
    "createdAt": "创建时间",
    "updatedAt": "更新时间", 
    "sourceVideo": {
      "ossPath": "OSS存储路径",
      "ossUrl": "OSS访问URL",
      "originalName": "原始文件名",
      "videoInfo": "视频信息对象"
    }
  },
  "message": "视频已成功上传到OSS"
}
```

### 3. 提取视频音频

**端点**: `POST /api/audio/extract`

**描述**: 从已上传视频中提取音频

**请求参数**:
```json
{
  "taskId": "任务ID"
}
```

**前置条件**: 任务状态必须为`video_uploaded`

**响应**:
```json
{
  "taskId": "任务ID",
  "task": {
    "taskId": "任务ID",
    "status": "audio_extracted",
    "extracted": {
      "pureAudio": {
        "ossPath": "纯音频OSS路径",
        "ossUrl": "纯音频OSS访问URL",
        "originalExt": "音频文件扩展名"
      },
      "silentVideo": {
        "ossPath": "无声视频OSS路径", 
        "ossUrl": "无声视频OSS访问URL",
        "originalExt": "视频文件扩展名"
      }
    }
  },
  "message": "纯音频和无声视频提取并上传成功"
}
```

### 4. 音频字幕识别

**端点**: `POST /api/subtitles/recognize`

**描述**: 识别音频内容并生成字幕

**请求参数**:
```json
{
  "taskId": "任务ID"
}
```

**前置条件**: 任务状态必须为`audio_extracted`

**响应**:
```json
{
  "taskId": "任务ID",
  "task": {
    "taskId": "任务ID",
    "status": "subtitles_recognized",
    "subtitles": {
      "segments": [
        {
          "id": "片段ID",
          "start": 开始时间(秒),
          "end": 结束时间(秒),
          "text": "识别出的文本内容"
        },
        //...更多片段
      ],
      "overall_duration": 总时长(秒)
    }
  },
  "message": "音频字幕识别成功"
}
```

### 5. 字幕翻译

**端点**: `POST /api/subtitles/translate`

**描述**: 翻译已识别的字幕

**请求参数**:
```json
{
  "taskId": "任务ID"
}
```

**前置条件**: 任务已包含有效的字幕数据

**响应**:
```json
{
  "taskId": "任务ID",
  "task": {
    "taskId": "任务ID",
    "status": "subtitles_translated",
    "subtitles": {
      "segments": [
        {
          "id": "片段ID",
          "start": 开始时间(秒),
          "end": 结束时间(秒),
          "text": "原始文本内容",
          "translatedText": "翻译后的文本内容"
        },
        //...更多片段
      ],
      "overall_duration": 总时长(秒)
    }
  },
  "message": "字幕翻译成功"
}
```

### 6. 生成字幕音频并合成视频

**端点**: `POST /api/audio/generate`

**描述**: 根据翻译后的字幕生成语音，并与无声视频合成最终视频

**请求参数**:
```json
{
  "taskId": "任务ID"
}
```

**前置条件**: 任务必须包含已翻译的字幕数据

**响应**:
```json
{
  "taskId": "任务ID",
  "task": {
    "taskId": "任务ID",
    "status": "translation_completed",
    "subtitles": {
      "segments": [
        {
          "id": "片段ID",
          "start": 开始时间(秒),
          "end": 结束时间(秒),
          "text": "原始文本内容",
          "translatedText": "翻译后的文本内容",
          "translatedAudioDuration": 翻译音频时长(秒)
        },
        //...更多片段
      ]
    },
    "finalVideo": {
      "ossPath": "最终视频OSS路径",
      "ossUrl": "最终视频OSS访问URL"
    }
  },
  "message": "字幕音频生成、视频变速及最终合并成功。最终视频已生成。"
}
```

### 7. 获取单个任务信息

**端点**: `GET /api/task/:taskId`

**描述**: 获取指定任务的详细信息

**URL参数**:
- `taskId`: 任务ID

**响应**:
```json
{
  "task": {
    "taskId": "任务ID",
    "status": "任务状态",
    "createdAt": "创建时间",
    "updatedAt": "更新时间",
    "sourceVideo": {/*源视频信息*/},
    "extracted": {/*提取的音频和无声视频信息*/},
    "subtitles": {/*字幕信息*/},
    "finalVideo": {/*最终视频信息*/}
  },
  "resourcePaths": {
    "sourceVideo": "源视频OSS路径",
    "sourceVideoUrl": "源视频OSS访问URL",
    "pureAudio": "纯音频OSS路径",
    "pureAudioUrl": "纯音频OSS访问URL",
    "silentVideo": "无声视频OSS路径",
    "silentVideoUrl": "无声视频OSS访问URL",
    "finalTranslatedVideo": "最终视频OSS路径",
    "finalTranslatedVideoUrl": "最终视频OSS访问URL"
  }
}
```

### 8. 获取所有任务列表

**端点**: `GET /api/tasks`

**描述**: 获取所有任务的列表

**响应**:
```json
{
  "tasks": [
    {
      "taskId": "任务ID1",
      "status": "任务状态",
      "createdAt": "创建时间",
      "updatedAt": "更新时间",
      //...其他任务相关信息
    },
    //...更多任务
  ]
}
```

## TTS (文本转语音) API

### 1. 获取音色列表

**端点**: `GET /api/tts/voices`

**描述**: 获取支持的TTS音色列表

**查询参数**:
- `platform`: 可选，TTS平台 (volcano, 302)
- `subPlatform`: 可选，302平台下的子平台

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "音色ID",
      "name": "音色名称",
      "gender": "性别",
      "language": "语言",
      "platform": "平台名称",
      "subPlatform": "子平台名称(适用于302)"
    },
    //...更多音色
  ]
}
```

### 2. 生成语音

**端点**: `POST /api/tts/generate`

**描述**: 根据文本生成语音

**请求参数**:
```json
{
  "text": "要转换的文本内容",
  "voiceId": "音色ID",
  "platform": "平台名称(volcano或302)",
  "subPlatform": "子平台名称(当platform为302时必须)",
  "format": "可选，输出格式",
  "speed": "可选，语速",
  "volume": "可选，音量",
  "pitch": "可选，音调"
}
```

**响应**: 
- 直接返回音频流，Content-Type为audio/mpeg
- 错误时返回JSON格式错误信息

## 任务状态说明

任务在处理过程中会经历以下状态:

- `created`: 任务初始创建状态
- `video_uploaded`: 视频已上传
- `audio_extracted`: 音频已提取
- `subtitles_recognized`: 字幕已识别
- `subtitles_translated`: 字幕已翻译
- `audio_generated`: 翻译音频已生成
- `translation_completed`: 视频翻译完成
- `completed`: 任务全部完成
- `failed`: 任务失败

## 错误处理

所有API在发生错误时将返回对应的HTTP状态码和错误信息:

```json
{
  "success": false,
  "code": "错误代码",
  "message": "错误描述",
  "data": {
    // 可能包含的详细错误信息
  }
}
```

常见HTTP状态码:
- 400: 请求参数错误
- 404: 资源不存在
- 500: 服务器内部错误
- 502: 第三方服务错误

## 工作流程示例

1. 上传视频文件或提供视频URL获取`taskId`
2. 使用`taskId`调用提取音频API
3. 使用`taskId`调用识别字幕API
4. 使用`taskId`调用翻译字幕API
5. 使用`taskId`调用生成语音并合成视频API
6. 使用`taskId`获取最终视频URL
