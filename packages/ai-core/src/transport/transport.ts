import type { PipelineOutput, StreamEvent } from '../types'

export interface Transport {
  stream(request: PipelineOutput): AsyncIterable<StreamEvent>
}
