<template>
    <div class="p-4 max-md:pb-0">
        <div class="flex justify-between mb-3">
            <div class="flex gap-4">
                <ExpandableButtom @click="sessionsStore.clearCtx()" :text="'清除上下文'">
                    <i class="iconfont text-xs">&#xe62e;</i>
                </ExpandableButtom>
                <el-tooltip content="上传图片" placement="top">
                    <form ref="formRef" class="relative cursor-pointer hover:bg-light-blue-base rounded px-1">
                        <i class="iconfont">&#xe601;</i>
                        <input type="file" @change="handleImgChange"
                            class="absolute w-full h-full top-0 left-0 opacity-0" />
                    </form>
                </el-tooltip>
            </div>
        </div>
        <div>
            <div v-if="fileUrl" class="relative w-20 h-20 rounded-md">
                <img :src="fileUrl" alt="">
                <i class="iconfont absolute right-0 top-0 cursor-pointer hover:text-red-500"
                    @click="fileUrl = ''">&#xe630;</i>
            </div>
            <div ref="optimizeRef"
                class=" relative px-2 py-4 pb-0 rounded-xl bg-white dark:bg-dark-base border-2 transition-colors duration-500"
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
                    <textarea class=" text-base dark:bg-dark-base w-full  resize-none" v-model="text"
                        @keydown="handleKeyDown" placeholder="ctrl + 1~9/enter 发送" @paste="handlePaste"
                        @focus="taFocused = true" @blur="taFocused = false" ref="taRef" rows="1"></textarea>
                    <div class="flex justify-end flex-col">
                        <el-tooltip content="发送" placement="top" :show-after="500">
                            <button class="text-xs w-10 h-8 rounded-lg border-0  transition-all duration-300 shadow "
                                :class="canSend ? 'bg-dark-blue-base' : 'bg-[#e5e5e5]'" :disabled="!canSend"
                                @click="handleSendMessage()"><i class="iconfont text-white">&#xe888;</i></button>
                        </el-tooltip>
                    </div>
                </div>
                <div>
                    <el-tooltip content="优化" placement="top">

                        <i @click="handleOptimizePrompt" :class="{ 'cursor-not-allowed': optimizing || !canSend }"
                            class="iconfont cursor-pointer font-extrabold hover:text-dark-blue-base">&#xe624;</i>
                    </el-tooltip>
                </div>

            </div>
        </div>
    </div>
</template>


<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import ExpandableButtom from "@/views/cpnt/ExpandableBtn.vue";
import useSessionsStore from "@/stores/modules/chat";
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
const handleKeyDown = (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        if (e.key >= '0' && e.key <= '9') {
            handleSendMessage(Number(e.key))
        } else if (e.key === 'Enter') {
            handleSendMessage()
        }
    }

}

// 发送消息
const handleSendMessage = async (num) => {
    if (!text.value) return;
    if (fileUrl.value) {
        sessionsStore.sendImgMessage(text.value, fileUrl.value, num)
        text.value = "";
        fileUrl.value = "";
        return
    }
    emits("send")
    sessionsStore.sendMessage(text.value, num).then(() => {
        // resetAndScrollToBottom()
    })

    text.value = "";
    fileUrl.value = "";

    //可能watch那没更新来
    nextTick(() => autoHeight());
};

// 加载图片
const appendImg = (file) => {
    const reader = new FileReader();
    reader.onload = function () {
        fileUrl.value = reader.result;
    };
    reader.readAsDataURL(file);
}
//  粘贴图片
const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
            const blob = items[i].getAsFile();
            appendImg(blob)
        }
    }
}
// 选择图片
const handleImgChange = (e) => {
    const file = e.target.files[0];
    appendImg(file)
}
const listenClick = (e) => {
    e.stopPropagation()
    const isClickInsideElement = optimizeRef.value.contains(e.target)
    if (!isClickInsideElement) {
        showOptimizedModal.value = false
    }
}
const dataPicker = (json, onMessage) => {
    const { content, sessionId } = json
    if (content) onMessage(content)
    else if (sessionId) localStorage.setItem('optimizeSessionId', sessionId)
};
const OptimizeSystemPrompt = `提示词工程(Prompt Engineering)是指对与大型语言模型(LLM)交互的提示词进行设计、优化和应用,以发挥模型最大效果的一系列方法与实践。其主要目的是根据不同的使用场景和要求,为LLM生成理想的、引导性强的提示词。
我想让你成为我的提示词写作助理。你的目标是帮助我为我的需求创建尽可能好的提示词，这将被 LLM 模型使用。
您将遵循以下过程：
1、按照下面的步骤，通过不断迭代改进我的提示词。

2、根据我的输入（我给你的提示词），你将生成 3 个部分：
（1）提示词的可能答案。（假设你是一个人工智能语言模型）
（2）修改提示词（改写我给你的输入/提示，使其清晰、具体、易于理解。）。
（3）问题（提出相关问题，从我那里收集更多信息，以确保提示满足我的需求）。

3、我们将继续这个迭代过程，我将向您提供更多信息，您将更新 3 个部分，直到我说我们完成为止。

4、结果以 Markdown 格式输出。`
const handleOptimizePrompt = async () => {
    if (optimizing.value || !canSend.value) return
    //防止冒泡直接触发
    setTimeout(() => {
        document.addEventListener('click', listenClick)
    }, 0)
    optimizedPrompt.value = ''
    showOptimizedModal.value = true
    optimizing.value = true
    const data = {
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: OptimizeSystemPrompt
            },
            {
                role: "user",
                content: text.value
            }
        ],
    }
    const response = await completions(data, "gpt-3.5-turbo")
    response.json().then(({ choices }) => {
        const res = choices[0].message.content
        optimizedPrompt.value += res
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