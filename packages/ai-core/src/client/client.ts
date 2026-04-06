import type {
  ProviderConfig,
  RequestOptions,
  Message,
  StreamEvent,
  ToolDefinition,
} from '../types'
import type { PipelineStep } from '../pipeline'
import type { ContextWindowOptions } from '../pipeline'
import type { Transport } from '../transport'
import type { ToolExecutor } from '../agent'
import { createTransport } from '../transport'
import { createPipeline, systemPrompt, contextWindow, injectTools } from '../pipeline'
import { runAgentLoop } from '../agent'

// ---------------------------------------------------------------------------
// Config types
// ---------------------------------------------------------------------------

export interface ClientConfig {
  provider: ProviderConfig
  systemPrompt?: string
  contextWindow?: ContextWindowOptions
  tools?: ToolDefinition[]
  toolExecutor?: ToolExecutor
  defaults?: RequestOptions
  maxTurns?: number
  pipelineSteps?: PipelineStep[]
}

export interface ChatOptions {
  options?: RequestOptions
  tools?: ToolDefinition[]
  toolExecutor?: ToolExecutor
  maxTurns?: number
  systemPrompt?: string
  pipelineSteps?: PipelineStep[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function mergeTools(
  base?: ToolDefinition[],
  extra?: ToolDefinition[],
): ToolDefinition[] | undefined {
  if (!base && !extra) return undefined
  if (!extra) return base
  if (!base) return extra

  const merged = new Map<string, ToolDefinition>()
  for (const t of base) merged.set(t.name, t)
  for (const t of extra) merged.set(t.name, t) // per-call wins
  return Array.from(merged.values())
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class ChatClient {
  readonly config: Readonly<ClientConfig>
  private readonly transport: Transport

  constructor(config: ClientConfig) {
    this.config = config
    this.transport = createTransport(config.provider.type)
  }

  async *chat(
    messages: Message[],
    opts?: ChatOptions,
  ): AsyncIterable<StreamEvent> {
    const pipelineSteps = this.buildPipelineSteps(opts)
    const tools = mergeTools(this.config.tools, opts?.tools)
    const executor = opts?.toolExecutor ?? this.config.toolExecutor
    const options = this.mergeOptions(opts)
    const maxTurns = opts?.maxTurns ?? this.config.maxTurns

    if (tools && tools.length > 0 && executor) {
      yield* runAgentLoop({
        messages,
        transport: this.transport,
        tools,
        toolExecutor: executor,
        pipeline: pipelineSteps,
        provider: this.config.provider,
        options,
        maxTurns,
      })
    } else {
      const pipeline = createPipeline(...pipelineSteps)
      const prepared = pipeline({
        messages,
        tools,
        provider: this.config.provider,
        options,
      })
      yield* this.transport.stream(prepared)
    }
  }

  with(overrides: Partial<ClientConfig>): ChatClient {
    return new ChatClient({ ...this.config, ...overrides })
  }

  static chat(
    messages: Message[],
    config: ClientConfig,
    opts?: ChatOptions,
  ): AsyncIterable<StreamEvent> {
    return new ChatClient(config).chat(messages, opts)
  }

  private buildPipelineSteps(opts?: ChatOptions): PipelineStep[] {
    const steps: PipelineStep[] = []

    const prompt = opts?.systemPrompt ?? this.config.systemPrompt
    if (prompt) {
      steps.push(systemPrompt(prompt))
    }

    if (this.config.contextWindow) {
      steps.push(contextWindow(this.config.contextWindow))
    }

    const tools = mergeTools(this.config.tools, opts?.tools)
    if (tools) {
      steps.push(injectTools(tools))
    }

    if (this.config.pipelineSteps) {
      steps.push(...this.config.pipelineSteps)
    }

    if (opts?.pipelineSteps) {
      steps.push(...opts.pipelineSteps)
    }

    return steps
  }

  private mergeOptions(opts?: ChatOptions): RequestOptions | undefined {
    if (!this.config.defaults && !opts?.options) return undefined
    if (!opts?.options) return this.config.defaults
    if (!this.config.defaults) return opts.options
    return { ...this.config.defaults, ...opts.options }
  }
}

export function createClient(config: ClientConfig): ChatClient {
  return new ChatClient(config)
}
