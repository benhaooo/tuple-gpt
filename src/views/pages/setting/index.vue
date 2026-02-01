<script setup>
import useConfigStore from '@/stores/modules/config'
import { storeToRefs } from 'pinia'
import Service from './service/index.vue'
import DefaultModel from './defaultModel/index.vue'
const configStore = useConfigStore()
const { userConfig, serverConfig, getModelConfig: modelConfig } = storeToRefs(configStore)

</script>

<template>

    <div class="p-10 max-w-4xl mx-auto">
        <el-tabs>
            <el-tab-pane label="用户">
                <el-form :model="userConfig" label-width="auto" label-position="left">
                    <el-form-item label="头像" placeholder="头像链接">
                        <el-input v-model="userConfig.avatar" />
                    </el-form-item>
                    <el-form-item label="昵称">
                        <el-input v-model="userConfig.name" />
                    </el-form-item>
                    <el-form-item label="描述">
                        <el-input v-model="userConfig.script" />
                    </el-form-item>
                    <el-form-item label="聊天记录">
                        <el-button class="relative overflow-hidden"><input @change="chatStore.importChat($event)"
                                class="absolute w-full h-full top-0 left-0 opacity-0" type="file"></input><i
                                class="iconfont mr-1">&#xe641;</i>导入</el-button>
                        <!-- <el-button @click="chatStore.exportChat"><i class="iconfont mr-1">&#xe65e;</i>导出</el-button>
                        <el-button @click="chatStore.clearChat"><i class="iconfont mr-1">&#xe672;</i>清空</el-button> -->
                    </el-form-item>
                    <el-form-item label="主题">
                        <el-radio-group v-model="userConfig.theme">
                            <el-radio value="light" border><i class="iconfont">&#xec8e;</i></el-radio>
                            <el-radio value="dark" border><i class="iconfont">&#xe72f;</i></el-radio>
                            <el-radio value="auto" border><i class="iconfont">&#xe629;</i></el-radio>
                        </el-radio-group>
                    </el-form-item>
                </el-form>
            </el-tab-pane>
            <el-tab-pane label="模型">
                <DefaultModel />
            </el-tab-pane>
            <el-tab-pane label="服务端">
                <Service />
            </el-tab-pane>
            <el-tab-pane label="关于">made by benhao</el-tab-pane>
        </el-tabs>
    </div>
</template>


<style lang="less" scoped>
:deep(.el-radio__input) {
    display: none;
}

:deep(.el-tabs__nav-scroll) {
    display: flex;
    justify-content: center;
}
</style>