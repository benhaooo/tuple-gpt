<template>
  <div class="flex-1 flex flex-col overflow-hidden bg-surface">
    <!-- 消息列表 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- 对话标识 -->
      <div class="flex items-center space-x-2 my-4">
        <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
          </svg>
        </div>
        <span class="font-medium text-foreground">Sider Fusion</span>
      </div>

      <!-- 摘要部分 -->
      <div class="rounded-lg border border-border p-4">
        <h3 class="text-lg font-medium mb-4 text-foreground">摘要</h3>
        <div class="text-sm text-muted-foreground">
          <p class="mb-4">
            消息提示（Message）在 Element Plus 中常用于用户主动操作后的反馈，区别于系统级通知的 Notification。它支持多种状态（成功、警告、消息、错误），具有自动关闭、可关闭、HTML内容、分组合并等多样化功能，且可通过全局方法或单独引用调用。除此之外，还可以设置应用上下文实属性继承，确保在不同场景下灵活使用。该组件提供丰富的配置项和方法，以满足各种用户交互反馈需求。
          </p>
        </div>

        <!-- 总结按钮 -->
        <div class="flex justify-end mt-2">
          <button class="flex items-center space-x-1 bg-background hover:brightness-95 rounded px-3 py-1 text-sm text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
            </svg>
            <span>总结</span>
          </button>
        </div>
      </div>

      <!-- 消息列表 - AI消息 -->
      <div class="space-y-4">
        <div class="flex items-start space-x-3">
          <div class="flex-shrink-0">
            <div class="w-8 h-8 rounded-full bg-primary/10 p-1 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div class="flex-1">
            <div class="bg-surface border border-border rounded-lg p-4 shadow-sm">
              <div class="flex items-center space-x-2 mb-3">
                <h4 class="font-medium text-foreground">Message 消息提示 | Element Plus</h4>
                <a href="https://element-plus.org" class="text-xs text-muted-foreground">element-plus.org</a>
              </div>
              <div class="prose prose-sm dark:prose-invert max-w-none text-foreground">
                <h3 class="text-lg font-medium mb-2">关键点</h3>
                <ul class="list-disc pl-5 space-y-2">
                  <li>Message 用于主动操作后的反馈提示，区别于 Notification 的被动提醒。</li>
                  <li>支持多种状态，包括成功、警告、信息和错误，且可以自定义样式和类型。</li>
                  <li>提供自动隐藏和手动关闭功能，支持设置关闭按钮和持续时间。</li>
                  <li>允许使用 HTML 字符串作为内容，但需注意 XSS 攻击风险。</li>
                  <li>支持内容分组合并，避免重复消息堆积。</li>
                  <li>在 Vue 项目中，可以通过 $message 全局方法或 ElMessage 独立引用调用。</li>
                  <li>允许注入应用上下文，实现属性继承，增强组件的适应性和扩展性。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 相关问题 -->
      <div class="space-y-3 mt-6">
        <h4 class="font-medium text-foreground">相关问题</h4>
        <ul class="space-y-2">
          <li>
            <a href="#" class="text-primary hover:underline text-sm">Element Plus Message 组件的高级用法有哪些？</a>
          </li>
          <li>
            <a href="#" class="text-primary hover:underline text-sm">如何在项目中安全使用 HTML 内容的 Message?</a>
          </li>
          <li>
            <a href="#" class="text-primary hover:underline text-sm">Message 组件在不同版本中有哪些更新和变化？</a>
          </li>
        </ul>
      </div>

      <!-- 底部工具栏 -->
      <div class="p-3 border border-border rounded-lg flex justify-between items-center mt-4">
        <span class="text-sm font-medium text-foreground">深度阅读工具</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
      </div>

      <!-- 推荐链接 -->
      <div class="p-3 border border-border rounded-lg flex justify-between items-center bg-background">
        <span class="text-sm font-medium text-foreground">在Wisebase中无干扰阅读和聊天</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-muted-foreground" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>

    <!-- 底部输入框 -->
    <div class="border-t border-border p-3 bg-surface">
      <div class="relative">
        <div class="flex items-center border border-border rounded-lg overflow-hidden bg-background">
          <div class="flex-1">
            <textarea
              class="w-full p-3 outline-none resize-none h-12 max-h-32 bg-transparent text-foreground placeholder:text-muted-foreground"
              placeholder="请在这里输入问题，@ 模型，/ 提示"
              rows="1"
            ></textarea>
          </div>
          <div class="flex items-center pr-3">
            <button class="text-muted-foreground hover:text-foreground mx-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <button class="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center hover:brightness-110">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Chat view specific logic can go here
</script> 