# Tuple GPT Monorepo 架构演进路线

本文档记录当前 monorepo 的架构判断与后续演进顺序。目标是让 Web 端与浏览器插件端尽可能共用一套 Vue UI 和 AI core，同时为未来 React Native 移动端、桌面端预留清晰的复用边界。

## 当前状态

当前仓库已经采用 `apps/` + `packages/` 的 monorepo 结构：

```text
apps/
  extension/          # 浏览器扩展应用

packages/
  ai-core/            # AI provider、stream、pipeline、agent loop
  ai-ui/              # AI 展示相关 Vue 组件，如 MarkdownRenderer
  shared/             # Vue UI、聊天组件、Pinia store、平台注入、AI adapter
```

现阶段 `@tuple-gpt/ai-core` 的方向是正确的：它基本保持为纯 TypeScript，不依赖 Vue、DOM、Pinia 或 Chrome Extension API。

主要需要收敛的是 `@tuple-gpt/shared`。它目前同时承担了以下职责：

- 通用聊天类型与 provider 类型
- Vue UI 基础组件和聊天组件
- Pinia store
- Vue composables
- 平台差异注入
- AI core adapter
- 资源与 provider preset

这个结构能快速支撑 Web 与 Extension 共用 Vue UI，但如果继续扩大，会让 React Native 和桌面端复用 AI 核心逻辑时被 Vue、DOM、Chrome storage 等假设牵制。

## 目标依赖方向

最终希望依赖关系保持单向、稳定：

```text
apps/web, apps/extension
  -> ui-vue / chat-vue
  -> chat-core
  -> ai-core

apps/mobile
  -> ui-rn
  -> chat-core
  -> ai-core

apps/desktop
  -> ui-vue 或 ui-desktop
  -> chat-core
  -> ai-core
```

核心原则：

- AI 核心逻辑跨所有端共用。
- 聊天业务逻辑跨所有端共用。
- UI 只在同技术栈内共用。Web 与 Extension 可以共用 Vue UI；React Native 单独实现 UI。
- 平台差异通过 adapter 注入，不写进 core 包。
- 包之间禁止反向依赖：`ai-core` 不依赖 `chat-core`，`chat-core` 不依赖 Vue/RN/Chrome。

## 建议包边界

后续可以逐步演进为：

```text
packages/
  ai-core/            # 纯 AI runtime
  chat-core/          # 聊天领域模型、会话操作、请求构造、stream orchestration
  platform/           # Storage、Secret、Clipboard、File、Context 等跨端接口
  ui-vue/             # Vue UI kit 与通用视觉组件
  chat-vue/           # Vue composables、Pinia adapter、ChatLayout
  ai-ui-vue/          # MarkdownRenderer、代码块展示等 Vue AI 展示组件
  design-tokens/      # 颜色、间距、圆角、字体等跨端设计 token
```

短期也可以不一次性拆这么细，但新增能力时应尽量往这些边界靠拢。

## 演进顺序

### 阶段 0：清理当前风险

目的：先移除会影响后续演进的明显风险。

建议事项：

- 移除 background 中硬编码的 API key，改为从 provider 配置或安全存储读取。
- 修正根 README 与 package scripts 中对不存在 `@tuple-gpt/web` 的描述，或补齐 `apps/web`。
- 修正 `@tuple-gpt/shared` 中无效的 exports，例如 `./utils` 指向不存在的 `src/utils/index.ts`。
- 给 `shared` 的职责增加说明，避免继续把所有跨端逻辑都放进去。

完成定义：

- `pnpm -r type-check` 通过。
- 仓库文档描述与实际目录一致。
- 不再有硬编码密钥。

### 阶段 1：创建 `chat-core`

目的：把聊天业务逻辑从 Vue/Pinia 中抽出来，形成未来多端复用的核心层。

迁移内容：

- `ChatMessage`、`Conversation`、`MessageAttachment`、`Provider`、`ModelSelection` 等领域类型。
- 会话操作：创建会话、追加消息、删除消息、截断消息、重命名会话。
- 请求构造：附件转上下文、UI 消息转 `ai-core` 消息、provider 配置转 `ai-core` provider config。
- 流式回复 orchestration：发送消息、停止、重试、重新生成的纯逻辑。

建议 API 形态：

```ts
export interface ChatRuntime {
  sendMessage(input: SendMessageInput): AsyncIterable<ChatRuntimeEvent>
  stop(requestId: string): void
}

export interface ChatRepository {
  listConversations(): Promise<Conversation[]>
  saveConversation(conversation: Conversation): Promise<void>
}
```

完成定义：

- Vue 的 `useChat` 只负责连接响应式状态和 `chat-core`。
- `chat-core` 不 import `vue`、`pinia`、`chrome`、`window`、`document`。
- `chat-core` 有基础单元测试。

### 阶段 2：把 `useChat` 降级为 Vue adapter

目的：保留现有 Vue 使用体验，但让核心流程不被 Vue 绑定。

