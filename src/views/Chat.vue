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
import 'highlight.js/styles/base16/darcula.css'



// 高亮拓展
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'shell'
    return hljs.highlight(code, { language }).value
  }
}))
</script>
