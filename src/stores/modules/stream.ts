/**
 * 流式响应处理 Store
 * 负责处理流式和非流式的 API 响应
 */

import { defineStore } from 'pinia';
import { delay } from '@/utils/commonUtils';
import { createLogger } from '@/utils/logger';
import useStream from '@/hooks/stream';
import { useMessageStore } from './message';
import type {
  MultiContent,
  StreamOptions
} from '../types/chat';

const logger = createLogger('StreamStore');

export const useStreamStore = defineStore('stream', {
  state: () => ({
    activeStreams: new Map<string, any>(),
    streamMetrics: new Map<string, {
      startTime: number;
      bytesReceived: number;
      chunksReceived: number;
    }>(),
  }),

  getters: {
    /**
     * 获取活跃流的数量
     */
    activeStreamCount: (state): number => {
      return state.activeStreams.size;
    },

    /**
     * 检查是否有活跃的流
     */
    hasActiveStreams: (state): boolean => {
      return state.activeStreams.size > 0;
    },

    /**
     * 获取流指标
     */
    getStreamMetrics: (state) => (streamId: string) => {
      return state.streamMetrics.get(streamId);
    },
  },

  actions: {
    /**
     * 处理非流式响应
     */
    async handleNonStreamResponse(
      response: Response, 
      content: MultiContent,
      sessionId: string
    ): Promise<void> {
      const messageStore = useMessageStore();
      
      try {
        logger.debug('Processing non-stream response', { 
          sessionId, 
          contentId: content.id 
        });

        const result = await response.json();
        const messageContent = result.choices?.[0]?.message?.content || '';
        
        // 更新内容
        content.content = messageContent;
        content.usage = result.usage;
        
        // 清理状态
        delete content.chatting;
        
        logger.info('Non-stream response processed', { 
          sessionId, 
          contentId: content.id,
          contentLength: messageContent.length 
        });

      } catch (error) {
        logger.error('Failed to process non-stream response', error, { 
          sessionId, 
          contentId: content.id 
        });
        
        content.content = `处理响应时发生错误：${error.message}`;
        delete content.chatting;
      }
    },

    /**
     * 处理流式响应
     */
    async handleStreamResponse(
      response: Response,
      content: MultiContent,
      sessionId: string,
      options: StreamOptions = {}
    ): Promise<void> {
      const streamId = `${sessionId}-${content.id}`;
      const messageStore = useMessageStore();
      
      return new Promise<void>((resolve, reject) => {
        try {
          logger.debug('Starting stream processing', { 
            sessionId, 
            contentId: content.id,
            streamId,
            options 
          });

          // 记录流开始时间
          this.streamMetrics.set(streamId, {
            startTime: Date.now(),
            bytesReceived: 0,
            chunksReceived: 0,
          });

          const { streamController } = useStream();
          
          const controller = streamController(
            response,
            (contentChunk: string, reasoningChunk?: string, usage?: any) => {
              this.handleStreamChunk(
                streamId, 
                content, 
                contentChunk, 
                reasoningChunk, 
                usage, 
                options
              );
            },
            async () => {
              await this.handleStreamEnd(streamId, content, resolve);
            },
            (error: Error) => {
              this.handleStreamError(streamId, content, error, reject);
            }
          );

          // 保存控制器
          this.activeStreams.set(streamId, controller);
          content.chatting = controller;
          messageStore.setStreamController(content.id, controller);

        } catch (error) {
          logger.error('Failed to start stream processing', error, { 
            sessionId, 
            contentId: content.id 
          });
          reject(error);
        }
      });
    },

    /**
     * 处理流数据块
     */
    handleStreamChunk(
      streamId: string,
      content: MultiContent,
      contentChunk: string,
      reasoningChunk?: string,
      usage?: any,
      options: StreamOptions = {}
    ): void {
      // 更新流指标
      const metrics = this.streamMetrics.get(streamId);
      if (metrics) {
        metrics.bytesReceived += contentChunk.length + (reasoningChunk?.length || 0);
        metrics.chunksReceived += 1;
      }

      // 更新内容
      if (reasoningChunk) {
        content.reasoning_content = (content.reasoning_content || '') + reasoningChunk;
      }
      
      if (contentChunk && !options.onlyThink) {
        content.content += contentChunk;
      }
      
      if (usage) {
        content.usage = usage;
      }

      logger.debug('Stream chunk processed', { 
        streamId,
        contentChunkLength: contentChunk.length,
        reasoningChunkLength: reasoningChunk?.length || 0,
        totalChunks: metrics?.chunksReceived || 0
      });
    },

    /**
     * 处理流结束
     */
    async handleStreamEnd(
      streamId: string,
      content: MultiContent,
      resolve: () => void
    ): Promise<void> {
      try {
        // 计算流指标
        const metrics = this.streamMetrics.get(streamId);
        const duration = metrics ? Date.now() - metrics.startTime : 0;
        
        logger.info('Stream processing completed', { 
          streamId,
          duration,
          bytesReceived: metrics?.bytesReceived || 0,
          chunksReceived: metrics?.chunksReceived || 0
        });

        // 清理状态
        delete content.chatting;
        this.activeStreams.delete(streamId);
        this.streamMetrics.delete(streamId);

        // 延迟一下再 resolve，确保 UI 更新
        await delay(800);
        resolve();

      } catch (error) {
        logger.error('Error during stream end handling', error, { streamId });
        resolve(); // 即使出错也要 resolve，避免阻塞
      }
    },

    /**
     * 处理流错误
     */
    handleStreamError(
      streamId: string,
      content: MultiContent,
      error: Error,
      reject: (error: Error) => void
    ): void {
      logger.error('Stream processing error', error, { streamId });

      // 更新内容显示错误
      content.content = `流处理时发生错误：${error.message}`;
      
      // 清理状态
      delete content.chatting;
      this.activeStreams.delete(streamId);
      this.streamMetrics.delete(streamId);

      reject(error);
    },

    /**
     * 停止指定流
     */
    stopStream(streamId: string): boolean {
      const controller = this.activeStreams.get(streamId);
      
      if (controller && typeof controller.abort === 'function') {
        try {
          controller.abort();
          this.activeStreams.delete(streamId);
          this.streamMetrics.delete(streamId);
          
          logger.info('Stream stopped', { streamId });
          return true;
        } catch (error) {
          logger.error('Failed to stop stream', error, { streamId });
        }
      }
      
      return false;
    },

    /**
     * 停止所有流
     */
    stopAllStreams(): number {
      let stoppedCount = 0;
      
      for (const [streamId, controller] of this.activeStreams.entries()) {
        if (this.stopStream(streamId)) {
          stoppedCount++;
        }
      }
      
      logger.info('All streams stopped', { stoppedCount });
      return stoppedCount;
    },

    /**
     * 清理流状态
     */
    cleanupStreamState(): void {
      this.activeStreams.clear();
      this.streamMetrics.clear();
      logger.info('Stream state cleaned up');
    },

    /**
     * 获取流统计信息
     */
    getStreamStats() {
      const activeCount = this.activeStreams.size;
      const totalBytesReceived = Array.from(this.streamMetrics.values())
        .reduce((sum, metrics) => sum + metrics.bytesReceived, 0);
      const totalChunksReceived = Array.from(this.streamMetrics.values())
        .reduce((sum, metrics) => sum + metrics.chunksReceived, 0);
      
      return {
        activeStreams: activeCount,
        totalBytesReceived,
        totalChunksReceived,
        averageBytesPerChunk: totalChunksReceived > 0 
          ? totalBytesReceived / totalChunksReceived 
          : 0,
      };
    },

    /**
     * 检查流是否活跃
     */
    isStreamActive(streamId: string): boolean {
      return this.activeStreams.has(streamId);
    },

    /**
     * 获取活跃流列表
     */
    getActiveStreamIds(): string[] {
      return Array.from(this.activeStreams.keys());
    },
  },
});

export default useStreamStore;
