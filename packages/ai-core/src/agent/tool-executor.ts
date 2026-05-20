import type { ToolHandler, ToolExecutionContext, ToolHandlerResult } from '../types'

export type ToolExecutor = {
  [name: string]: ToolHandler
}

export interface ExecuteToolCallResult {
  result: string
  isError: boolean
}

export async function executeToolCall(
  executor: ToolExecutor,
  name: string,
  args: string,
  context: ToolExecutionContext,
): Promise<ExecuteToolCallResult> {
  const handler = executor[name]
  if (!handler) {
    return { result: `Tool "${name}" not found`, isError: true }
  }

  try {
    const res: ToolHandlerResult = await handler.execute(args, context)
    return { result: res.content, isError: res.isError ?? false }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { result: message, isError: true }
  }
}
