<template>
  <div class="w-screen h-screen bg-light-base dark:bg-dark-base text-light-text dark:text-dark-text">
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
// 注意引入样式，你可以前往 node_module 下查看更多的样式主题
import 'highlight.js/styles/an-old-hope.css'
import HighlightBlock from "./cpnt/HighlightBlock.vue";

import { createSSRApp, h, onMounted, onUpdated, onUnmounted } from 'vue'
import { renderToString } from 'vue/server-renderer'



// 高亮拓展
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, language) {
    const validLang = !!(language && hljs.getLanguage(language))
    if (validLang) {
      const lang = language ?? ''
      return highlightBlock(hljs.highlight(code, { language: lang }).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  }
}))

function highlightBlock(str, lang) {
  // 只能返回字符串
  //方法1.返回静态字符串，onMounted和onUpdated遍历添加事件并在onMounted移除事件

  //方法2.返回组件渲染后的html，但是是异步函数，返回的是promise
  // const app = createSSRApp({
  //   render() {
  //     return h(HighlightBlock, { code: str, lang });
  //   }
  // });
  // const html = await renderToString(app)
  // return html

  return `<pre class=""><div class=" flex items-center justify-between px-4 py-2"><span class="">${lang}</span><span class="code-copy cursor-pointer"><i class="iconfont">&#xe8b0;</i> 复制</span></div><code class="hljs code-block-body ${lang}">${str}</code></pre>`
}
</script>
