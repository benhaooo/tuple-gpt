import type { ToolDefinition } from '../../types'
import type { PipelineStep } from '../pipeline'

/**
 * Injects tool definitions into the pipeline output.
 * Replaces any existing tools.
 */
export function injectTools(tools: ToolDefinition[]): PipelineStep {
  return (input) => ({ ...input, tools })
}
