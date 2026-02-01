<template>
    <el-dialog v-model="visible" title="助手配置" class="max-md:w-full" append-to-body @closed="handleClosed">
        <el-form v-if="assistant" :model="assistant" label-width="auto" label-position="left">
            <!-- 基本信息 -->
            <el-form-item label="名称">
                <el-input v-model="assistant.name" placeholder="为你的助手起个名字" />
            </el-form-item>

            <el-form-item label="表情符号">
                <el-input v-model="assistant.emoji" placeholder="🤖" maxlength="2" />
            </el-form-item>

            <el-form-item label="描述">
                <el-input v-model="assistant.description" type="textarea" :rows="2" placeholder="简单描述一下这个助手的用途" />
            </el-form-item>

            <!-- 模型配置 -->
            <el-form-item label="模型">
                <ModelSelect v-model="assistant.model" />
                <div v-if="assistant.model" class="text-xs text-gray-500 mt-1">
                  {{ assistant.model.name }} - {{ assistant.model.provider }}
                </div>
            </el-form-item>

            <!-- 系统提示词 -->
            <el-form-item label="系统提示词">
                <el-input v-model="assistant.prompt" type="textarea" :rows="4"
                    placeholder="定义助手的角色、行为和回复风格..." />
            </el-form-item>

            <!-- 标签 -->
            <el-form-item label="标签">
                <el-tag
                    v-for="tag in assistant.tags"
                    :key="tag"
                    closable
                    @close="removeTag(tag)"
                    class="mr-2 mb-2"
                >
                    {{ tag }}
                </el-tag>
                <el-input
                    v-if="inputVisible"
                    ref="inputRef"
                    v-model="inputValue"
                    class="w-20"
                    size="small"
                    @keyup.enter="handleInputConfirm"
                    @blur="handleInputConfirm"
                />
                <el-button v-else class="button-new-tag" size="small" @click="showInput">
                    + 新标签
                </el-button>
            </el-form-item>

            <!-- 高级配置 -->
            <el-collapse>
                <el-collapse-item title="模型参数" name="advanced">
                    <el-form-item label="温度 (Temperature)">
                        <el-slider v-model="assistant.settings.temperature" :min="0" :max="2" :step="0.1" show-input />
                        <div class="text-xs text-gray-500">控制回复的随机性，值越高越有创意</div>
                    </el-form-item>

                    <el-form-item label="最大输出长度">
                        <el-slider v-model="assistant.settings.max_tokens" :min="100" :max="8192" :step="100" show-input />
                        <div class="text-xs text-gray-500">限制单次回复的最大长度</div>
                    </el-form-item>

                    <el-form-item label="核采样 (Top-p)">
                        <el-slider v-model="assistant.settings.top_p" :min="0" :max="1" :step="0.01" show-input />
                        <div class="text-xs text-gray-500">控制词汇选择的多样性</div>
                    </el-form-item>

                    <el-form-item label="存在惩罚">
                        <el-slider v-model="assistant.settings.presence_penalty" :min="0" :max="2" :step="0.01" show-input />
                        <div class="text-xs text-gray-500">减少重复话题的倾向</div>
                    </el-form-item>

                    <el-form-item label="频率惩罚">
                        <el-slider v-model="assistant.settings.frequency_penalty" :min="0" :max="2" :step="0.01" show-input />
                        <div class="text-xs text-gray-500">减少重复词汇的倾向</div>
                    </el-form-item>
                </el-collapse-item>
            </el-collapse>
        </el-form>

        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="handleConfirm">确定</el-button>
        </template>
    </el-dialog>
</template>

<script setup>
import { ref, reactive, nextTick, defineExpose } from 'vue';
import { ElMessage } from 'element-plus';
import ModelSelect from './ModelSelect.vue';

const visible = ref(false);
const inputVisible = ref(false);
const inputValue = ref('');
const inputRef = ref(null);

// 直接操作的assistant对象
const assistant = ref(null);
let confirmCallback = () => { };

// 移除了不再需要的selectedModel计算属性

// 确保assistant有默认的settings对象
const ensureSettings = () => {
    if (!assistant.value?.settings) {
        assistant.value.settings = {
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 0.9,
            presence_penalty: 0,
            frequency_penalty: 0
        }
    }
};

// 标签管理
const removeTag = (tag) => {
    if (!assistant.value?.tags) return;
    const index = assistant.value.tags.indexOf(tag);
    if (index > -1) {
        assistant.value.tags.splice(index, 1);
    }
};

const showInput = () => {
    inputVisible.value = true;
    nextTick(() => {
        inputRef.value?.focus();
    });
};

const handleInputConfirm = () => {
    if (inputValue.value && assistant.value?.tags && !assistant.value.tags.includes(inputValue.value)) {
        assistant.value.tags.push(inputValue.value);
    }
    inputVisible.value = false;
    inputValue.value = '';
};

// 打开对话框
const open = (assistantData = {}, onConfirm = () => { }) => {
    // 直接使用传入的assistant数据，创建一个响应式副本
    assistant.value = reactive({
        // 默认值
        name: '',
        emoji: '🤖',
        description: '',
        prompt: '',
        model: null,
        tags: [],
        enableWebSearch: false,
        webSearchProviderId: '',
        settings: {
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 0.9,
            presence_penalty: 0,
            frequency_penalty: 0
        },
        // 覆盖传入的数据
        ...assistantData
    });

    // 确保settings对象存在
    ensureSettings();

    confirmCallback = onConfirm;
    visible.value = true;
};

// 确认配置
const handleConfirm = () => {
    if (!assistant.value) return;

    // 验证必填字段
    if (!assistant.value.name?.trim()) {
        ElMessage.warning('请输入助手名称');
        return;
    }

    if (!assistant.value.model) {
        ElMessage.warning('请选择模型');
        return;
    }

    // 清理数据
    assistant.value.name = assistant.value.name.trim();

    // 直接传递assistant对象
    confirmCallback(assistant.value);
    visible.value = false;
};

// 关闭对话框
const handleClosed = () => {
    // 重置输入状态
    inputVisible.value = false;
    inputValue.value = '';
};

defineExpose({
    open
});
</script>