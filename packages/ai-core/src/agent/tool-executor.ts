export type ToolExecutor = {
  [name: string]: (args: string) => string | Promise<string>
}

export async function executeToolCall(
  executor: ToolExecutor,
  name: string,
  args: string,
): Promise<{ result: string; isError: boolean }> {
  const fn = executor[name]
  if (!fn) {
    return { result: `Tool "${name}" not found`, isError: true }
  }

  try {
    const result = await fn(args)
    return { result, isError: false }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { result: message, isError: true }
  }
}
