import type { BuiltinTool } from './types'

export const currentTimeTool: BuiltinTool = {
  kind: 'auto',
  definition: {
    name: 'get_current_time',
    description: '获取当前日期和时间',
    parameters: { type: 'object', properties: {} },
  },
  handler: {
    execute: async () => ({ content: new Date().toISOString() }),
  },
}
