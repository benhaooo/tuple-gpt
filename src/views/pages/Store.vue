<template>
    <div class="flex flex-col h-full w-full box-border p-4">
        <el-input class=" flex-shrink-0 my-4" v-model="rawData" @focus="selectAllText"></el-input>
        <div class=" flex-grow overflow-scroll" v-html="htmlData"></div>
    </div>

</template>

<script setup>
import { ref, watch } from 'vue'
import { marked } from 'marked'

const rawData = ref("")
const htmlData = ref("")

watch(rawData, (newVal, oldVal) => {
    try {
        const jsonStr = newVal
            .replace(/""/g, '"')

        // 解析JSON字符串
        const jsonObj = JSON.parse(jsonStr);

        // 格式化JSON字符串
        const formattedVal = `
\`\`\`json
${JSON.stringify(jsonObj, null, 2)}
\`\`\`
`;

        // 使用marked将Markdown格式的字符串转换为HTML
        htmlData.value = marked.parse(formattedVal);
    } catch (error) {
        console.log("🚀 ~ watch ~ error:", error);
        console.log("🚀 ~ watch ~ jsonStr:", jsonStr);
    }
});
const selectAllText = (event) => {
    event.target.select();
};
</script>
