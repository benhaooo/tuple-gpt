<template>
    <div class="p-4 max-md:pb-0">
        <div class="flex justify-between mb-3">
            <div class="flex gap-4">
                <el-tooltip content="上传文件" placement="top">
                    <form ref="formRef" class="relative cursor-pointer hover:bg-light-blue-base rounded px-1">
                        <i class="iconfont">&#xe601;</i>
                        <input type="file" @change="handleFileChange" multiple
                            accept="image/*,audio/*,.mp3,.wav,.ogg,.m4a,.aac,.png,.jpg,.jpeg,.gif,.webp,.svg"
                            class="absolute w-full h-full top-0 left-0 opacity-0" />
                    </form>
                </el-tooltip>
                <el-tooltip content="选择模型" placement="top">
                    <div class="cursor-pointer hover:bg-light-blue-base rounded px-2 py-1 flex items-center relative" @click="openModelSelector" ref="atButtonRef">
                        <span class="font-bold text-sm">@</span>
                    </div>
                </el-tooltip>
            </div>
            <div v-if="uploadedFiles.length > 0" class="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                已选择 {{ uploadedFiles.length }} 个文件
            </div>
        </div>
        <div>

            <!-- 文件预览列表 -->
            <div v-if="uploadedFiles.length > 0" class="mb-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div v-for="(file, index) in uploadedFiles" :key="file.id"
                         class="relative bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg p-3 border border-border-light-primary dark:border-border-dark-primary">
                        <!-- 文件预览 -->
                        <div class="flex items-center gap-3">
                            <!-- 图片预览 -->
                            <div v-if="file.type === 'image'" class="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                <img :src="file.preview" :alt="file.name" class="w-full h-full object-cover">
                            </div>
                            <!-- 音频文件图标 -->
                            <div v-else-if="file.type === 'audio'" class="w-12 h-12 rounded-md bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                                <i class="iconfont text-primary-600 dark:text-primary-400 text-xl">&#xe6a7;</i>
                            </div>

                            <!-- 文件信息 -->
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate" :title="file.name">
                                    {{ file.name }}
                                </p>
                                <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                                    {{ formatFileSize(file.size) }} • {{ file.format.toUpperCase() }}
                                </p>
                            </div>
                        </div>

                        <!-- 删除按钮 -->
                        <button @click="removeFile(index)"
                                class="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors duration-200">
                            <i class="iconfont text-xs">&#xe630;</i>
                        </button>
                    </div>
                </div>
            </div>
            <div ref="optimizeRef"
                class="relative px-2 py-4 pb-0 rounded-xl bg-surface-light-primary dark:bg-surface-dark-primary border-2 transition-colors duration-500"
                :class="[
                    taFocused ? 'border-primary-500' : 'border-border-light-primary dark:border-border-dark-primary',
                    isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : ''
                ]"
                @drop="handleDrop"
                @dragover="handleDragOver"
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                >

                <!-- 拖拽提示层 - 覆盖整个容器区域 -->
                <div v-if="isDragging"
                     class="absolute inset-0 bg-primary-50 dark:bg-primary-950 bg-opacity-90 dark:bg-opacity-90 rounded-xl border-2 border-dashed border-primary-500 flex items-center justify-center z-50 pointer-events-none">
                    <div class="text-center">
                        <i class="iconfont text-3xl text-primary-600 dark:text-primary-400 mb-3">&#xe601;</i>
                        <p class="text-base font-medium text-primary-600 dark:text-primary-400">
                            释放以上传文件
                        </p>
                        <p class="text-sm text-primary-500 dark:text-primary-500 mt-2">
                            支持图片和音频文件
                        </p>
                    </div>
                </div>
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
                    <ElTag v-for="(model, index) in selectedModels" :key="model.id" closable @close="removeSelectedModel(index)">
                        {{ model.name }}
                    </ElTag>
                </div>
                <div class="relative mb-1">
                    <!-- 模型选择器组件 -->
                    <ModelSelector ref="modelSelectorRef" @select="handleSelectModel" />

                    <div class="flex">
                        <textarea class="text-base bg-transparent text-text-light-primary dark:text-text-dark-primary w-full resize-none" v-model="text"
                            @input="handleInput" @keydown="handleKeyDown" placeholder="按 Enter 发送, Shift + Enter 换行, Ctrl + 数字(1-9) 发送多个回复"
                            @paste="handlePaste" @focus="taFocused = true" @blur="taFocused = false" ref="taRef"
                            rows="1"></textarea>

                        <button @click="handleSendMessage()"
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
import { storeToRefs } from 'pinia';
import { useAssistantsStore } from '@/stores/modules/assistants';
import ModelSelector from '@/views/cpnt/ModelSelector.vue';
import { useLlmStore } from '@/stores/modules/llm';

