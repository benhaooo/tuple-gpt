/**
 * 剪贴板操作 Composable
 * 提供现代剪贴板 API 的响应式封装
 */

import { ref, computed } from 'vue';
import { createLogger } from '@/utils/logger';
import { copyToClipboard, readFromClipboard } from '@/utils/commonUtils';
import type { UseClipboardReturn } from './types';

const logger = createLogger('UseClipboard');

/**
 * 剪贴板 Composable
 */
export function useClipboard(): UseClipboardReturn {
  // 状态
  const text = ref('');
  const isSupported = ref(false);

  // 检查浏览器支持
  const checkSupport = (): void => {
    isSupported.value = !!(navigator.clipboard || document.execCommand);
  };

  // 初始化检查
  checkSupport();

  /**
   * 复制文本到剪贴板
   */
  const copy = async (textToCopy: string): Promise<boolean> => {
    try {
      logger.debug('Copying text to clipboard', { length: textToCopy.length });

      const success = await copyToClipboard(textToCopy);
      
      if (success) {
        text.value = textToCopy;
        logger.info('Text copied to clipboard successfully');
        return true;
      } else {
        logger.warn('Failed to copy text to clipboard');
        return false;
      }

    } catch (error) {
      logger.error('Copy to clipboard error', error);
      return false;
    }
  };

  /**
   * 从剪贴板读取文本
   */
  const read = async (): Promise<string> => {
    try {
      logger.debug('Reading text from clipboard');

      const clipboardText = await readFromClipboard();
      text.value = clipboardText;
      
      logger.debug('Text read from clipboard', { length: clipboardText.length });
      return clipboardText;

    } catch (error) {
      logger.error('Read from clipboard error', error);
      return '';
    }
  };

  return {
    isSupported: computed(() => isSupported.value),
    text: computed(() => text.value),
    copy,
    read,
  };
}

/**
 * 剪贴板快捷操作 Composable
 */
export function useClipboardActions() {
  const clipboard = useClipboard();

  /**
   * 复制并显示成功消息
   */
  const copyWithToast = async (text: string, successMessage = '已复制到剪贴板'): Promise<boolean> => {
    const success = await clipboard.copy(text);
    
    if (success) {
      // 这里可以集成 toast 消息
      console.log(successMessage);
    }
    
    return success;
  };

  /**
   * 复制 JSON 数据
   */
  const copyJSON = async (data: any, pretty = true): Promise<boolean> => {
    try {
      const jsonString = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      return await clipboard.copy(jsonString);
    } catch (error) {
      logger.error('Copy JSON error', error);
      return false;
    }
  };

  /**
   * 复制代码块
   */
  const copyCode = async (code: string, language?: string): Promise<boolean> => {
    const formattedCode = language ? `\`\`\`${language}\n${code}\n\`\`\`` : code;
    return await clipboard.copy(formattedCode);
  };

  /**
   * 复制链接
   */
  const copyLink = async (url: string, title?: string): Promise<boolean> => {
    const linkText = title ? `[${title}](${url})` : url;
    return await clipboard.copy(linkText);
  };

  return {
    ...clipboard,
    copyWithToast,
    copyJSON,
    copyCode,
    copyLink,
  };
}
