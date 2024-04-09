<template>
  <div class="message" :class="{ self: message.role == 'user' }">
    <div class="user-info" v-if="message.role == 'user'">
      <div class="avater-wrapper">
        <i class="iconfont center edit" @click="handleEditMessage(message)">&#xeabd;</i>
        <img :src="configStore.getAvatar" alt="" />
      </div>
      <span class="name">{{ userConfig.name }}</span>
    </div>
    <div class="user-info" v-else>
      <div class="avater-wrapper">
        <i class="iconfont center edit" @click="handleEditMessage(message)">&#xeabd;</i>
        <img src="@/assets/imgs/gpt.png" alt="" />
      </div>
      <span class="name">{{ model }} </span>
    </div>
    <div class="content text-sm" ref="contentRef">
      <div class="contentValue" v-html="parsedContent" ref="contentValueRef"></div>
      <div class="typer"></div>
      <div class="handle">
        <i class="iconfont delete" @click="handleDeleteMessage(message.id)">&#xec7b;</i>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, computed, ref, reactive, onMounted, onUpdated } from "vue";
import useUserStore from "@/stores/modules/user";
import useConfigStore from "@/stores/modules/config";
import { storeToRefs } from "pinia";
import { marked } from 'marked'

// const userStore = useUserStore();
const configStore = useConfigStore();
// const { userInfo } = storeToRefs(userStore);
const { userConfig } = storeToRefs(configStore)

const props = defineProps({
  message: Object,
});

const emits = defineEmits(["edit", "delete"]);
const handleEditMessage = (id) => {
  emits("edit", id);
};
const handleDeleteMessage = (id) => {
  emits("delete", id);
};
const parsedContent = computed(() => {
  return marked.parse(props.message.content)
})
const typer_position = reactive({ x: 0, y: 0 })
const contentValueRef = ref(null)
const contentRef = ref(null)

const updateCursor = () => {
  const lastTextNode = getLastTextNode(contentValueRef.value)
  const cursorText = document.createTextNode("\u200b")
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

    .name {
      color: #fff;
      margin: 0 10px;
    }
  }

  .content {
    padding: 6px 12px;
    margin-top: 8px;
    background-color: rgb(56, 60, 75);
    color: #fff;
    border-radius: 5px 20px 20px 20px;
    position: relative;

    .typer {
      position: absolute;
      content: "";
      width: 3px;
      height: 20px; //line-height
      background-color: orange;
      /* 右侧边框模拟打字效果 */
      animation: blink-caret 0.75s step-end infinite;
      // 动态渲染位置
      left: calc(v-bind('typer_position.x') * 1px);
      top: calc(v-bind('typer_position.y') * 1px);
    }


    .handle {
      position: absolute;
      right: 10px;
      bottom: -25px;
      opacity: 0;
      transition: 0.3s;

      .iconfont {
        font-size: 12px;
        cursor: pointer;
        color: #999999;
      }
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
    background-color: #1d90f5;
    border-radius: 20px 5px 20px 20px;
  }
}

/* 光标闪烁动画 */
@keyframes blink-caret {

  from,
  to {
    opacity: 0;
  }

  50% {
    opacity: 1;
  }
}
</style>