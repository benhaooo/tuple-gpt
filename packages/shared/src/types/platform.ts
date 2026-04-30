import type { Component } from 'vue'
import type { MessageAttachment } from '@tuple-gpt/chat-core'

export interface PlatformConfig {
  /** 渲染在输入框左下角的操作按钮区域（如 tab 选择器） */
  InputActions?: Component
  /** 渲染在输入框上方的附件预览区域（如已选 tab 列表） */
  InputPreview?: Component
  /** 打开平台或插件配置页 */
  openSettings?: () => Promise<void> | void
  /** 发送前调用，收集平台特有的上下文（如提取 tab 内容） */
  prepareContext?: () => Promise<{
    context: string
    attachments: MessageAttachment[]
  } | null>
  /** 发送成功后调用，清理平台状态（如清空已选 tab） */
  clearAfterSend?: () => void
}
