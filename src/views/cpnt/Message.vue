<template>
  <div class="message group" :class="{ self: isUser }">
    <div>
      <div class="user-info flex items-center gap-x-2">
        <div class="avater-wrapper">
          <el-tooltip content="编辑" placement="top">
            <i class="iconfont center edit" @click="handleEditMessage()">&#xeabd;</i>
          </el-tooltip>
          <img :src="isUser ? configStore.getAvatar : '/src/assets/imgs/gpt.png'" alt="" />
        </div>
        <span v-if="isUser" class="text-sm font-extrabold">{{ userConfig.name }}</span>
        <div class="flex gap-x-1 text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <ExpandableBtn @click="sessionsStore.deleteMessage(message.id)" text="删除">
            <i class="iconfont">&#xec7b;</i>
          </ExpandableBtn>
          <ExpandableBtn v-if="!isUser" @click="sessionsStore.reChat(message.id)" text="重试">
            <i class="iconfont">&#xe616;</i>
          </ExpandableBtn>
          <ExpandableBtn @click="copy" text="复制">
            <i class="iconfont">&#xe8b0;</i>
          </ExpandableBtn>
        </div>
      </div>
    </div>
    <div class="content text-sm bg-light-hard dark:bg-dark-base" ref="contentRef">
      <img v-if="message.img" :src="message.img" alt="">
      <div class="contentValue" v-html="parsedContent" ref="contentValueRef"></div>
      <span v-if="message.chatting"
        class="typer absolute w-4 h-5 bg-[#B3C2F1] border-dark-blue-base border-2 rounded-md" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted, onUpdated } from "vue";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import { marked } from 'marked'
import ExpandableBtn from "../cpnt/ExpandableBtn.vue"
import { useToast } from 'vue-toast-notification';
import useSessionsStore from "@/stores/modules/chat";


const sessionsStore = useSessionsStore();
const configStore = useConfigStore();
const { userConfig } = storeToRefs(configStore)

const props = defineProps({
  message: Object,
});

const isUser = computed(() => {
  return props.message.role === 'user'
})
const parsedContent = computed(() => {
  return marked.parse(props.message.content)
})
const emits = defineEmits(["edit"]);
const handleEditMessage = () => {
  emits("edit", props.message);
};

const copy = () => {
  navigator.clipboard.writeText(props.message.content)
  useToast().success('复制成功')
}

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

onMounted(updateCursor)
onUpdated(updateCursor)

</script>

<style scoped lang="less">
.message {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .user-info {
    display: flex;

    .avater-wrapper {
      position: relative;
      height: 26px;
      width: 26px;
      clip-path: circle();
      overflow: hidden;

      .edit {
        position: absolute;
        width: 100%;
        height: 100%;
        cursor: pointer;
        color: #000000;
        opacity: 0;
        background-color: rgba(67, 66, 87, 0.535);
        transition: 0.3s;
        z-index: 9;
      }

      img {
        width: 100%;
        height: 100%;
      }
    }
  }

  .content {
    padding: 6px 12px;
    margin-top: 8px;
    border-radius: 5px 20px 20px 20px;
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



  &:hover {
    .user-info {
      .avater-wrapper {
        .edit {
          opacity: 1;
        }

        img {
          opacity: 0.5;
        }
      }
    }
  }
}

.self {
  align-items: flex-end;

  .user-info {
    flex-direction: row-reverse;
  }

  .content {
    border-radius: 20px 5px 20px 20px;
  }
}
</style>