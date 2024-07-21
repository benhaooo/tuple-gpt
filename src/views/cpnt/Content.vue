<template>
    <div :class="selected ? 'border-green-500 hover:border-green-500 min-w-[90%]' : 'border-transparent min-w-[30%]'"
        class="content max-w-full text-sm hover:border-blue-500 border-4  transition-all duration-300 bg-light-hard dark:bg-dark-base"
        ref="contentRef">
        <div class="contentValue" v-html="parsedContent" ref="contentValueRef"></div>
        <span v-if="contentObj.chatting"
            class="typer absolute w-4 h-5 bg-[#B3C2F1] border-dark-blue-base border-2 rounded-md" />
    </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted, onUpdated, onUnmounted } from "vue";
import { marked } from 'marked'
const props = defineProps({
    selected: Boolean,
    contentObj: Object
});
const parsedContent = computed(() => marked.parse(props.contentObj.content));


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
                    window.navigator.clipboard.writeText(code);
                    btn.innerHTML = '<i class="iconfont">&#xe664;</i> 成功';
                    setTimeout(() => {
                        btn.innerHTML = '<i class="iconfont">&#xe8b0;</i> 复制';
                    }, 1000);
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
    position: relative;

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