const assistantsStore = useAssistantsStore();
const llmStore = useLlmStore();
const { currentAssistant } = storeToRefs(assistantsStore);

const fileUrl = ref(""); // 保留向后兼容性
const formRef = ref(null);
const text = ref("");
const optimizedPrompt = ref('')
const showOptimizedModal = ref(false)
const optimizing = ref(false)
const optimizeRef = ref(null)
const taRef = ref(null);

// 多文件上传相关状态
const uploadedFiles = ref([]);
const isDragging = ref(false);
const fileIdCounter = ref(0);

const canSend = computed(() => {
    return text.value.trim().length > 0 || uploadedFiles.value.length > 0 || fileUrl.value;
});
const taFocused = ref(false);
const activeFomat = ref('')
const empowerThink = ref(false)

// 支持的文件类型
const SUPPORTED_IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const SUPPORTED_AUDIO_TYPES = ['mp4', 'mp3', 'wav', 'ogg', 'm4a', 'aac'];
const SUPPORTED_FILE_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_AUDIO_TYPES];

const emits = defineEmits(["send"]);

// 选中的模型列表 (用于@功能)
const selectedModels = ref([]);
const modelSelectorRef = ref(null);
const atIndex = ref(-1);
const cursorIndex = ref(-1);
const atButtonRef = ref(null);

const handleInput = (e) => {
    const input = e.target.value;
    atIndex.value = input.lastIndexOf('@');
    cursorIndex.value = e.target.selectionStart;

    if (atIndex.value > -1) {
        const betweenInput = input.substring(atIndex.value + 1, cursorIndex.value);
        const inAt = (atIndex.value === 0 || /\s/.test(input.charAt(atIndex.value - 1))) && !/\s/.test(betweenInput);
        if (inAt) {
            nextTick(() => {
                const search = text.value.substring(atIndex.value + 1, cursorIndex.value);
                modelSelectorRef.value.open(search, taRef.value, 'top');
            });
        } else {
            modelSelectorRef.value.close();
        }
    } else {
        modelSelectorRef.value.close();
    }
};

// 选择模型
const handleSelectModel = (modelId) => {
    const model = llmStore.findModelById(modelId);
    if (model && !selectedModels.value.some(m => m.id === model.id)) {
        selectedModels.value.push(model);
    }
    
    // 移除@及后面的搜索文本
    if (atIndex.value !== -1) {
        const beforeAt = text.value.substring(0, atIndex.value);
        const afterSearch = text.value.substring(cursorIndex.value);
        text.value = beforeAt + afterSearch;
    }
    
    atIndex.value = -1;
    cursorIndex.value = -1;
    modelSelectorRef.value.close();
    
    nextTick(() => taRef.value?.focus());
};

// 移除选中的模型
const removeSelectedModel = (index) => {
    selectedModels.value.splice(index, 1);
};

// 打开模型选择器
const openModelSelector = () => {
    nextTick(() => {
        modelSelectorRef.value.open('', atButtonRef.value, 'top');
    });
};

const autoHeight = async () => {
    await nextTick();
    if (taRef.value) {
        taRef.value.style.height = "auto";
        taRef.value.style.height = Math.min(taRef.value.scrollHeight, 240) + "px";
    }
};

watch(text, autoHeight);

const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }

    // Ctrl+数字(1-9) 快捷发送多个回复
    if (e.ctrlKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const replyCount = parseInt(e.key);
        handleShortcutSend(replyCount);
    }
};

// 发送消息
const handleSendMessage = () => {
    if (!canSend.value) return;

    emits("send", {
        content: text.value,
        files: uploadedFiles.value,
        mentionedModels: selectedModels.value
    });

    // 清空输入
    text.value = "";
    uploadedFiles.value = [];
    selectedModels.value = [];

    nextTick(() => autoHeight());
};

