import { defineTool } from '@tuple-gpt/ai-core'

export const currentTimeTool = defineTool({
  name: 'get_current_time',
  description: '获取当前日期和时间',
  parameters: { type: 'object', properties: {} },
  execute: async () => ({ type: 'result', content: new Date().toISOString() }),
})
