<script setup>
import useConfigStore from '@/stores/modules/config'
import useChatStore from '@/stores/modules/chat'
import { storeToRefs } from 'pinia'
import Service from './service/index.vue'
const configStore = useConfigStore()
const chatStore = useChatStore()
const { userConfig, moduleConfig, serverConfig } = storeToRefs(configStore)
const modelConfig = configStore.getModelConfig

</script>

<template>

    <div class="p-10">
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
                        <el-button @click="chatStore.exportChat"><i class="iconfont mr-1">&#xe65e;</i>导出</el-button>
                        <el-button @click="chatStore.clearChat"><i class="iconfont mr-1">&#xe672;</i>清空</el-button>
                    </el-form-item>
                    <el-form-item label="主题">
                        <el-radio-group v-model="userConfig.theme">
                            <el-radio value="auto" border><i class="iconfont">&#xe629;</i></el-radio>
                            <el-radio value="light" border><i class="iconfont">&#xec8e;</i></el-radio>
                            <el-radio value="dark" border><i class="iconfont">&#xe72f;</i></el-radio>
                        </el-radio-group>
                    </el-form-item>
                </el-form>
            </el-tab-pane>
            <el-tab-pane label="模型">
                <el-form :model="moduleConfig" label-width="auto" label-position="left">
                    <el-form-item label="名称">
                        <el-input v-model="moduleConfig.name" />
                    </el-form-item>
                    <el-form-item label="模型">
                        <el-select ref="select" v-model="moduleConfig.model" style="width: 120px">
                            <el-option v-for="(value, key) in modelConfig" :key="value" :value="key">{{ key
                                }}</el-option>

                        </el-select>
                    </el-form-item>
                    <el-form-item label="上下文数量">
                        <el-slider v-model="moduleConfig.ctxLimit" :max="10" show-input />
                    </el-form-item>
                    <el-form-item label="回复长度">
                        <el-slider v-model="moduleConfig.maxTokens" :max="4096" show-input />
                    </el-form-item>
                    <el-row>
                        <el-col :span="5">
                            <el-form-item label="平均随机度">
                                <el-switch v-model="moduleConfig.randomTemperature" />
                            </el-form-item>
                        </el-col>
                        <el-col :span="19">
                            <el-form-item label="回复数">
                                <el-slider v-model="moduleConfig.replyCount" :min="1" :max="10" show-input />
                            </el-form-item>
                        </el-col>
                    </el-row>

                    <el-collapse>
                        <el-collapse-item title="高级配置" name="advanced">
                            <el-form-item label="随机性">
                                <el-slider v-model="moduleConfig.temperature" :max="1" :step="0.01" show-input />
                            </el-form-item>
                            <el-form-item label="核采样">
                                <el-slider v-model="moduleConfig.top_p" :max="1" :step="0.01" show-input />
                            </el-form-item>
                            <el-form-item label="话题新鲜度">
                                <el-slider v-model="moduleConfig.presence_penalty" :max="1" :step="0.01" show-input />
                            </el-form-item>
                            <el-form-item label="频率惩罚度">
                                <el-slider v-model="moduleConfig.frequency_penalty" :max="1" :step="0.01" show-input />
                            </el-form-item>
                        </el-collapse-item>
                    </el-collapse>
                </el-form>
            </el-tab-pane>
            <el-tab-pane label="服务端">
                <Service></Service>
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