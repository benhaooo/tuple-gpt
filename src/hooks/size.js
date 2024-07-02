import { reactive, onMounted, onUnmounted } from 'vue';


export const MOBILE_MAX_WIDTH = 600;

export const useWindowSize = () => {
    const size = reactive({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const onResize = () => {
        size.width = window.innerWidth;
        size.height = window.innerHeight;
    };

    onMounted(() => {
        window.addEventListener('resize', onResize);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', onResize);
    });

    const isMobile = () => size.width <= MOBILE_MAX_WIDTH;

    return {
        size,
        isMobile
    };
}

