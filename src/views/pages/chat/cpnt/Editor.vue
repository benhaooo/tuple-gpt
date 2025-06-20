<template>
    <div class="p-4 max-md:pb-0">
        <div class="flex justify-between mb-3">
            <div class="flex gap-4">
                <ExpandableButtom @click="sessionsStore.clearCtx()" text='清除上下文'>
                    <i class="iconfont text-xs">&#xe62e;</i>
                </ExpandableButtom>
                <el-tooltip content="上传图片" placement="top">
                    <form ref="formRef" class="relative cursor-pointer hover:bg-light-blue-base rounded px-1">
                        <i class="iconfont">&#xe601;</i>
                        <input type="file" @change="handleImgChange"
                            class="absolute w-full h-full top-0 left-0 opacity-0" />
                    </form>
                </el-tooltip>
                <el-tooltip content="选择模型" placement="top">
                    <div class="cursor-pointer hover:bg-light-blue-base rounded px-2 py-1 flex items-center relative" @click="openModelSelector" ref="atButtonRef">
                        <span class="font-bold text-sm">@</span>
                    </div>
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
                class="relative px-2 py-4 pb-0 rounded-xl bg-surface-light-primary dark:bg-surface-dark-primary border-2 transition-colors duration-500"
                :class="taFocused ? 'border-primary-500' : 'border-border-light-primary dark:border-border-dark-primary'">
                <div v-if="showOptimizedModal"
                    class="absolute flex flex-col bg-surface-light-elevated dark:bg-surface-dark-elevated w-full h-44 -top-48 left-0 shadow-medium rounded-md p-4 border border-border-light-primary dark:border-border-dark-primary">
                    <div class="flex justify-between">
                        <h3 class="font-extrabold">提示词优化:</h3>
                        <i @click="handleOptimizePrompt" :class="{ 'cursor-not-allowed': optimizing }"
                            class="iconfont font-extrabold cursor-pointer">&#xe616;</i>
                    </div>
                    <div class="flex-1">
                        <textarea class="w-full h-full resize-none" v-model="optimizedPrompt"></textarea>
                    </div>
                    <div class="flex flex-row-reverse">
                        <el-button @click="applyOptimize" :loading="optimizing" type="primary" class="ml-2">应用
                        </el-button>
                    </div>
                </div>
                <div class="flex flex-wrap gap-1 mb-2">
                    <ElTag v-for="(model, index) in selectedModels" :key="model" closable @close="removeSelectedModel(index)">
                        {{ useModel(model).model.name }}</ElTag>
                </div>
                <div class="relative mb-1">
                    <!-- 模型选择器组件 -->
                    <ModelSelector ref="modelSelectorRef" @select="handleSelectModel" />
                    
                    <div class="flex">
                        <textarea class="text-base bg-transparent text-text-light-primary dark:text-text-dark-primary w-full resize-none" v-model="text"
                            @input="handleInput" @keydown="handleKeyDown" placeholder="ctrl + 1~9/enter 发送"
                            @paste="handlePaste" @focus="taFocused = true" @blur="taFocused = false" ref="taRef"
                            rows="1"></textarea>
                        <div v-if="currentSession.type === 'auto' && currentSession.chatting"
                            class="relative w-10 h-8 flex justify-center items-center cursor-pointer" @click="stopAutoChat">
                            <img src="@/assets/icons/spinning-circle.svg" class="animate-spin w-6 h-6" alt="Loading" />
                            <span class="absolute text-sm font-bold">{{ currentSession.chatting }}</span>
                        </div>
                        <button v-else @click="handleSendMessage()"
                            :class="canSend ? 'bg-primary-600 hover:bg-primary-700' : 'bg-surface-light-tertiary dark:bg-surface-dark-tertiary'" :disabled="!canSend"
                            class="flex justify-center items-center w-10 h-8 rounded-lg">
                            <el-tooltip content="发送" placement="top" :show-after="500">
                                <i class="iconfont text-white">&#xe888;</i>
                            </el-tooltip>
                        </button>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <el-tooltip content="优化" placement="top">
                        <i @click="handleOptimizePrompt" :class="{ 'cursor-not-allowed': optimizing || !canSend }"
                            class="iconfont cursor-pointer font-extrabold text-text-light-secondary dark:text-text-dark-secondary hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">&#xe624;</i>
                    </el-tooltip>
                    <button @click="handleFormat('题目：新疆是中国面积最大的省级行政区，它的面积可以装下多少个北京？')"
                        :class="{ 'border-primary-500 border-2': activeFomat }"
                        class="text-xs bg-transparent border border-border-light-primary dark:border-border-dark-primary text-text-light-secondary dark:text-text-dark-secondary hover:border-primary-500 rounded-md flex transition-colors duration-200"><span
                            class="scale-75">JSON</span></button>
                    <button @click="empowerThink = !empowerThink"
                        :class="{ 'border-primary-500 border-2': empowerThink }"
                        class="text-xs bg-transparent border border-border-light-primary dark:border-border-dark-primary text-text-light-secondary dark:text-text-dark-secondary hover:border-primary-500 rounded-md flex transition-colors duration-200"><span
                            class="scale-75">🤔</span></button>
                </div>
            </div>
        </div>
    </div>