调整方向：

- `useChat` 从“业务实现”变成“Vue 适配层”。
- Pinia store 只负责状态承载和持久化触发。
- 消息发送、重试、重新生成等流程委托给 `chat-core`。
- 将 `useFileAttachments` 中依赖 `FileReader` 的部分抽为 Web 文件 adapter。

完成定义：

- Extension 现有聊天功能行为不变。
- 新增 Web app 时不需要复制聊天业务逻辑。
- RN 端可以直接复用同一套 `chat-core` 流程。

### 阶段 3：拆分平台能力与 UI 插槽

目的：让平台差异可注入，但不污染 core。

当前 `PlatformConfig` 同时包含 Vue `Component` 和平台行为，建议拆成两层：

```ts
export interface PlatformServices {
  storage: StorageAdapter
  secrets: SecretStore
  clipboard: ClipboardAdapter
  files?: FileAdapter
  prepareContext?: ContextProvider
  openSettings?: () => Promise<void> | void
}

export interface VuePlatformSlots {
  InputActions?: Component
  InputPreview?: Component
}
```

各端实现：

- Extension：Chrome storage、Chrome side panel、tab context provider。
- Web：localStorage 或 IndexedDB、普通文件选择、网页上下文为空或由用户上传。
- RN：SecureStore、AsyncStorage、RN clipboard、DocumentPicker。
- Desktop：系统 keychain、本地文件系统、窗口或 WebView 能力。

完成定义：

- `chat-core` 只依赖 `PlatformServices` 类型，不依赖 Vue component。
- `chat-vue` 可以读取 `VuePlatformSlots` 渲染插件专属按钮。
- Extension 专属 tab 选择逻辑仍留在 `apps/extension`。

### 阶段 4：新建 `apps/web`

目的：验证 Web 与 Extension 共用 Vue UI 的边界是否正确。

建议做法：

- 新建 `apps/web`。
- 使用同一套 `ChatLayout`、ProviderManager、ModelSelector 等 Vue 组件。
- 提供 `webPlatformServices` 与 `webPlatformSlots`。
- Web 的 storage 先使用 localStorage 或 IndexedDB，后续再接后端账号体系。

完成定义：

- `pnpm dev:web` 能启动真实 Web app。
- Web 与 Extension 使用同一套聊天 UI 和同一套 `chat-core`。
- 平台差异只存在于 adapter，不进入 UI 主干逻辑。

### 阶段 5：准备 React Native 端

目的：验证 AI 核心逻辑和聊天业务逻辑是否真正跨端。

建议复用：

- `ai-core`
- `chat-core`
- provider presets 与 provider config 规范
- 附件和上下文构造策略
- design tokens

不建议复用：

- Vue 组件
- Pinia store
- DOM 相关 composables
- Chrome Extension API

RN 端应新建：

```text
apps/mobile/
packages/ui-rn/
```

完成定义：

- RN 能用同一套 provider 配置与聊天发送流程。
- RN UI 独立实现，但消息模型、会话模型、stream event 与 Web/Extension 一致。

### 阶段 6：桌面端策略选择

桌面端取决于技术路线：

- 如果使用 Electron/Tauri + WebView，可以复用 Vue UI，重点实现桌面平台 adapter。
- 如果使用原生桌面 UI，则复用 `ai-core`、`chat-core`、`design-tokens`，UI 单独实现。

建议优先选择 WebView 路线，这样可以最大化复用 Web/Extension 的 Vue UI。

## 长期治理规则

新增代码时优先判断它属于哪一层：

- AI provider、stream、tool、agent、pipeline：放入 `ai-core`。
- 会话、消息、provider、附件、发送流程：放入 `chat-core`。
- Vue 组件、Vue composables、Pinia adapter：放入 Vue 相关包。
- Chrome tabs、side panel、content script、background messaging：留在 `apps/extension`。
- localStorage、IndexedDB、Chrome storage、SecureStore、文件系统：通过 platform adapter 注入。

依赖规则：

- core 包不能依赖 UI 包。
- core 包不能直接访问浏览器或扩展 API。
- app 可以依赖 packages，packages 不依赖 app。
- 共享类型优先放到最底层能表达该概念的包里。
- 新增平台差异时先定义接口，再在 app 层实现。

## 推荐推进节奏

短期优先级：

1. 阶段 0：清理风险。
2. 阶段 1：抽 `chat-core`。
3. 阶段 2：让 `useChat` 成为 Vue adapter。

中期优先级：

1. 阶段 3：拆平台能力和 UI 插槽。
2. 阶段 4：补 `apps/web`，验证 Vue UI 复用。

长期优先级：

1. 阶段 5：React Native 端。
2. 阶段 6：桌面端。

这条路线的关键不是一次性重构，而是从现在开始避免让 `shared` 继续承载所有职责。每次新增功能都往目标边界移动一点，后续多端扩展时成本会明显更可控。
