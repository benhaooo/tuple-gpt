<template>
    <div class="flex flex-wrap m-10">
        <el-form class="flex-1" :model="analysisData" @submit.prevent="submitForm">
            <el-form-item label="分析目标" :rules="[{ required: true, message: '请输入分析目标', trigger: 'blur' }]">
                <el-input v-model="analysisData.target" autosize type="textarea" placeholder="Please input" />
            </el-form-item>
            <el-form-item>
                <div
                    class="relative flex flex-col items-center border-2 border-dashed border-gray-500 text-xl cursor-pointer transition-colors duration-300 w-full h-44">
                    <input type="file" class="absolute w-full h-full opacity-0 top-0 left-0 cursor-pointer" /><el-icon
                        class="my-auto" :size="66"><upload-filled /></el-icon>
                    Drop file here or <em>click to upload</em>
                </div>

            </el-form-item>
            <el-form-item label="图表类型" :rules="[{ required: true, message: '请选择图表类型', trigger: 'change' }]">
                <el-select v-model="analysisData.select">
                    <el-option value="饼图">饼图</el-option>
                    <el-option value="柱状图">柱状图</el-option>
                </el-select>
            </el-form-item>
            <el-button type="primary" @click="submitForm">提交</el-button>
        </el-form>
        <div class="flex-1 ml-10">
            <div class="mb-5">
                <h2>数据图表：</h2>
                <div>请输入需要分析的数据</div>
            </div>
            <div>
                <h2>数据结论：</h2>
                <p>请输入需要分析的数据</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, toRefs } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'


const analysisData = reactive({
    target: '',
    file: '',
    select: ''
})
const uploadRef = ref(null)
const handleStart = (file) => {
    console.log("🚀 ~ handleStart ~ file:", file)

}
function submitForm() {
    console.log("🚀 ~ submitForm ~ uploadRef:", uploadRef)

    // const isValid = Object.values(toRefs(analysisData)).every((val) => val.value)
    // if (!isValid) {
    //     alert('请填写完整的信息')
    //     return
    // }
    // 提交表单逻辑...
}
</script>