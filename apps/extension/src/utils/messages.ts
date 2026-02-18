/**
 * 消息类型常量
 */
export enum MessageType {
  // 导航事件
  NAVIGATION_CHANGED = 'NAVIGATION_CHANGED',
  // 字幕操作
  INITIALIZE_SUBTITLES = 'INITIALIZE_SUBTITLES',
  // 音频转录相关
  TRANSCRIBE_BILIBILI_AUDIO = 'TRANSCRIBE_BILIBILI_AUDIO',
  AUDIO_TRANSCRIPTION_COMPLETE = 'AUDIO_TRANSCRIPTION_COMPLETE',
  AUDIO_TRANSCRIPTION_ERROR = 'AUDIO_TRANSCRIPTION_ERROR',
}

/**
 * 消息接口
 */
export interface Message {
  type: MessageType;
  data?: any;
}

/**
 * 转录Bilibili音频消息
 */
export interface TranscribeBilibiliAudioMessage extends Message {
  type: MessageType.TRANSCRIBE_BILIBILI_AUDIO;
  data: {
    whisperApiKey: string;
    whisperApiEndpoint?: string;
  };
}

/**
 * 音频转录完成消息
 */
export interface AudioTranscriptionCompleteMessage extends Message {
  type: MessageType.AUDIO_TRANSCRIPTION_COMPLETE;
  data: {
    transcriptionResult: any;
    subtitles: any[];
  };
}

/**
 * 音频转录错误消息
 */
export interface AudioTranscriptionErrorMessage extends Message {
  type: MessageType.AUDIO_TRANSCRIPTION_ERROR;
  data: {
    error: string;
  };
}

/**
 * 发送消息到当前内容脚本
 * @param message 消息对象
 */
export function sendMessageToContentScript(message: Message): Promise<any> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          resolve(response);
        });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * 发送消息到指定标签页
 * @param tabId 标签页ID
 * @param message 消息对象
 */
export function sendMessageToTab(tabId: number, message: Message): Promise<any> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      resolve(response);
    });
  });
}

/**
 * 发送消息到背景脚本
 * @param message 消息对象
 */
export function sendMessageToBackground(message: Message): Promise<any> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      resolve(response);
    });
  });
}

/**
 * 注册消息监听器
 * @param callback 消息处理回调
 */
export function registerMessageListener(callback: (message: Message, sender: chrome.runtime.MessageSender) => void): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    callback(message, sender);
    sendResponse({ received: true });
    return true; // 保持消息通道开放
  });
} 