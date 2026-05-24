import type { Tool } from '@tuple-gpt/ai-core'
import { askUserTool } from './ask-user'
import { currentTimeTool } from './current-time'

export const builtinTools: Tool[] = [currentTimeTool, askUserTool]

export { askUserTool, currentTimeTool }
