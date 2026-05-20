import type { BuiltinTool } from './types'

export const askUserTool: BuiltinTool = {
  kind: 'interactive',
  definition: {
    name: 'ask_user',
    description: '向用户提问并等待回答，可提供选项供用户选择',
    parameters: {
      type: 'object',
      properties: {
        question: { type: 'string', description: '要问用户的问题' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: '可选项列表（可选；不提供则用户自由输入）',
        },
      },
      required: ['question'],
    },
  },
  component: 'ToolAskUser',
}
