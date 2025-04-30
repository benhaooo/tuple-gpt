<template>
    <el-dialog v-model="visible" title="会话配置" class="max-md:w-full" append-to-body @closed="handleClosed">
        <el-form :model="configForm" label-width="auto" label-position="left">
            <el-form-item label="名称">
                <el-input v-model="configForm.name" />
            </el-form-item>
            <el-form-item label="模型">
                <ModelSelect v-model="configForm.model" />
            </el-form-item>
            <el-form-item label="上下文数量">
                <el-slider v-model="configForm.ctxLimit" :max="50" show-input />
            </el-form-item>
            <el-form-item label="回复长度">
                <el-slider v-model="configForm.maxTokens" :max="4096" show-input />
            </el-form-item>
            <el-form-item label="回复数">
                <el-slider v-model="configForm.replyCount" :min="1" :max="10" show-input />
            </el-form-item>

            <el-form-item label="角色设定">
                <el-input v-model="configForm.system" type="textarea" :rows="4" placeholder="给你的会话任命一个专属角色设定吧~" />
            </el-form-item>
            <el-form-item label="消息格式">
                <el-input v-model="configForm.format" type="textarea" :autosize="{ minRows: 1, maxRows: 4 }"
                    placeholder="${text}" />
            </el-form-item>
            <el-collapse>
                <el-collapse-item title="高级配置" name="advanced">
                    <el-form-item label="随机性">
                        <el-slider v-model="configForm.temperature" :max="10" :step="0.1" show-input />
                    </el-form-item>
                    <el-form-item label="核采样">
                        <el-slider v-model="configForm.top_p" :max="1" :step="0.01" show-input />
                    </el-form-item>
                    <el-form-item label="话题新鲜度">
                        <el-slider v-model="configForm.presence_penalty" :max="1" :step="0.01" show-input />
                    </el-form-item>
                    <el-form-item label="频率惩罚度">
                        <el-slider v-model="configForm.frequency_penalty" :max="1" :step="0.01" show-input />
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
import { ref, reactive, defineExpose } from 'vue';
import ModelSelect from './ModelSelect.vue';

const visible = ref(false);
const configForm = reactive({});
let originalConfig = null;
let confirmCallback = () => { };

// 打开
const open = (config = {}, onConfirm = () => { }) => {
    Object.keys(configForm).forEach(key => delete configForm[key]);
    originalConfig = config;
    Object.assign(configForm, config);
    confirmCallback = onConfirm;
    visible.value = true;
};

// 确认
const handleConfirm = () => {
    if (originalConfig) {
        Object.keys(configForm).forEach(key => {
            originalConfig[key] = configForm[key];
        });
    }
    confirmCallback({ ...configForm });
    visible.value = false;
};

// 关闭
const handleClosed = () => {

};

defineExpose({
    open
});
</script>