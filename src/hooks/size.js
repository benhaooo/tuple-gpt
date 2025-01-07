import { reactive, onMounted, onUnmounted, watch, isRef, unref } from 'vue';

// 移动端最大宽度，同tailwindcss的md
export const MOBILE_MAX_WIDTH = 768;

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

    // 监听是否在移动端,使用方法同useEffect
    const onMobile = (callback, deps = []) => {
        let cleanup = null
        // 监听合并
        const watchEffectDeps = () => [
            isMobile(),
            ...deps.map(dep => (isRef(dep) ? dep.value : dep)),
        ];
        const stopWatch = watch(watchEffectDeps, (newVal, oldVal = []) => {
            const [mobile, ...rest] = newVal
            if (mobile) {
                if (typeof callback === 'function') {
                    cleanup = callback();
                }
            } else {
                if (typeof cleanup === 'function') {
                    cleanup();
                    cleanup = null
                }
            }
        }, { immediate: true });
    }

    return {
        size,
        isMobile,
        onMobile
    };
}

