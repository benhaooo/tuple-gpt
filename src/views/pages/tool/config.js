import AudioRecognition from './AudioRecognition.vue'

export default [
  {
    name: '音频识别',
    description: '使用 OpenAI Whisper API 将音频文件转换为文字',
    icon: '🎵',
    component: AudioRecognition,
    category: 'AI工具',
    tags: ['音频', '语音识别', 'Whisper', 'AI']
  }
  // 可以在此处添加更多工具配置
];