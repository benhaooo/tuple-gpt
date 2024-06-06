<script setup>
import { ref } from 'vue'
import { UploadFilled } from '@element-plus/icons-vue'
import SparkMD5 from 'spark-md5'
import { uploadFile } from '@/apis'

const drag_over = ref(false)
const file = ref(null)
const filehash = ref(null)

defineExpose({
    filehash
})
const handleFileChange = async (e) => {
    file.value = e.target.files[0]
    const chunks = createChunks(file.value, 1024)
    filehash.value = await hash(chunks)

    const formData = new FormData()
    formData.append('file', file.value)
    formData.append('hash', filehash.value)

    uploadFile(formData).then(res => {
        console.log("上传成功")
    })
}
const handleFileDrop = (e) => {
    file.value = e.dataTransfer.files[0]
}
// 文件切片
const createChunks = (file, chunkSize) => {
    const res = []
    for (let i = 0; i < file.size; i += chunkSize) {
        res.push(file.slice(i, i + chunkSize))
    }
    return res
}

// 计算文件hash值
const hash = (chunks) => {
    return new Promise(resolve => {
        const spark = new SparkMD5()
        function _read(i) {
            if (i >= chunks.length) {
                resolve(spark.end())
                return
            }
            const blob = chunks[i]
            const reader = new FileReader()
            reader.onload = (e) => {

                //增量hash
                spark.append(e.target.result)
                _read(i + 1)
            }
            reader.readAsArrayBuffer(blob)
        }
        _read(0)//递归
    })
}
const clearFile=()=>{
    file.value=null
    filehash.value=null
}
</script>

<template>
    <div @dragenter.prevent="drag_over = true" @dragleave.prevent="drag_over = false" @dragover.prevent
        @drop.prevent="handleFileDrop"
        :class="drag_over ? ['border-drag-over-border-color', 'bg-drag-over-bg-color'] : 'border-light-border'"
        class="relative flex justify-center items-center border-2 border-dashed  text-xl cursor-pointer transition-colors duration-300 w-full h-44">

        <input @change="handleFileChange" type="file"
            class="absolute w-full h-full opacity-0 top-0 left-0 cursor-pointer" />
        <div v-if="file" class="w-20 h-20 rounded overflow-hidden relative">
            <img src="@/assets/imgs/excel.png" alt="" class="w-full h-full">
            <i class="iconfont absolute right-0 top-0" @click="clearFile">&#xe630;</i>
        </div>

        <div v-else class="flex flex-col items-center">
            <el-icon :size="66"><upload-filled /></el-icon>
            Drop file here or <em>click to upload</em>
        </div>
        
    </div>
</template>