// Ctrl+数字快捷发送多个回复
const handleShortcutSend = (replyCount) => {
    if (!canSend.value) return;

    // 获取当前助手的默认模型
    const defaultModel = currentAssistant.value?.model;
    // 创建N个相同模型的数组
    const models = Array(replyCount).fill(defaultModel);

    // 设置选中的模型并发送消息
    selectedModels.value = models;
    handleSendMessage();
};

// 加载图片
const appendImg = (file) => {
    const reader = new FileReader();
    reader.onload = function () {
        fileUrl.value = reader.result;
    };
    reader.readAsDataURL(file);
};

//  粘贴文件处理
const handlePaste = async (e) => {
    const items = e.clipboardData.items;
    const files = [];

    for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
            const file = items[i].getAsFile();
            if (file) {
                files.push(file);
            }
        }
    }

    if (files.length > 0) {
        await addFiles(files);
    }
};

// 多文件处理函数
const getFileType = (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (SUPPORTED_IMAGE_TYPES.includes(extension)) {
        return 'image';
    } else if (SUPPORTED_AUDIO_TYPES.includes(extension)) {
        return 'audio';
    }
    return 'unknown';
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const createFileObject = async (file) => {
    const fileType = getFileType(file);
    const extension = file.name.split('.').pop()?.toLowerCase() || '';

    const fileObj = {
        id: ++fileIdCounter.value,
        name: file.name,
        size: file.size,
        type: fileType,
        format: extension,
        file: file,
        preview: null,
        data: null // 将存储Base64数据
    };

    // 为图片生成预览
    if (fileType === 'image') {
        fileObj.preview = await createImagePreview(file);
        fileObj.data = fileObj.preview; // 图片直接使用preview作为data
    } else if (fileType === 'audio') {
        // 音频文件转换为Base64
        fileObj.data = await fileToBase64(file);
    }

    return fileObj;
};

const createImagePreview = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
};

const fileToBase64 = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
};

const addFiles = async (files) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
        const fileType = getFileType(file);

        // 检查文件类型是否支持
        if (fileType === 'unknown') {
            console.warn(`不支持的文件类型: ${file.name}`);
            continue;
        }

        // 检查文件大小 (限制为10MB)
        if (file.size > 10 * 1024 * 1024) {
            console.warn(`文件过大: ${file.name}`);
            continue;
        }

        // 检查是否已经添加过相同的文件
        const isDuplicate = uploadedFiles.value.some(f =>
            f.name === file.name && f.size === file.size
        );

        if (!isDuplicate) {
            const fileObj = await createFileObject(file);
            uploadedFiles.value.push(fileObj);
        }
    }
};

const removeFile = (index) => {
    uploadedFiles.value.splice(index, 1);
};

// 文件选择处理
const handleFileChange = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
        await addFiles(files);
    }
    // 清空input以允许重复选择相同文件
    e.target.value = '';
};

// 拖拽处理 - 优化为文本输入框使用
const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 检查是否包含文件
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'copy';
    }
};

const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当拖拽的是文件时才显示视觉反馈
    if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        isDragging.value = true;
    }
};

const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当真正离开容器时才清除拖拽状态
    // 使用 relatedTarget 来判断是否离开了容器
    if (!e.currentTarget.contains(e.relatedTarget)) {
        isDragging.value = false;
    }
};

const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.value = false;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
        await addFiles(files);
    }
};

// 选择图片 (保留向后兼容性)
const handleImgChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        appendImg(file);
    }
};

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

const handleOptimizePrompt = async () => {
    if (optimizing.value || !canSend.value) return
    //防止冒泡直接触发
    setTimeout(() => {
        document.addEventListener('click', listenClick)
    }, 0)
    optimizedPrompt.value = ''
    showOptimizedModal.value = true
    optimizing.value = true

    // 简化的优化提示词系统消息
    const optimizeSystemPrompt = `你是一个专业的提示词优化助手。请帮助用户优化他们的提示词，使其更加清晰、具体、有效。
优化原则：
1. 保持原意不变
2. 使语言更加清晰准确
3. 添加必要的上下文信息
4. 使指令更加具体
5. 保持简洁性

请直接输出优化后的提示词，不需要额外说明。`;

    try {
        // 这里应该调用实际的API，暂时用模拟数据
        setTimeout(() => {
            optimizedPrompt.value = `优化后的提示词：${text.value}

请提供更详细和具体的回答，包含相关的背景信息和实例说明。`;
            optimizing.value = false;
        }, 1000);
    } catch (error) {
        console.error('优化提示词失败:', error);
        optimizing.value = false;
    }
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