<template>
    <div class="flex max-md:flex-col m-10">
        <el-form class="flex-1 mb-6" :model="analysisData">
            <el-form-item label="分析目标" :rules="[{ required: true, message: '请输入分析目标', trigger: 'blur' }]">
                <el-input v-model="analysisData.target" autosize type="textarea" placeholder="Please input" />
            </el-form-item>
            <el-form-item>
                <FileUpload ref="fileUploadRef" />
            </el-form-item>
            <el-form-item label="图表类型" :rules="[{ required: true, message: '请选择图表类型', trigger: 'change' }]">
                <el-select v-model="analysisData.select">
                    <el-option value="饼图">饼图</el-option>
                    <el-option value="柱状图">柱状图</el-option>
                </el-select>
            </el-form-item>
            <el-button type="primary" @click="processAnalysis">提交</el-button>
        </el-form>
        <div class="flex-1 ml-10">
            <div class="mb-5">
                <h2>数据图表：</h2>

                <div>请输入需要分析的数据</div>
                <div id="myChart" style="width: 350px;height:250px;"></div>
            </div>
            <div>
                <h2>数据结论：</h2>
                <p>{{ analysisResult ? analysisResult : "请输入需要分析的数据" }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, toRefs, onMounted } from 'vue'
import FileUpload from '../cpnt/FileUpload.vue';
import { analysisCompletions } from '@/apis/index'
import * as echarts from 'echarts';


const analysisData = reactive({
    target: '分析',
    select: ''
})
const analysisResult = ref('')
const fileUploadRef = ref(null)
onMounted(() => {
    onMounted(() => {
    });
})


async function processAnalysis() {
    const data = {
        'chartType': analysisData.select,
        'goal': {
            'role': 'user',
            'content': analysisData.target,
        },
        'filehash': fileUploadRef.value.filehash

    }
    analysisCompletions(data).then(async (res) => {
        const { data } = await res.json()
        const arr = data.result.split('【【【【【')
        let myChart = echarts.init(document.querySelector('#myChart'));
        myChart.setOption(JSON.parse(arr[1]))
        analysisResult.value = arr[2]
    })
}
</script>