<template>
    <el-card class="w-full max-w-4xl mx-auto">
        <div class="flex justify-between items-center">
            <h2 class="text-2xl font-bold mb-4">ChatGPT API 配置</h2>
            <div>
                <el-button type="primary" @click="addConfig">添加</el-button>
                <el-button type="success" class="ml-4" @click="saveConfigs">保存</el-button>
            </div>
        </div>
        <VueDraggable v-model="tempServerConfig" :animation="150" ghostClass="ghost" handle=".handle">
            <div v-for="(config, index) in tempServerConfig" :key="index"
                class="relative mb-6 border-4 hover:border-blue-500 rounded-xl">
                <el-form :model="config" label-width="120px" class="p-4 rounded-md relative">
                    <el-form-item label="类型">
                        <el-cascader v-model="config.vendor" :props="cascaderProps" :options="cascaderOptions"
                            placeholder="请选择模型" clearable @change="handleCascaderChange($event, index)" />
                    </el-form-item>
                    <el-form-item label="API URL">
                        <el-input v-model="config.host" placeholder="请输入API链接" @input="checkType"></el-input>
                    </el-form-item>
                    <el-form-item label="API Key">
                        <el-input v-model="config.key" placeholder="请输入API Key" show-password></el-input>
                    </el-form-item>
                    <el-button type="danger" @click="removeConfig(index)"
                        class="absolute left-0 top-0">删除</el-button>
                </el-form>
                <div class="handle w-9 h-9 absolute top-1/2 left-0 -translate-y-1/2 m-2 bg-white rounded-full cursor-move"></div>
            </div>
        </VueDraggable>

    </el-card>

</template>

<script setup>
import { ref, computed } from 'vue';
import { models } from '@/constants/model'
import { debounce } from '@/utils/commonUtils'
import useConfigStore from '@/stores/modules/config'
import { useToast } from 'vue-toast-notification';
import { VueDraggable } from 'vue-draggable-plus'

const configStore = useConfigStore();
const tempServerConfig = ref(JSON.parse(JSON.stringify(configStore.serverConfig)));


const cascaderProps = {
    multiple: true,
};

const cascaderOptions = computed(() => {
    return Object.keys(models).map(type => {
        return {
            value: type,
            label: type,
            children: models[type].map(model => ({
                value: model,
                label: model
            }))
        };
    });
});

const getEmptyConfig = () => {
    return {
        vendor: [],
        host: '',
        key: '',
    };
};


const addConfig = () => {
    tempServerConfig.value.push(getEmptyConfig());
};

const saveConfigs = () => {
    configStore.applyServerConfig(tempServerConfig.value)
    useToast().success('应用成功')
}
const removeConfig = (index) => {
    tempServerConfig.value.splice(index, 1);
};
const checkType = debounce((input) => {

}, 500)

const handleCascaderChange = (value, index) => {
    const type = value[value.length - 1][0]
    tempServerConfig.value[index].vendor = tempServerConfig.value[index].vendor.filter(model => model[0] === type)
};
</script>


<style scoped lang="less">
.ghost {
  opacity: 0.5;
  background-color: #5985ef;
}
</style>