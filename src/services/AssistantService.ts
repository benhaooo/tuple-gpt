import { useAssistantsStore } from '@/stores/modules/assistants';
import { useLlmStore } from '@/stores/modules/llm';
import { useMessagesStore } from '@/stores/modules/messages';
import { Assistant } from '@/types/assistant';
import { ElMessage } from 'element-plus';

/**
 * 助手服务类 - 封装助手相关的业务逻辑
 */
export class AssistantService {
  private assistantsStore = useAssistantsStore();
  private llmStore = useLlmStore();
  private messagesStore = useMessagesStore();

  /**
   * 获取所有助手列表
   */
  getAssistants(): Assistant[] {
    return this.assistantsStore.assistants;
  }

  /**
   * 根据ID获取助手
   */
  getAssistantById(id: string): Assistant | null {
    return this.assistantsStore.getAssistantById(id);
  }

  /**
   * 获取当前选中的助手
   */
  getCurrentAssistant(): Assistant | null {
    return this.assistantsStore.currentAssistant;
  }

  /**
   * 设置当前选中的助手
   */
  setCurrentAssistant(id: string | null): void {
    this.assistantsStore.setCurrentAssistant(id);
  }

  /**
   * 获取系统默认助手模型的配置
   */
  private getDefaultAssistantConfig(): Partial<Assistant> {
    const defaultAssistant = this.assistantsStore.getDefaultAssistantById('system-default');
    if (defaultAssistant) {
      return {
        prompt: defaultAssistant.prompt,
        model: defaultAssistant.model,
        settings: { ...defaultAssistant.settings },
        enableWebSearch: defaultAssistant.enableWebSearch,
        webSearchProviderId: defaultAssistant.webSearchProviderId
      };
    }
    
    // 如果没有找到系统默认助手，返回基础配置
    return {
      prompt: '你是一个有用、准确、诚实的AI助手。请根据用户的问题提供有帮助、清晰、准确的回答。',
      settings: {
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
        presence_penalty: 0,
        frequency_penalty: 0
      },
      enableWebSearch: false
    };
  }

  /**
   * 获取第一个可用的模型
   */
  private getFirstAvailableModel() {
    const enabledProviders = this.llmStore.providers.filter(p => p.enabled);
    for (const provider of enabledProviders) {
      if (provider.models && provider.models.length > 0) {
        return provider.models[0];
      }
    }
    return null;
  }

  /**
   * 创建新助手
   * 自动使用系统默认助手模型的配置作为初始设置
   */
  createNewAssistant(customConfig?: Partial<Assistant>): Assistant {
    try {
      // 获取系统默认助手配置
      const defaultConfig = this.getDefaultAssistantConfig();
      
      // 如果系统默认助手没有模型，尝试获取第一个可用模型
      let model = defaultConfig.model;
      if (!model) {
        model = this.getFirstAvailableModel();
      }

      // 构建新助手配置
      const assistantConfig: Omit<Assistant, 'id'> = {
        name: '新助手',
        emoji: '🤖',
        type: 'chat',
        tags: ['未分类'],
        description: '一个新创建的AI助手',
        // 使用系统默认配置
        ...defaultConfig,
        // 覆盖模型（如果有的话）
        model,
        // 应用用户自定义配置
        ...customConfig
      };

      const newAssistant = this.assistantsStore.createAssistant(assistantConfig);
      
      ElMessage.success(`助手 "${newAssistant.name}" 创建成功`);
      return newAssistant;
    } catch (error) {
      console.error('创建助手失败:', error);
      ElMessage.error('创建助手失败，请重试');
      throw error;
    }
  }

  /**
   * 更新助手配置
   */
  updateAssistant(id: string, updates: Partial<Assistant>): Assistant | null {
    try {
      const result = this.assistantsStore.updateAssistant(id, updates);
      if (result) {
        ElMessage.success('助手配置已更新');
      } else {
        ElMessage.error('更新失败：未找到指定助手');
      }
      return result;
    } catch (error) {
      console.error('更新助手失败:', error);
      ElMessage.error('更新助手失败，请重试');
      return null;
    }
  }

