# Tuple-GPT

一个现代化的 AI 聊天应用，基于 Vue 3 + TypeScript + Vite 构建，具有企业级架构设计。

## ✨ 特性

- 🚀 **现代化技术栈**: Vue 3 + TypeScript + Vite + Pinia
- 🏗️ **企业级架构**: 模块化设计、依赖注入、服务层抽象
- 🔧 **完整的工具链**: ESLint、Prettier、TypeScript 严格模式
- 📱 **响应式设计**: 支持多种设备和屏幕尺寸
- 🎨 **主题系统**: 支持明暗主题切换
- 🔄 **实时通信**: 支持流式响应和实时消息
- 📊 **状态管理**: 基于 Pinia 的模块化状态管理
- 🧩 **组合式 API**: 可复用的 Composable 函数库

## 🏗️ 架构概览

```
tuple-gpt/
├── src/
│   ├── apis/           # API 层 - 统一的 HTTP 客户端和服务
│   ├── stores/         # 状态管理 - 模块化的 Pinia Store
│   ├── services/       # 服务层 - 业务逻辑抽象和依赖注入
│   ├── composables/    # 组合式函数 - 可复用的响应式逻辑
│   ├── constants/      # 常量管理 - 统一的配置和常量
│   ├── utils/          # 工具函数 - 通用工具和日志系统
│   ├── components/     # Vue 组件
│   ├── views/          # 页面视图
│   └── assets/         # 静态资源
├── tests/              # 测试文件
├── scripts/            # 构建和工具脚本
└── docs/               # 项目文档
```

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
npm install
```

### 开发环境

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 类型检查

```bash
npm run type-check
```

## 📖 文档

- [架构设计](./docs/ARCHITECTURE.md) - 详细的架构设计文档
- [API 文档](./docs/API.md) - API 接口文档
- [组件文档](./docs/COMPONENTS.md) - 组件使用指南
- [开发指南](./docs/DEVELOPMENT.md) - 开发环境配置和规范
- [部署指南](./docs/DEPLOYMENT.md) - 生产环境部署说明

## 🔧 开发工具

### 推荐的 IDE 配置

- [VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- 禁用 Vetur 扩展以避免冲突

### 推荐的 VSCode 扩展

```json
{
  "recommendations": [
    "Vue.volar",
    "Vue.vscode-typescript-vue-plugin",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint"
  ]
}
```

## 🏛️ 核心架构

### 状态管理

基于 Pinia 的模块化状态管理：

- **Session Store**: 会话管理
- **Message Store**: 消息处理
- **Stream Store**: 流式响应
- **Evaluation Store**: 会话评估
- **Config Store**: 配置管理

### 服务层

依赖注入容器管理的服务层：

- **Chat Service**: 聊天业务逻辑
- **Session Service**: 会话服务
- **File Service**: 文件处理
- **Export Service**: 导入导出

### API 层

统一的 HTTP 客户端：

- 请求/响应拦截器
- 自动重试机制
- 错误处理
- 流式响应支持

## 🧩 Composables

可复用的组合式函数：

```typescript
// 聊天功能
const { sendMessage, isLoading, error } = useChat();

// 会话管理
const { sessions, currentSession, createSession } = useSession();

// 剪贴板操作
const { copy, read, isSupported } = useClipboard();

// 防抖处理
const { debouncedFn } = useDebounce(searchFunction, 300);
```

## 📊 状态管理示例

```typescript
// 使用 Session Store
const sessionStore = useSessionStore();
const session = sessionStore.createSession({
  name: 'New Chat',
  type: 'chat'
});

// 使用 Message Store
const messageStore = useMessageStore();
messageStore.createMessage(sessionId, index, 'user');

// 使用服务层
const chatService = getService<ChatService>('ChatService');
const result = await chatService.sendMessage('Hello!');
```

## 🔄 开发流程

### 1. 功能开发

```bash
# 创建新分支
git checkout -b feature/new-feature

# 开发功能
npm run dev

# 类型检查
npm run type-check

# 代码格式化
npm run format

# 提交代码
git commit -m "feat: add new feature"
```

### 2. 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 编写单元测试

### 3. 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式化
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建工具或辅助工具的变动

## 🚀 部署

### 开发环境

```bash
npm run dev
```

### 预览构建

```bash
npm run build
npm run preview
```

### 生产部署

```bash
# 构建生产版本
npm run build

# 部署到服务器
# 将 dist/ 目录内容上传到 Web 服务器
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Pinia](https://pinia.vuejs.org/) - Vue 状态管理库
- [Element Plus](https://element-plus.org/) - Vue 3 组件库
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 [Issue](https://github.com/your-username/tuple-gpt/issues)
- 发送邮件到 your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给它一个星标！
