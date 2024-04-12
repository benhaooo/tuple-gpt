import { watchEffect } from "vue";
import { useConfigStore } from '@/stores/modules/config'

watchEffect(() => {
    const configStore = useConfigStore()
    const theme = configStore.theme
    document.querySelector('html').className = theme
})