  /**
   * 删除助手
   */
  async deleteAssistant(id: string): Promise<boolean> {
    try {
      const assistant = this.getAssistantById(id);
      if (!assistant) {
        ElMessage.error('未找到指定助手');
        return false;
      }

      // 删除助手的所有消息
      this.messagesStore.deleteAssistantMessages(id);
      
      // 删除助手
      const success = this.assistantsStore.deleteAssistant(id);
      
      if (success) {
        ElMessage.success(`助手 "${assistant.name}" 已删除`);
      } else {
        ElMessage.error('删除助手失败');
      }
      
      return success;
    } catch (error) {
      console.error('删除助手失败:', error);
      ElMessage.error('删除助手失败，请重试');
      return false;
    }
  }

  /**
   * 复制助手
   */
  duplicateAssistant(id: string): Assistant | null {
    try {
      const original = this.getAssistantById(id);
      if (!original) {
        ElMessage.error('未找到要复制的助手');
        return null;
      }

      // 创建副本配置
      const copyConfig = { ...original };
      delete (copyConfig as any).id; // 移除ID，让store生成新的
      copyConfig.name = `${original.name} (副本)`;

      const newAssistant = this.assistantsStore.createAssistant(copyConfig);
      
      ElMessage.success(`助手 "${newAssistant.name}" 复制成功`);
      return newAssistant;
    } catch (error) {
      console.error('复制助手失败:', error);
      ElMessage.error('复制助手失败，请重试');
      return null;
    }
  }

  /**
   * 清空所有助手
   */
  async clearAllAssistants(): Promise<boolean> {
    try {
      // 获取所有助手ID
      const assistantIds = this.assistantsStore.assistants.map(a => a.id);
      
      if (assistantIds.length === 0) {
        ElMessage.info('没有助手需要清空');
        return true;
      }

      // 删除所有消息
      assistantIds.forEach(id => {
        this.messagesStore.deleteAssistantMessages(id);
      });
      
      // 删除所有助手
      assistantIds.forEach(id => {
        this.assistantsStore.deleteAssistant(id);
      });

      ElMessage.success(`已清空 ${assistantIds.length} 个助手及其对话记录`);
      return true;
    } catch (error) {
      console.error('清空助手失败:', error);
      ElMessage.error('清空助手失败，请重试');
      return false;
    }
  }

  /**
   * 搜索助手
   */
  searchAssistants(query: string): Assistant[] {
    if (!query.trim()) {
      return this.getAssistants();
    }
    
    const searchTerm = query.toLowerCase();
    return this.assistantsStore.assistants.filter(assistant => 
      assistant.name.toLowerCase().includes(searchTerm) || 
      assistant.description?.toLowerCase().includes(searchTerm) ||
      (assistant.tags && assistant.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
    );
  }

  /**
   * 获取助手的消息数量
   */
  getAssistantMessageCount(assistantId: string): number {
    return this.messagesStore.getMessagesByAssistantId(assistantId).length;
  }

  /**
   * 验证助手配置
   */
  validateAssistantConfig(config: Partial<Assistant>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.name !== undefined && !config.name.trim()) {
      errors.push('助手名称不能为空');
    }

    if (config.name !== undefined && config.name.length > 50) {
      errors.push('助手名称不能超过50个字符');
    }

    if (config.prompt !== undefined && config.prompt.length > 5000) {
      errors.push('系统提示词不能超过5000个字符');
    }

    if (config.settings?.temperature !== undefined) {
      const temp = config.settings.temperature;
      if (temp < 0 || temp > 2) {
        errors.push('温度参数必须在0-2之间');
      }
    }

    if (config.settings?.max_tokens !== undefined) {
      const maxTokens = config.settings.max_tokens;
      if (maxTokens < 1 || maxTokens > 8192) {
        errors.push('最大输出长度必须在1-8192之间');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// 创建单例实例
export const assistantService = new AssistantService();
