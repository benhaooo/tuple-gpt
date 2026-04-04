/**
 * Integration tests — real Gemini-compatible API calls.
 *
 * Requires .env.test.local:
 *   GEMINI_API_KEY, GEMINI_MODEL, GEMINI_BASE_URL (optional)
 *
 * Skipped automatically when GEMINI_API_KEY is not set.
 */
import { describe, it, expect } from 'vitest'
import { createGeminiTransport } from '../transport/providers/gemini'
import { runAgentLoop } from '../agent/agent-loop'
import { systemPrompt } from '../pipeline/steps/system-prompt'
import { collect } from './helpers'
import type { Message, StreamEvent, ToolDefinition } from '../types'
import type { ToolExecutor } from '../agent/tool-executor'

const API_KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const BASE_URL = process.env.GEMINI_BASE_URL || undefined

const provider = {
  type: 'gemini' as const,
  apiKey: API_KEY!,
  model: MODEL,
  baseUrl: BASE_URL,
}

const canRun = !!API_KEY
const describeIf = canRun ? describe : describe.skip

describeIf('Gemini Integration', { timeout: 60_000 }, () => {
  describe('Transport — text streaming', () => {
    it('streams a simple text response', async () => {
      const transport = createGeminiTransport()
      const events = await collect(
        transport.stream({
          messages: [{ role: 'user', content: 'Reply with exactly: hello' }],
          provider,
          options: { maxTokens: 20, temperature: 0 },
        }),
      )

      const textDeltas = events.filter(
        (e): e is Extract<StreamEvent, { type: 'text_delta' }> => e.type === 'text_delta',
      )
      const finish = events.find((e) => e.type === 'finish')

      expect(textDeltas.length).toBeGreaterThan(0)
      const fullText = textDeltas.map((e) => e.text).join('')
      expect(fullText.toLowerCase()).toContain('hello')
      expect(finish).toBeDefined()
    })
  })

  describe('Agent loop — tool call round-trip', () => {
    it('calls a tool then produces a final text answer', async () => {
      const transport = createGeminiTransport()

      const tools: ToolDefinition[] = [
        {
          name: 'get_weather',
          description: 'Get current weather for a city',
          parameters: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'City name' },
            },
            required: ['city'],
          },
        },
      ]

      const toolExecutor: ToolExecutor = {
        get_weather: (args) => {
          const { city } = JSON.parse(args)
          return JSON.stringify({ city, temperature: '22°C', condition: 'sunny' })
        },
      }

      const messages: Message[] = [
        { role: 'user', content: 'Call the get_weather tool with city "Tokyo". Do not answer without using the tool.' },
      ]

      const events = await collect(
        runAgentLoop({
          messages,
          transport,
          provider,
          tools,
          toolExecutor,
          pipeline: [systemPrompt('Always use the get_weather tool. Never answer weather questions without calling the tool first.')],
          options: { maxTokens: 300, temperature: 0 },
          maxTurns: 3,
        }),
      )

      // Should have at least one tool_call_start
      const toolStarts = events.filter((e) => e.type === 'tool_call_start')
      expect(toolStarts.length).toBeGreaterThanOrEqual(1)

      // Messages should include: user, assistant(tool_call), tool(result), assistant(text)
      expect(messages.length).toBeGreaterThanOrEqual(3)

      // Tool result message exists
      const toolMsgs = messages.filter((m) => m.role === 'tool')
      expect(toolMsgs.length).toBeGreaterThanOrEqual(1)

      // Final assistant reply references the weather info
      const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
      expect(lastAssistant).toBeDefined()
      const text = typeof lastAssistant!.content === 'string'
        ? lastAssistant!.content
        : (lastAssistant!.content as any[])
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('')
      expect(text.toLowerCase()).toMatch(/tokyo|sunny|22/)
    })
  })
})
