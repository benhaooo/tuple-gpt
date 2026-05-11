import type { ToolDefinition } from '@tuple-gpt/ai-core'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface McpToolSchema {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

export type McpConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface McpServerConfig {
  id: string
  name: string
  url: string
  headers?: Record<string, string>
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface McpServerState {
  config: McpServerConfig
  status: McpConnectionStatus
  error?: string
  tools: ToolDefinition[]
}

export class McpClient {
  private url: string
  private headers: Record<string, string>
  private sessionId: string | null = null
  private requestId = 0
  private connected = false

  constructor(url: string, headers?: Record<string, string>) {
    this.url = url
    this.headers = headers ?? {}
  }

  async connect(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'tuple-gpt', version: '1.0.0' },
    })

    if (response.error) {
      throw new Error(`MCP initialize failed: ${response.error.message}`)
    }

    this.connected = true

    await this.sendRequest('notifications/initialized', undefined)
  }

  async listTools(): Promise<ToolDefinition[]> {
    this.assertConnected()

    const response = await this.sendRequest('tools/list', {})
    if (response.error) {
      throw new Error(`MCP tools/list failed: ${response.error.message}`)
    }

    const result = response.result as { tools?: McpToolSchema[] }
    const tools = result.tools ?? []

    return tools.map(t => ({
      name: t.name,
      description: t.description ?? '',
      parameters: t.inputSchema ?? { type: 'object', properties: {} },
    }))
  }

  async callTool(name: string, args: string): Promise<string> {
    this.assertConnected()

    let parsedArgs: Record<string, unknown> = {}
    try {
      parsedArgs = JSON.parse(args)
    } catch {
      parsedArgs = {}
    }

    const response = await this.sendRequest('tools/call', {
      name,
      arguments: parsedArgs,
    })

    if (response.error) {
      throw new Error(`MCP tools/call failed: ${response.error.message}`)
    }

    const result = response.result as { content?: Array<{ type: string; text?: string }> }
    const content = result.content ?? []
    return content.map(c => c.text ?? '').join('\n')
  }

  disconnect(): void {
    this.connected = false
    this.sessionId = null
  }

  get isConnected(): boolean {
    return this.connected
  }

  private async sendRequest(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    const id = ++this.requestId
    const body: JsonRpcRequest = { jsonrpc: '2.0', id, method, params }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...this.headers,
    }

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId
    }

    const res = await fetch(this.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      throw new Error(`MCP HTTP error: ${res.status} ${res.statusText}`)
    }

    const newSessionId = res.headers.get('Mcp-Session-Id')
    if (newSessionId) {
      this.sessionId = newSessionId
    }

    const contentType = res.headers.get('Content-Type') ?? ''

    if (contentType.includes('text/event-stream')) {
      return this.parseSSEResponse(res, id)
    }

    return (await res.json()) as JsonRpcResponse
  }

  private async parseSSEResponse(res: Response, expectedId: number): Promise<JsonRpcResponse> {
    const text = await res.text()
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (!data) continue
        try {
          const parsed = JSON.parse(data) as JsonRpcResponse
          if (parsed.id === expectedId) return parsed
        } catch {
          // skip non-JSON lines
        }
      }
    }

    throw new Error('No matching JSON-RPC response found in SSE stream')
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new Error('MCP client is not connected')
    }
  }
}
