<template>
    <div class="transition-colors duration-300">
        <div class="max-w-4xl mx-auto">
            <h1 class="text-3xl font-bold mb-8 text-gray-800 dark:text-gray-200">模型配置</h1>

            <div class="grid gap-6 md:grid-cols-2">
                <div v-for="defaultModel in modelConfig" :key="defaultModel.id"
                    class="p-6 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
                    <div class="flex flex-col h-full">
                        <div class="flex-1">

                            <div class="flex items-center  mb-2">
                                <component :is="defaultModel.icon" class="w-8 h-8 mr-4 text-gray-600" />
                                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                    {{ defaultModel.title }}
                                </h3>
                            </div>

                            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {{ defaultModel.description }}
                            </p>
                        </div>

                        <div class="flex items-center gap-2 mt-4">
                            <ModelSelect v-model="defaultModel.config.model" />

                            <button @click="openConfig(defaultModel.config)"
                                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400">
                                <Cog6ToothIcon class="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { Cog6ToothIcon } from '@heroicons/vue/24/outline'
import ModelSelect from '@/views/cpnt/ModelSelect.vue'
import { openConfigDialog } from '@/utils/configDialogService'
import useConfigStore from '@/stores/modules/config'


const { modelConfig } = useConfigStore()

const openConfig = (config) => {
    openConfigDialog(config)
}
</script>