import type { PipelineOutput } from '../types'

export type PipelineStep = (input: PipelineOutput) => PipelineOutput

export function createPipeline(...steps: PipelineStep[]): PipelineStep {
  return (input: PipelineOutput): PipelineOutput => {
    let result = input
    for (const step of steps) {
      result = step(result)
    }
    return result
  }
}
