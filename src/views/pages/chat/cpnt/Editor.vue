<template>
    <div class="p-4">
        <div class="flex justify-between mb-3">
            <div class="flex gap-4">
                <ExpandableButtom @click="sessionsStore.clearCtx()" :text="'清除上下文'">
                    <i class="iconfont text-xs">&#xe62e;</i>
                </ExpandableButtom>
                <form ref="formRef" class="relative cursor-pointer hover:bg-light-blue-base rounded px-1">
                    <i class="iconfont">&#xe601;</i>
                    <input type="file" @change="handleImgChange"
                        class="absolute w-full h-full top-0 left-0 opacity-0" />
                </form>
            </div>

            <!-- <el-tooltip content="剩余tokens" placement="top">
                <div class="text-xs rounded-full bg-[#E4F0FD] px-2 leading-5">
                    <i class="iconfont font-extrabold mr-2 text-green-400">&#xe8c5;</i><span
                        class="text-dark-blue-base cursor-pointer">{{ userStore.getSurplusQuota }}</span>
                </div>
            </el-tooltip> -->
        </div>
        <div>
            <div v-if="fileUrl" class="relative w-20 h-20 rounded-md">
                <img :src="fileUrl" alt="">
                <i class="iconfont absolute right-0 top-0 cursor-pointer hover:text-red-500"
                    @click="fileUrl = ''">&#xe630;</i>
            </div>
            <div ref="optimizeRef"
                class=" relative px-2 py-4 pb-0 rounded-xl bg-white border-2 transition-colors duration-500"
                :class="taFocused ? 'border-dark-blue-base' : 'border-light-border dark:border-dark-border'">
                <div v-if="showOptimizedModal"
                    class=" absolute flex flex-col bg-white w-full h-44 -top-48 left-0 shadow-md rounded-md p-4">
                    <div class="flex justify-between">
                        <h3 class=" font-extrabold">提示词优化:</h3>
                        <i @click="handleOptimizePrompt" :class="{ 'cursor-not-allowed': optimizing }"
                            class="iconfont font-extrabold cursor-pointer">&#xe616;</i>
                    </div>
                    <div class=" flex-1">
                        <textarea class=" w-full h-full resize-none" v-model="optimizedPrompt"></textarea>
                    </div>
                    <div class=" flex flex-row-reverse">
                        <el-button @click="applyOptimize" :loading="optimizing" type="primary" class=" ml-2">应用
                        </el-button>
                    </div>
                </div>

                <div class="flex">
                    <textarea class=" text-base dark:bg-dark-input-wrapper w-full  resize-none" v-model="text"
                        placeholder="ctrl + enter 发送" @keydown.ctrl.enter="handleSendMessage" @focus="taFocused = true"
                        @blur="taFocused = false" ref="taRef" rows="1"></textarea>
                    <div class="flex justify-end flex-col">
                        <el-tooltip content="发送" placement="top" :show-after="500">
                            <button class="text-xs w-10 h-8 rounded-lg border-0  transition-all duration-300 shadow "
                                :class="canSend ? 'bg-dark-blue-base' : 'bg-[#e5e5e5]'" :disabled="!canSend"
                                @click="handleSendMessage"><i class="iconfont text-white">&#xe888;</i></button>
                        </el-tooltip>
                    </div>
                </div>
                <div>
                    <i @click="handleOptimizePrompt" :class="{ 'cursor-not-allowed': optimizing || !canSend }"
                        class="iconfont cursor-pointer font-extrabold hover:text-dark-blue-base">&#xe624;</i>
                </div>

            </div>
        </div>
    </div>
</template>


<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import ExpandableButtom from "@/views/cpnt/ExpandableBtn.vue";
import useSessionsStore from "@/stores/modules/chat";
// import useAutoScrollToBottom from "@/hooks/scroll";
// const { resetAndScrollToBottom } = useAutoScrollToBottom(scrollRef)
import { completions } from "@/apis";
import useStream from '@/hooks/stream'


const sessionsStore = useSessionsStore();
const { streamController } = useStream()


const fileUrl = ref("");
const formRef = ref(null);
const text = ref("");
const optimizedPrompt = ref('')
const showOptimizedModal = ref(false)
const optimizing = ref(false)
const optimizeRef = ref(null)
const taRef = ref(null);
const canSend = computed(() => {
    return text.value.trim().length > 0;
});
const taFocused = ref(false);

const emits = defineEmits(["send"]);


// 文本框高度自适应
watch(text, () => autoHeight())
const autoHeight = async () => {
    await nextTick()
    taRef.value.style.height = "auto";
    taRef.value.style.height = Math.min(taRef.value.scrollHeight, 240) + "px";
};


// 发送消息
const handleSendMessage = async () => {
    if (!text.value) return;
    if (fileUrl.value) {
        sessionsStore.sendImgMessage(text.value, fileUrl.value)
        text.value = "";
        fileUrl.value = "";
        return
    }
    emits("send")
    sessionsStore.sendMessage(text.value).then(() => {
        // resetAndScrollToBottom()

    })

    text.value = "";
    fileUrl.value = "";

    //可能watch那没更新来
    nextTick(() => autoHeight());
};

const handleImgChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        fileUrl.value = reader.result;
        formRef.value.reset()
    };
    reader.readAsDataURL(file);
}
const OptimizeSystemPrompt = `# 角色
你是一名专业且资深的 AI 提示词优化专家，能够精准且高效地为用户提供的提示词进行优化。

## 技能
### 技能 1: 分析原始提示词
1. 仔细剖析用户输入的提示词的核心意图和关键要素。
2. 准确识别提示词中的模糊、歧义或不完整之处。

### 技能 2: 优化提示词
1. 运用丰富的语言知识和逻辑思维，对提示词进行清晰、准确、完整的优化。
2. 确保优化后的提示词更具针对性、明确性和可操作性。

## 限制:
- 仅专注于对提示词的优化工作，不涉及其他无关任务。
- 严格遵循优化的原则和要求，不随意偏离既定方向。
- 输出内容必须符合规范和格式，清晰明了。
### 输出格式：
- 只输出优化后的结果，禁止输出优化结果以外额外的解释和内容。
`
const listenClick = (e) => {
    e.stopPropagation()
    const isClickInsideElement = optimizeRef.value.contains(e.target)
    if (!isClickInsideElement) {
        showOptimizedModal.value = false
    }
}

const handleOptimizePrompt = async () => {
    if (optimizing.value || !canSend.value) return
    //防止冒泡直接触发
    setTimeout(() => {
        document.addEventListener('click', listenClick)
    }, 0)
    optimizedPrompt.value = ''
    showOptimizedModal.value = true
    const data = {
        messages: [
            {
                role: "system",
                content: OptimizeSystemPrompt
            }, {
                role: "user",
                content: `优化内容提示词：${text.value}`
            }
        ],
        stream: true,
    }
    optimizing.value = true
    const response = await completions(data, "0125-preview")
    streamController(response, (res) => {
        optimizedPrompt.value += res
    }).then(() => {
        optimizing.value = false
    })
}
const applyOptimize = () => {
    text.value = optimizedPrompt.value
    showOptimizedModal.value = false
}

//优化面板关闭
watch(showOptimizedModal, () => {
    if (!showOptimizedModal.value) {
        optimizedPrompt.value = ''
        document.removeEventListener('click', listenClick)
    }
})



</script>