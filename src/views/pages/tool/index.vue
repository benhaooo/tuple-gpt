<template>
    <div class="flex flex-col justify-start items-center h-screen">
        <div class=" relative w-4/5 h-80 bg-center bg-cover rounded-3xl overflow-hidden mt-10">
            <img :src="tao" class="w-full h-full object-cover object-center">
            <h1 class=" absolute top-1/3 left-2/3 transform -translate-y-1/2 text-white text-6xl">
                神机百炼</h1>
        </div>
        <div class="flex justify-center items-center gap-6 mt-10">
            <div v-for="tool in config" @click="handleChangeTool(tool)" :key="tool.name"
                class="group flex items-center shadow-soft w-60 h-24 py-2 px-4 box-border rounded-3xl bg-surface-light-elevated dark:bg-surface-dark-elevated cursor-pointer hover:bg-primary-500 transition-colors duration-500">
                <div
                    class=" w-24 py-3 h-full flex items-start transition-all duration-300 group-hover:w-0">
                    <div
                        class=" w-16 aspect-square overflow-hidden rounded-full bg-white flex justify-center items-center text-purple-500 font-extrabold text-2xl transition duration-500 group-hover:scale-0">
                        {{ tool.name.slice(0, 1) }}
                    </div>
                </div>
                <h2 class="flex-1 font-extrabold text-xl">{{ tool.name }}</h2>
            </div>
        </div>
    </div>
    <div :class="{ 'translate-x-0': activeTool, 'translate-x-full': !activeTool }"
        class=" fixed top-0 w-full h-screen rounded-3xl shadow-md border-2 transition-all duration-300 ease-in z-50 bg-surface-light-primary dark:bg-surface-dark-primary">
        <i @click="activeTool = !activeTool"
            class="iconfont absolute top-1/2 left-0 text-3xl hover:text-blue-500 -translate-y-1/2 rotate-180">&#xe6c5;</i>
        <component v-if="currentToolComponent" :is="currentToolComponent" />
    </div>

</template>


<script setup>
import tao from '@/assets/imgs/tao.jpg'
import { ref, watch, shallowRef } from 'vue';
import config from './config';

// 防止组件内部属性被代理
const currentToolComponent = shallowRef(null);
const activeTool = ref(false);

const handleChangeTool = (tool) => {
    currentToolComponent.value = tool.component;
    activeTool.value = true;
}

const handleEsc = (e) => {
    if (e.keyCode === 27) {
        activeTool.value = false;
        window.removeEventListener('keydown', handleEsc)
    }
}
watch(activeTool, (newVal) => {
    if (newVal) {
        window.addEventListener('keydown', handleEsc)
    }
})
</script>


<style lang="less" scoped>
h1 {
    font-family: YouSheBiaoTiHei-Regular;
}
</style>