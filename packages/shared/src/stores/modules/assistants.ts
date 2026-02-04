import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { Assistant, AssistantsSortType } from '@shared/types/assistant';

/**
 * 助手管理Store
 */
export const useAssistantsStore = defineStore('assistants', () => {
  // 状态
  const assistants = ref<Assistant[]>([]);
  const currentAssistantId = ref<string | null>(null);
  const sortType = ref<AssistantsSortType>('list');
  const status = ref<string>('idle');

  // 系统默认助手配置
  const defaultAssistants = ref<Assistant[]>([]);

  // Getters
  /**
   * 获取当前选中的助手
   */
  const currentAssistant = computed(() => {
    if (!currentAssistantId.value) return null;
    return assistants.value.find(assistant => assistant.id === currentAssistantId.value) || null;
  });

  /**
   * 按标签分组的助手列表
   */
  const assistantsByTags = computed(() => {
    const result: Record<string, Assistant[]> = { '未分类': [] };
    
    assistants.value.forEach(assistant => {
      if (!assistant.tags || assistant.tags.length === 0) {
        result['未分类'].push(assistant);
      } else {
        assistant.tags.forEach(tag => {
          if (!result[tag]) {
            result[tag] = [];
          }
          result[tag].push(assistant);
        });
      }
    });
    
    return result;
  });

  // Actions
  /**
   * 创建新助手
   * @param assistant 助手信息，不包含id
   * @returns 创建的助手对象
   */
  function createAssistant(assistant: Omit<Assistant, 'id'>): Assistant {
    const newAssistant = {
      id: uuidv4(),
      ...assistant
    } as Assistant;

    // 将新助手插入到数组开头，使其显示在列表顶部
    assistants.value.unshift(newAssistant);

    return newAssistant;
  }

  /**
   * 更新助手信息
   * @param id 助手ID
   * @param updates 要更新的字段
   * @returns 更新后的助手对象，如果未找到则返回null
   */
  function updateAssistant(id: string, updates: Partial<Assistant>): Assistant | null {
    const index = assistants.value.findIndex(assistant => assistant.id === id);
    if (index === -1) return null;
    
    const updatedAssistant = { ...assistants.value[index], ...updates };
    assistants.value[index] = updatedAssistant;
    
    return updatedAssistant;
  }

  /**
   * 删除助手
   * @param id 助手ID
   * @returns 是否删除成功
   */
  function deleteAssistant(id: string): boolean {
    const index = assistants.value.findIndex(assistant => assistant.id === id);
    if (index === -1) return false;
    
    assistants.value.splice(index, 1);
    
    // 如果删除的是当前选中的助手，清除当前选中状态
    if (currentAssistantId.value === id) {
      currentAssistantId.value = assistants.value.length > 0 ? assistants.value[0].id : null;
    }
    
    return true;
  }

  /**
   * 设置当前选中的助手
   * @param id 助手ID
   */
  function setCurrentAssistant(id: string | null): void {
    currentAssistantId.value = id;
  }

  /**
   * 设置排序方式
   * @param type 排序类型
   */
  function setSortType(type: AssistantsSortType): void {
    sortType.value = type;
  }

  /**
   * 设置状态
   * @param newStatus 新状态
   */
  function setStatus(newStatus: string): void {
    status.value = newStatus;
  }

  /**
   * 根据ID查找助手
   * @param id 助手ID
   * @returns 找到的助手对象，如果未找到则返回null
   */
  function getAssistantById(id: string): Assistant | null {
    return assistants.value.find(assistant => assistant.id === id) || null;
  }

  /**
   * 初始化系统功能模型
   */
  function initializeDefaultAssistants(): void {
    if (defaultAssistants.value.length === 0) {
      defaultAssistants.value = [
        {
          id: 'system-default',
          name: '默认助手模型',
          emoji: '🤖',
          description: '系统主要的对话助手，用于常规对话和用户交互',
          prompt: '你是一个有用、准确、诚实的AI助手。请根据用户的问题提供有帮助、清晰、准确的回答。保持友好和专业的语调，确保回答的质量和相关性。',
          type: 'chat',
          tags: ['系统', '默认', '对话'],
          enableWebSearch: false,
          settings: {
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 0.9,
            presence_penalty: 0,
            frequency_penalty: 0
          }
        },
        {
          id: 'system-naming',
          name: '话题命名模型',
          emoji: '🏷️',
          description: '专门用于为对话生成合适标题和名称的系统模型',
          prompt: '你是一个专门用于生成对话标题的AI助手。请根据对话内容生成简洁、准确、有意义的标题。标题应该：1）简洁明了，通常不超过10个字；2）准确概括对话的主要内容或主题；3）使用中文；4）避免使用标点符号；5）直接输出标题，不需要额外说明。',
          type: 'naming',
          tags: ['系统', '命名', '标题'],
          enableWebSearch: false,
          settings: {
            temperature: 0.3,
            max_tokens: 50,
            top_p: 0.8,
            presence_penalty: 0,
            frequency_penalty: 0.2
          }
        },
        {
          id: 'system-translation',
          name: '翻译模型',
          emoji: '🌐',
          description: '专门用于多语言翻译任务的系统模型',
          prompt: '你是一个专业的翻译助手。请提供准确、自然、流畅的翻译服务。翻译时请注意：1）保持原文的语气和风格；2）确保翻译的准确性和地道性；3）对于专业术语，提供准确的对应翻译；4）如果遇到歧义，选择最符合上下文的翻译；5）保持格式和结构的一致性。',
          type: 'translation',
          tags: ['系统', '翻译', '多语言'],
          enableWebSearch: false,
          settings: {
            temperature: 0.2,
            max_tokens: 2048,
            top_p: 0.8,
            presence_penalty: 0,
            frequency_penalty: 0
          }
        },
        {
          id: 'system-thinking',
          name: '思考模型',
          emoji: '🧠',
          description: '用于复杂推理和思考过程展示的系统模型',
          prompt: '你是一个专门用于展示思考过程的AI助手。在回答复杂问题时，请详细展示你的思考步骤和推理过程。请：1）将复杂问题分解为更小的部分；2）逐步分析每个部分；3）展示推理的逻辑链条；4）考虑多个角度和可能性；5）最后给出综合的结论。使用清晰的结构来组织思考过程。',
          type: 'thinking',
          tags: ['系统', '思考', '推理'],
          enableWebSearch: false,
          settings: {
            temperature: 0.4,
            max_tokens: 4000,
            top_p: 0.9,
            presence_penalty: 0.1,
            frequency_penalty: 0
          }
        }
      ];
    }
  }

  /**
   * 更新系统默认助手
   * @param id 助手ID
   * @param updates 要更新的字段
   * @returns 更新后的助手对象，如果未找到则返回null
   */
  function updateDefaultAssistant(id: string, updates: Partial<Assistant>): Assistant | null {
    const index = defaultAssistants.value.findIndex(assistant => assistant.id === id);
    if (index === -1) return null;

    const updatedAssistant = { ...defaultAssistants.value[index], ...updates };
    defaultAssistants.value[index] = updatedAssistant;

    return updatedAssistant;
  }

  /**
   * 根据ID查找系统默认助手
   * @param id 助手ID
   * @returns 找到的助手对象，如果未找到则返回null
   */
  function getDefaultAssistantById(id: string): Assistant | null {
    return defaultAssistants.value.find(assistant => assistant.id === id) || null;
  }

  // 初始化默认助手
  initializeDefaultAssistants();

  return {
    // 状态
    assistants,
    currentAssistantId,
    sortType,
    status,
    defaultAssistants,

    // Getters
    currentAssistant,
    assistantsByTags,

    // Actions
    createAssistant,
    updateAssistant,
    deleteAssistant,
    setCurrentAssistant,
    setSortType,
    setStatus,
    getAssistantById,

    // 默认助手相关
    initializeDefaultAssistants,
    updateDefaultAssistant,
    getDefaultAssistantById
  };
});