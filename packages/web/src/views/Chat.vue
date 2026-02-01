<template>
  <div class="w-screen h-screen bg-surface-light-primary dark:bg-surface-dark-primary text-text-light-primary dark:text-text-dark-primary">
    <div class="h-full flex flex-col-reverse md:flex-row">
      <ChatNav />
      <el-main style="padding: unset">
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </el-main>
    </div>
  </div>
</template>

<script setup>
import ChatNav from "./cpnt/ChatNav.vue";
import { marked } from 'marked'
import { markedHighlight } from "marked-highlight"
import hljs from 'highlight.js'
import katex from "marked-katex-extension";
import myKatex from "@/extensions/marked-katex"

import { createSSRApp, h, onMounted, onUpdated, onUnmounted } from 'vue'
import { renderToString } from 'vue/server-renderer'


// 高亮拓展
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, language) {
    const validLang = language && hljs.getLanguage(language)
    if (validLang) {
      const lang = language ?? ''
      return highlightBlock(hljs.highlight(code, { language: lang }).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  }
}))
//数学公式
marked.use(myKatex({
  displayMode: true,
}))

function highlightBlock(str, lang) {
  // 只能返回字符串
  //方法1.返回静态字符串，onMounted和onUpdated遍历添加事件并在onMounted移除事件
  return `<pre class="!bg-[#1c1d21]"><div class=" flex items-center justify-between px-4 py-2"><span class="">${lang}</span><span class="code-copy cursor-pointer select-none"><i class="iconfont">&#xe8b0;</i> 复制</span></div><code class="hljs code-block-body ${lang}">${str}</code></pre>`
  //方法2.返回组件渲染后的html，但是是异步函数，返回的是promise
  // const app = createSSRApp({
  //   render() {
  //     return h(HighlightBlock, { code: str, lang });
  //   }
  // });
  // const html = await renderToString(app)
  // return html
}
</script>

<style lang="less" scoped>
::v-deep(.el-dialog) {
  border-radius: 16px !important;
}

::v-deep(.el-dialog__body) {
  max-height: 60vh !important;
  overflow: scroll !important;
}
</style>
