import type { ToolDefinition } from '@tuple-gpt/ai-core'
import { askUserTool } from './ask-user'
import { currentTimeTool } from './current-time'
import type { BuiltinTool } from './types'
import { DefaultToolRunner } from '../tool-runner'

export type { AutoTool, BuiltinTool, InteractiveTool } from './types'

export const builtinTools: BuiltinTool[] = [currentTimeTool, askUserTool]

export const builtinDefinitions: ToolDefinition[] = builtinTools.map(t => t.definition)

/**
 * Register every builtin tool onto the given runner. AutoTools become
 * handlers, InteractiveTools become UI hints. The auto/interactive split
 * is consumed exactly once: here.
 */
export function registerBuiltinTools(runner: DefaultToolRunner): DefaultToolRunner {
  for (const tool of builtinTools) {
    if (tool.kind === 'auto') {
      runner.registerHandler(tool.definition.name, tool.handler)
    } else {
      runner.registerInteractive(tool.definition.name, tool.component)
    }
  }
  return runner
}
