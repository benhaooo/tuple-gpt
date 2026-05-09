import { defineStore } from 'pinia'
import { ref, computed, reactive, watch } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { ToolDefinition, ToolExecutor } from '@tuple-gpt/ai-core'
import {
  McpClient,
  type McpServerConfig,
  type McpServerState,
  type McpConnectionStatus,
} from '@tuple-gpt/chat-core'

export const useMcpStore = defineStore(
  'mcp',
  () => {
    const servers = ref<McpServerConfig[]>([])
    const selectedServerId = ref<string | null>(null)

    const serverStates = reactive<Map<string, McpServerState>>(new Map())
    const clients = new Map<string, McpClient>()

    const selectedServer = computed(() => {
      if (!selectedServerId.value) return undefined
      return servers.value.find(s => s.id === selectedServerId.value)
    })

    const connectedServers = computed(() => {
      return servers.value.filter(s => {
        const state = serverStates.get(s.id)
        return state?.status === 'connected'
      })
    })

    const allTools = computed<ToolDefinition[]>(() => {
      const tools: ToolDefinition[] = []
      for (const state of serverStates.values()) {
        if (state.status === 'connected') {
          tools.push(...state.tools)
        }
      }
      return tools
    })

    const toolExecutor = computed<ToolExecutor>(() => {
      const executor: ToolExecutor = {}
      for (const [serverId, state] of serverStates.entries()) {
        if (state.status !== 'connected') continue
        const client = clients.get(serverId)
        if (!client) continue
        for (const tool of state.tools) {
          executor[tool.name] = (args: string) => client.callTool(tool.name, args)
        }
      }
      return executor
    })

    function getServerState(serverId: string): McpServerState | undefined {
      return serverStates.get(serverId)
    }

    function setServerStatus(serverId: string, status: McpConnectionStatus, error?: string) {
      const state = serverStates.get(serverId)
      if (state) {
        state.status = status
        state.error = error
      }
    }

    function addServer(data: { name: string; url: string; headers?: Record<string, string> }) {
      const now = new Date().toISOString()
      const server: McpServerConfig = {
        id: uuidv4(),
        name: data.name,
        url: data.url,
        headers: data.headers,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      }
      servers.value.push(server)
      serverStates.set(server.id, {
        config: server,
        status: 'disconnected',
        tools: [],
      })
      selectedServerId.value = server.id
      return server
    }

    function updateServer(
      id: string,
      data: Partial<Pick<McpServerConfig, 'name' | 'url' | 'headers' | 'enabled'>>,
    ) {
      const server = servers.value.find(s => s.id === id)
      if (!server) return
      Object.assign(server, data, { updatedAt: new Date().toISOString() })
      const state = serverStates.get(id)
      if (state) state.config = server
    }

    async function removeServer(id: string) {
      await disconnectServer(id)
      servers.value = servers.value.filter(s => s.id !== id)
      serverStates.delete(id)
      clients.delete(id)
      if (selectedServerId.value === id) {
        selectedServerId.value = servers.value[0]?.id ?? null
      }
    }

    async function connectServer(id: string) {
      const server = servers.value.find(s => s.id === id)
      if (!server) return

      let state = serverStates.get(id)
      if (!state) {
        state = { config: server, status: 'disconnected', tools: [] }
        serverStates.set(id, state)
      }

      state.status = 'connecting'
      state.error = undefined

      const client = new McpClient(server.url, server.headers)
      clients.set(id, client)

      try {
        await client.connect()
        const tools = await client.listTools()
        state.status = 'connected'
        state.tools = tools
      } catch (e) {
        state.status = 'error'
        state.error = e instanceof Error ? e.message : String(e)
        clients.delete(id)
      }
    }

    async function disconnectServer(id: string) {
      const client = clients.get(id)
      if (client) {
        client.disconnect()
        clients.delete(id)
      }
      const state = serverStates.get(id)
      if (state) {
        state.status = 'disconnected'
        state.tools = []
        state.error = undefined
      }
    }

    async function connectAllEnabled() {
      const enabled = servers.value.filter(s => s.enabled)
      await Promise.allSettled(enabled.map(s => connectServer(s.id)))
    }

    function selectServer(id: string | null) {
      selectedServerId.value = id
    }

    function initRuntimeStates() {
      for (const server of servers.value) {
        if (!serverStates.has(server.id)) {
          serverStates.set(server.id, {
            config: server,
            status: 'disconnected',
            tools: [],
          })
        }
      }
    }

    watch(
      servers,
      newServers => {
        for (const server of newServers) {
          if (!serverStates.has(server.id)) {
            serverStates.set(server.id, {
              config: server,
              status: 'disconnected',
              tools: [],
            })
          }
          const state = serverStates.get(server.id)!
          if (server.enabled && state.status === 'disconnected' && !clients.has(server.id)) {
            connectServer(server.id)
          }
        }
      },
      { deep: true },
    )

    return {
      servers,
      selectedServerId,
      serverStates,
      selectedServer,
      connectedServers,
      allTools,
      toolExecutor,
      getServerState,
      setServerStatus,
      addServer,
      updateServer,
      removeServer,
      connectServer,
      disconnectServer,
      connectAllEnabled,
      selectServer,
      initRuntimeStates,
    }
  },
  { chromePersist: true },
)
