<template>
  <div class="text-content relative">
    <div ref="contentRef" class="markdown-body" v-html="parsedContent || '&nbsp;'" />

    <!-- 打字机光标 -->
    <span v-if="showTyper" class="typer absolute w-4 h-5 bg-[#B3C2F1]
                 rounded-[3px] shadow-inner" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onUpdated, onUnmounted, watch } from "vue";
import { marked } from 'marked';
import { copyToClip } from "@shared/utils/commonUtils";

interface Props {
  content: string;
  showTyper?: boolean; // 是否显示打字机光标
}

const props = withDefaults(defineProps<Props>(), {
  showTyper: false
});

const parsedContent = computed(() => marked.parse(props.content));

const typer_position = reactive({ x: 0, y: 0 });
const contentRef = ref<HTMLElement | null>(null);

// 更新光标位置
const updateCursor = () => {
  if (!props.showTyper || !contentRef.value) return;

  const lastTextNode = getLastTextNode(contentRef.value);
  const cursorText = document.createTextNode("\u200b"); // 幽灵字符占位

  if (lastTextNode) {
    lastTextNode.parentElement?.appendChild(cursorText);
  } else {
    contentRef.value.appendChild(cursorText);
  }

  const contentRect = contentRef.value.getBoundingClientRect();
  const range = document.createRange();
  range.setStart(cursorText, 0);
  range.setEnd(cursorText, 0);
  const textRect = range.getBoundingClientRect();
  typer_position.x = textRect.left - contentRect.left;
  typer_position.y = textRect.top - contentRect.top;
  cursorText.remove();
};

// 获取最后一个文本节点
const getLastTextNode = (dom: HTMLElement): Text | null => {
  const childNodes = dom.childNodes;

  for (let i = childNodes.length - 1; i >= 0; i--) {
    const childNode = childNodes[i];
    if (!childNode) continue;

    if (childNode.nodeType === Node.TEXT_NODE && /\S/.test(childNode.nodeValue || '')) {
      if (childNode.nodeValue) {
        childNode.nodeValue = childNode.nodeValue.replace(/(\s*$)/, '');
      }
      return childNode as Text;
    }
    if (childNode.nodeType === Node.ELEMENT_NODE) {
      const result = getLastTextNode(childNode as HTMLElement);
      if (result) return result;
    }
  }
  return null;
};

const copyEventHandlers = new WeakMap();

// 复制代码按钮添加事件
function addCopyCodeEvents() {
  if (!contentRef.value) return;

  const copyBtn = contentRef.value.querySelectorAll('.code-copy');
  copyBtn.forEach((btn) => {
    const handler = (e: Event) => {
      e.stopPropagation();
      const code = (btn.parentElement?.nextElementSibling as HTMLElement)?.textContent;
      if (code) {
        copyToClip(code).then(() => {
          btn.innerHTML = '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> 成功';
          setTimeout(() => {
            btn.innerHTML = '<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> 复制';
          }, 1000);
        });
      }
    };
    btn.addEventListener('click', handler);
    copyEventHandlers.set(btn, handler);
  });
}

// 移除代码复制事件
function removeCopyCodeEvents() {
  if (!contentRef.value) return;

  const copyBtn = contentRef.value.querySelectorAll('.code-copy');
  copyBtn.forEach((btn) => {
    const handler = copyEventHandlers.get(btn);
    if (handler) {
      btn.removeEventListener('click', handler);
      copyEventHandlers.delete(btn);
    }
  });
}

// 监听内容变化，更新光标位置
watch(() => props.content, () => {
  if (props.showTyper) {
    updateCursor();
  }
}, { flush: 'post' });

onMounted(() => {
  if (props.showTyper) {
    updateCursor();
  }
  addCopyCodeEvents();
});

onUpdated(() => {
  if (props.showTyper) {
    updateCursor();
  }
  addCopyCodeEvents();
});

onUnmounted(() => {
  removeCopyCodeEvents();
});
</script>

<style lang="less" scoped>
.text-content {
  .typer {
    // 动态渲染位置
    left: calc(v-bind('typer_position.x') * 1px);
    top: calc(v-bind('typer_position.y') * 1px);
  }
}

// 继承Message组件的markdown样式
.markdown-body {
  line-height: 1.6;

  :deep(p) {
    margin-bottom: 0.5em;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(pre) {
    background-color: #f5f5f5;
    border-radius: 8px;
    padding: 12px;
    overflow-x: auto;
    margin: 8px 0;

    code {
      background: none;
      padding: 0;
    }
  }

  :deep(code) {
    background-color: #f0f0f0;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 0.9em;
  }
}

// 暗色主题样式
:deep(.dark) {
  .markdown-body {
    :deep(pre) {
      background-color: #1c1d21;
    }

    :deep(code) {
      background-color: #2a2a2a;
    }
  }
}
</style>