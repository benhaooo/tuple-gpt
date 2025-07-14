# Ctrl+数字快捷发送功能测试

## 功能说明
用户可以按 `Ctrl+数字(1-9)` 快捷发送消息，将得到对应数量的并行回复。这些回复共享同一个用户消息作为parent。

## 实现原理
- 复用现有的多模型消息发送架构
- 使用当前助手的默认模型创建N个相同模型的数组
- 通过 `selectedModels` 机制触发多模型并发请求
- 不需要新的service方法或emit事件

## 测试步骤

### 1. 基本功能测试
1. 打开应用：http://localhost:5173/
2. 确保选择了一个有默认模型的助手
3. 在输入框中输入测试消息，如："请介绍一下人工智能"
4. 按 `Ctrl+3` 
5. 应该看到：
   - 一个用户消息
   - 3个并行的助手回复（都使用相同模型）
   - 所有助手回复的parentMessageId都指向同一个用户消息

### 2. 边界测试
- 测试 `Ctrl+1` 到 `Ctrl+9` 的所有组合
- 测试在没有输入内容时按快捷键（应该不发送）
- 测试在没有选择助手时按快捷键
- 测试在助手没有默认模型时按快捷键

### 3. 交互测试
- 测试快捷键与现有@选择模型功能的兼容性
- 测试快捷键与文件上传功能的兼容性
- 测试快捷键与其他键盘快捷键的冲突

## 预期行为

### 成功场景
- 按 `Ctrl+N` (N=1-9) 后，输入框清空
- 生成N个并行回复，都使用当前助手的默认模型
- 所有回复共享同一个parentMessageId
- 回复按照现有的流式显示逻辑展示

### 失败场景
- 没有输入内容：不发送消息
- 没有当前助手：控制台警告，不发送
- 助手没有默认模型：控制台警告，不发送

## 代码变更总结

### 修改的文件
- `src/views/pages/chat/cpnt/Editor.vue`

### 新增的功能
1. 扩展 `handleKeyDown` 方法，检测 `Ctrl+数字` 组合键
2. 新增 `handleShortcutSend` 方法处理快捷发送逻辑
3. 更新placeholder文本提示用户新功能

### 复用的架构
- `selectedModels` 机制
- `MessageService.sendStreamMessage` 方法
- `sendMultiModelRequests` 多模型并发逻辑
- 现有的消息显示和管理系统

## 技术细节

### 键盘事件处理
```javascript
if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
    e.preventDefault();
    const replyCount = parseInt(e.key);
    handleShortcutSend(replyCount);
}
```

### 模型数组生成
```javascript
const defaultModel = currentAssistant.value?.model;
const models = Array(replyCount).fill(defaultModel);
selectedModels.value = models;
```

### 复用发送逻辑
```javascript
handleSendMessage(); // 复用现有发送方法
```

这种设计确保了新功能与现有架构完全兼容，没有引入额外的复杂性。
