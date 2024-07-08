<script setup>
const props = defineProps({
    lang: {
        type: String,
        default: 'javascript'
    },
    code: {
        type: String,
        required: true
    }
})
// console.log(props.code)

</script>
<template>
    <pre class="">
    <div class="flex items-center justify-between px-4 py-2">
        111111
      <!-- <span>{{ props.lang }}</span> -->
      <!-- <span class="code-copy cursor-pointer" @click="copyCode">
        <i class="iconfont">&#xe8b0;</i> 复制
      </span> -->
    </div>
    <!-- <code class="hljs code-block-body" v-html="props.highlightedCode"></code> -->
  </pre>

</template>