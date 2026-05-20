import type {
  ToolExecutionContext,
  ToolHandler,
  ToolRunner,
  ToolRunOutcome,
} from '@tuple-gpt/ai-core'

/**
 * Default ToolRunner implementation. Maintains two registries:
 *   - handlers:   tools that run locally (auto tools, MCP tools)
 *   - components: tools that need a UI to resolve (interactive tools)
 *
 * Registration is the only place where the auto/interactive distinction
 * matters. After construction, `run()` looks up handlers first, then the
 * component registry, returning a uniform outcome the agent loop reacts to.
 */
export class DefaultToolRunner implements ToolRunner {
  private handlers = new Map<string, ToolHandler>()
  private components = new Map<string, string>()

  registerHandler(name: string, handler: ToolHandler): this {
    this.handlers.set(name, handler)
    return this
  }

  registerInteractive(name: string, component: string): this {
    this.components.set(name, component)
    return this
  }

  hasHandler(name: string): boolean {
    return this.handlers.has(name)
  }

  getInteractiveComponent(name: string): string | undefined {
    return this.components.get(name)
  }

  async run(name: string, args: string, context: ToolExecutionContext): Promise<ToolRunOutcome> {
    const handler = this.handlers.get(name)
    if (handler) {
      try {
        const res = await handler.execute(args, context)
        return { kind: 'resolved', result: res.content, isError: res.isError ?? false }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { kind: 'resolved', result: message, isError: true }
      }
    }

    const component = this.components.get(name)
    if (component) {
      return { kind: 'awaiting', component }
    }

    return { kind: 'unknown' }
  }
}

export function createToolRunner(): DefaultToolRunner {
  return new DefaultToolRunner()
}
