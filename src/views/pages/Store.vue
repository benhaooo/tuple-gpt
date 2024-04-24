<template>
    <div class="p-5">
        <ul class="flex justify-evenly flex-wrap">
            <li v-for="product in products" :key="product.productId"
                class="h-72 w-56 flex flex-col bg-gray-200 items-center rounded overflow-hidden my-5">
                <div class=" bg-green-400 w-full h-24 flex flex-col items-center justify-center">
                    <h3 class=" text-2xl mb-3 text-center">{{ product.productName }}</h3>

                </div>
                <div class="my-6">
                    <p class="my-1">{{ product.productDesc }}</p>
                    <p class=" my-2"><i class=" mr-1 not-italic">$</i><span
                            class="text-red-600 font-extrabold text-5xl">{{ product.price }}</span></p>
                </div>

                <el-button type="primary" @click="pay(product.productId)">立即购买</el-button>

            </li>
        </ul>
        <div id="from-div">

        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { queryProductList, createPayOrder } from '@/apis'
import useUserStore from '@/stores/modules/user'
import { useToast } from 'vue-toast-notification';

const userStore = useUserStore()
const products = ref([]);

const getProducts = async () => {
    if (!userStore.isLogin) {
        useToast().info("请先登录")
        return
    }
    queryProductList().then(async (res) => {
        const { data, code } = await res.json()
        if (code === '0003') {
            userStore.clearToken()
            useToast().error('登录过期，请重新登录')
        }
        products.value = data
    })

}
getProducts()


const pay = async (productId) => {
    const res = await createPayOrder(productId)
    const { data } = await res.json()
    const formDiv = document.querySelector('#from-div')
    formDiv.innerHTML = data
    document.forms[0].submit()
}
</script>
