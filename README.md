# Tuple GPT Monorepo

一个基于 Vue 3 + TypeScript + UnoCSS 的 Monorepo 项目，包含 Web 应用和浏览器扩展。

## 项目结构

```
tuple-gpt/
├── packages/
│   ├── web/              # Web 应用
│   ├── extension/        # 浏览器扩展
│   └── shared/           # 共享代码包
├── pnpm-workspace.yaml   # pnpm workspace 配置
├── tsconfig.base.json    # 共享的 TypeScript 配置
└── package.json          # 根 package.json
```

## 技术栈

- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite 6
- **CSS 框架**: UnoCSS
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **包管理器**: pnpm workspace

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发

```bash
# 启动 Web 项目
pnpm dev:web

# 启动浏览器扩展项目
pnpm dev:extension
```

### 构建

```bash
# 构建所有项目
pnpm build:all

# 构建 Web 项目
pnpm build:web

# 构建浏览器扩展
pnpm build:extension
```

### 类型检查

```bash
pnpm type-check
```

## 项目说明

### Web 项目 (@tuple-gpt/web)

基于 Vue 3 的 Web 应用，提供完整的 GPT 对话界面。

**特性**:
- Vue Router 路由管理
- Pinia 状态管理
- Markdown 渲染支持
- 代码高亮
- Mermaid 图表支持
- 暗色模式

### Extension 项目 (@tuple-gpt/extension)

基于 Vue 3 的浏览器扩展，使用 CRXJS 构建。

**特性**:
- Chrome Extension Manifest V3
- Content Script 支持
- Web Components
- 独立的样式隔离

### Shared 包 (@tuple-gpt/shared)

共享的类型定义和工具函数。

**使用方式**:
```typescript
import { Message, ChatSession } from '@tuple-gpt/shared/types'
import { formatTimestamp, generateId } from '@tuple-gpt/shared/utils'
```

## 常用命令

```bash
# 为特定项目添加依赖
pnpm --filter @tuple-gpt/web add <package>
pnpm --filter @tuple-gpt/extension add <package>

# 为所有项目添加依赖
pnpm -r add <package>

# 清理所有构建产物和依赖
pnpm clean
```

## 开发指南

详细的迁移指南和开发说明请查看 [MIGRATION.md](MIGRATION.md)。

## License

ISC