</template>


<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import ExpandableButtom from "@/views/cpnt/ExpandableBtn.vue";
import useSessionsStore from "@/stores/modules/chat";
import { storeToRefs } from 'pinia';
import { completions } from "@/apis";
import ModelSelector from '@/views/cpnt/ModelSelector.vue';
import { useModel } from "@/models/data"

const sessionsStore = useSessionsStore();
const { currentSession } = storeToRefs(sessionsStore);


const fileUrl = ref("");
const formRef = ref(null);
const text = ref("");
const optimizedPrompt = ref('')
const showOptimizedModal = ref(false)
const optimizing = ref(false)
const optimizeRef = ref(null)
const taRef = ref(null);
const canSend = computed(() => {
    return text.value.trim().length > 0 || currentSession.value.type === 'auto';
});
const taFocused = ref(false);
const activeFomat = ref('')
const empowerThink = ref(false)

const emits = defineEmits(["send"]);

// 选中的模型列表
const selectedModels = ref([])
const modelSelectorRef = ref(null)
const atIndex = ref(-1)
const cursorIndex = ref(-1)

const atButtonRef = ref(null);

const handleInput = (e) => {
    const input = e.target.value
    atIndex.value = input.lastIndexOf('@')
    cursorIndex.value = e.target.selectionStart

    if (atIndex.value > -1) {
        const betweenInput = input.substring(atIndex.value + 1, cursorIndex.value)
        // @前没有字符或者是空格，@到光标位置之间没有空格符
        const inAt = (atIndex.value === 0 || input.charAt(atIndex.value - 1) === ' ') && betweenInput.indexOf(' ') === -1
        if (inAt) {
            // 设置插入符号的位置
            nextTick(() => {
                // 传入文本框元素和'top'位置参数
                modelSelectorRef.value.open(betweenInput, taRef.value, 'top')
                
                // 移除@及后面的搜索文本
                const beforeAt = text.value.substring(0, atIndex.value);
                const afterSearch = text.value.substring(cursorIndex.value);
                text.value = beforeAt + afterSearch;
                // 重置索引
                atIndex.value = -1;
                cursorIndex.value = -1;
            })
        } else {
            modelSelectorRef.value.close()
        }
    } else {
        modelSelectorRef.value.close()
    }
}

// 选择模型
const handleSelectModel = (modelID) => {
    selectedModels.value.push(modelID)
    
    // 聚焦回文本框
    nextTick(() => {
        if (taRef.value) {
            taRef.value.focus();
        }
    });
}

// 移除选中的模型
const removeSelectedModel = (index) => {
    selectedModels.value.splice(index, 1)
}

// 打开模型选择器
const openModelSelector = () => {
    // 直接打开模型选择器，显示在按钮上方
    nextTick(() => {
        modelSelectorRef.value.open('', atButtonRef.value, 'top');
    });
};

const autoHeight = async () => {
    await nextTick()
    taRef.value.style.height = "auto";
    taRef.value.style.height = Math.min(taRef.value.scrollHeight, 240) + "px";
};

// 文本框高度自适应
watch(text, autoHeight)

const handleKeyDown = (e) => {
    if (e.ctrlKey) {
        // 只阻止我们要处理的特定快捷键，允许其他快捷键（如Ctrl+V）正常工作
        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            handleSendMessage(Number(e.key))
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleSendMessage()
        }
        // 不阻止其他Ctrl组合键，如Ctrl+V、Ctrl+C、Ctrl+A等
    }
}


// 发送消息
const handleSendMessage = async (num) => {
    if (currentSession.value.type === 'auto') {
        sessionsStore.sendNextMessage(text.value, num)
        text.value = "";
    } else {
        if (!text.value && selectedModels.value.length === 0) return;
        if (fileUrl.value) {
            sessionsStore.sendImgMessage(text.value, fileUrl.value, num)
            text.value = "";
            fileUrl.value = "";
            return
        }
        emits("send")
        sessionsStore.sendMessage(text.value, num, activeFomat.value, empowerThink.value, selectedModels.value).then(() => {
            // resetAndScrollToBottom()
        })

        text.value = "";
        fileUrl.value = "";
        activeFomat.value = ""
        selectedModels.value = []
    }
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

const handleFormat = (char) => {
    if (activeFomat.value === char) {
        activeFomat.value = ""
    } else {
        activeFomat.value = char
    }
}

// 停止自动聊天
const stopAutoChat = () => {
    if (currentSession.value.type === 'auto') {
        sessionsStore.stopAutoChat()
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