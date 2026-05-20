import type { ToolExecutionContext } from '../types'

/** Result of running a single tool call. */
export type ToolRunOutcome =
  | {
      kind: 'resolved'
      result: string
      isError?: boolean
    }
  | {
      kind: 'awaiting'
      /** UI hint for the caller to render an interaction surface. */
      component: string
    }
  | { kind: 'unknown' }

/**
 * Resolves tool calls produced by the LLM. Implementations decide whether a
 * call runs locally (returning 'resolved') or has to be answered by some
 * external party (returning 'awaiting'). ai-core treats a runner as a black
 * box and only reacts to the outcome.
 */
export interface ToolRunner {
  run(name: string, args: string, context: ToolExecutionContext): Promise<ToolRunOutcome>
}
