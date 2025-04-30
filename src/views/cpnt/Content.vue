<template>
    <div :class="selected ? 'min-w-[90%]' : 'min-w-[30%]'" class="transition-all duration-300 relative max-w-full">
        <div ref="contentRef" class="content w-full relative bg-white dark:bg-[#262626] overflow-scroll 
                   transition-all duration-300 rounded-[12px] p-4
                   hover:bg-gray-50/40 dark:hover:bg-[#303030]
                   group">
            <div v-if="parsedReasoningContent"
                class="bg-gray-50/80 dark:bg-gray-800/60 text-xs text-gray-500 dark:text-gray-400 p-3 rounded-lg mb-4">
                <div class="cursor-pointer select-none font-medium" @click="contentObj.rcFolded = !contentObj.rcFolded">
                    思考 {{ parsedContent ? '😲👆' : '🤔' }}
                </div>
                <div v-if="!contentObj.rcFolded" v-html="parsedReasoningContent"
                    class="mt-4 prose prose-sm dark:prose-invert" />
            </div>

            <div class="markdown-body" v-html="parsedContent || '&nbsp;'" ref="contentValueRef" />

            <span v-if="contentObj.chatting" class="typer absolute w-4 h-5 bg-[#B3C2F1] 
                       rounded-[3px] shadow-inner" />
        </div>
        <div class="absolute -top-5 right-0 text-gray-400/90 dark:text-gray-500 text-xs flex gap-10">
            <span>tokens:{{ contentObj?.usage?.total_tokens }}</span>
            <span class="font-mono">{{ modelName }}</span>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted, onUpdated, onUnmounted } from "vue";
import { marked } from 'marked'
import { copyToClip } from "@/utils/commonUtils";
import { useModel } from "@/models/data"

const props = defineProps({
    selected: Boolean,
    contentObj: Object,
});

const parsedReasoningContent = computed(() => marked.parse(props.contentObj.reasoning_content ?? ''))
const parsedContent = computed(() => marked.parse(props.contentObj.content));
const modelName = computed(() => useModel(props.contentObj.model).model.name)

const typer_position = reactive({ x: 0, y: 0 })
const contentValueRef = ref(null)
const contentRef = ref(null)

// 更新光标位置
const updateCursor = () => {
    const lastTextNode = getLastTextNode(contentValueRef.value)
    const cursorText = document.createTextNode("\u200b")//幽灵字符占位
    if (lastTextNode) {
        lastTextNode.parentElement.appendChild(cursorText)
    } else {
        contentValueRef.value.appendChild(cursorText)
    }

    const contentRect = contentRef.value.getBoundingClientRect()
    const range = document.createRange()
    range.setStart(cursorText, 0)
    range.setEnd(cursorText, 0)
    const textRect = range.getBoundingClientRect()
    typer_position.x = textRect.left - contentRect.left
    typer_position.y = textRect.top - contentRect.top
    cursorText.remove()
}
// 获取最后一个文本节点
const getLastTextNode = (dom) => {
    const childNodes = dom.childNodes

    for (let i = childNodes.length - 1; i >= 0; i--) {
        const childNode = childNodes[i]
        if (childNode.nodeType === Node.TEXT_NODE && /\S/.test(childNode.nodeValue)) {
            childNode.nodeValue = childNode.nodeValue.replace(/(\s*$)/, '')
            return childNode
        }
        if (childNode.nodeType === Node.ELEMENT_NODE) {
            return getLastTextNode(childNode)
        }
    }
}


const copyEventHandlers = new WeakMap();

//复制代码按钮添加事件
function addCopyCodeEvents() {
    if (contentValueRef.value) {
        const copyBtn = contentValueRef.value.querySelectorAll('.code-copy');
        copyBtn.forEach((btn) => {
            const handler = (e) => {
                e.stopPropagation();
                const code = btn.parentElement?.nextElementSibling?.textContent;
                if (code) {
                    copyToClip(code).then(() => {
                        btn.innerHTML = '<i class="iconfont">&#xe664;</i> 成功';
                        setTimeout(() => {
                            btn.innerHTML = '<i class="iconfont">&#xe8b0;</i> 复制';
                        }, 1000);
                    })
                }
            };
            btn.addEventListener('click', handler);
            copyEventHandlers.set(btn, handler);
        });
    }
}
//移除代码复制事件
function removeCopyCodeEvents() {
    if (contentValueRef.value) {
        const copyBtn = contentValueRef.value.querySelectorAll('.code-copy');
        copyBtn.forEach((btn) => {
            const handler = copyEventHandlers.get(btn);
            if (handler) {
                btn.removeEventListener('click', handler);
                copyEventHandlers.delete(btn);
            }
        });
    }
}

onMounted(() => {
    updateCursor()
    addCopyCodeEvents()

})
onUpdated(() => {
    updateCursor()
    addCopyCodeEvents()
})
onUnmounted(() => {
    removeCopyCodeEvents()
})

</script>


<style lang="less" scoped>
.content {
    padding: 12px 12px;
    margin-top: 8px;
    border-radius: 20px;

    .typer {
        // 动态渲染位置
        left: calc(v-bind('typer_position.x') * 1px);
        top: calc(v-bind('typer_position.y') * 1px);
    }

    &:hover {
        .handle {
            opacity: 1;
        }
    }
}
</style>