import type { ProviderConfig, RequestOptions, Message, StreamEvent, ToolDefinition } from '../types'
import type { PipelineStep, ContextWindowOptions } from '../pipeline'
import type { ToolRunner } from '../agent'
import { createTransport } from '../transport'
import { systemPrompt, contextWindow, injectTools } from '../pipeline'
import { runAgentLoop } from '../agent'

export interface ChatConfig {
  provider: ProviderConfig
  systemPrompt?: string
  contextWindow?: ContextWindowOptions
  tools?: ToolDefinition[]
  toolRunner?: ToolRunner
  options?: RequestOptions
  maxTurns?: number
  pipelineSteps?: PipelineStep[]
}

export async function* chat(messages: Message[], config: ChatConfig): AsyncIterable<StreamEvent> {
  yield* runAgentLoop({
    messages,
    transport: createTransport(config.provider.type),
    tools: config.tools,
    toolRunner: config.toolRunner,
    pipeline: buildPipelineSteps(config),
    provider: config.provider,
    options: config.options,
    maxTurns: config.maxTurns,
  })
}

function buildPipelineSteps(config: ChatConfig): PipelineStep[] {
  const steps: PipelineStep[] = []
  if (config.systemPrompt) steps.push(systemPrompt(config.systemPrompt))
  if (config.contextWindow) steps.push(contextWindow(config.contextWindow))
  if (config.tools) steps.push(injectTools(config.tools))
  if (config.pipelineSteps) steps.push(...config.pipelineSteps)
  return steps
}
