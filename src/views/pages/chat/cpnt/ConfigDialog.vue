<template>
    <el-dialog v-model="showConfigModal" title="会话配置" class="max-md:w-full" append-to-body>
        <el-form :model="configForm" label-width="auto" label-position="left">
            <el-form-item label="名称">
                <el-input v-model="configForm.name" />
            </el-form-item>
            <el-form-item label="模型">
                <el-select ref="select" v-model="configForm.model">
                    <el-option v-for="(value, key) in modelConfig" :value="key" :key="value">{{ key }}</el-option>
                </el-select>
            </el-form-item>
            <el-form-item label="上下文数量">
                <el-slider v-model="configForm.ctxLimit" :max="50" show-input />
            </el-form-item>
            <el-form-item label="回复长度">
                <el-slider v-model="configForm.maxTokens" :max="4096" show-input />
            </el-form-item>
            <el-row>
                <el-col :span="5">
                    <el-form-item label="平均随机度">
                        <el-switch v-model="configForm.randomTemperature" />
                    </el-form-item>
                </el-col>
                <el-col :span="19">
                    <el-form-item label="回复数">
                        <el-slider v-model="configForm.replyCount" :min="1" :max="10" show-input />
                    </el-form-item>
                </el-col>
            </el-row>

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
                        <el-slider v-model="configForm.temperature" :max="1" :step="0.01" show-input />
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
            <el-button @click="showConfigModal = false">取消</el-button>
            <el-button type="primary" @click="handelOkConfig">确定</el-button>
        </template>
    </el-dialog>
    <div v-if="modelValue"
        class="font-black bg-light-hard dark:bg-dark-hard-dark rounded-b-md py-1 px-4 cursor-pointer z-10 hover:text-blue-500 shadow-md"
        @click="handelShowConfig">
        {{ modelValue.model }}
    </div>
</template>


<script setup>
import { ref, computed } from 'vue'
import useConfigStore from '@/stores/modules/config'
const configStore = useConfigStore()
const modelConfig = computed(() => configStore.getModelConfig)


const props = defineProps({
    modelValue: Object,
})
const configForm = ref({})
const showConfigModal = ref(false)

const emits = defineEmits(['update:modelValue'])

const handelShowConfig = () => {
    configForm.value = JSON.parse(JSON.stringify(props.modelValue));
    showConfigModal.value = true;
};
const handelOkConfig = () => {
    emits('update:modelValue', configForm.value);
    showConfigModal.value = false;
}
</script>
