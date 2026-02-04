import { reactive, onMounted, onUnmounted, watch, isRef, Ref, WatchStopHandle } from 'vue';

// 移动端最大宽度，同tailwindcss的md
export const MOBILE_MAX_WIDTH = 768;

// 定义窗口尺寸类型
interface WindowSize {
    width: number;
    height: number;
}

// 定义依赖项类型
type Dependency = Ref<any> | any;

// 定义清理函数类型
type CleanupFunction = () => void;

// 定义移动端回调函数类型
type MobileCallback = () => CleanupFunction | void;

// 定义返回类型接口
interface UseWindowSizeReturn {
    size: WindowSize;
    isMobile: () => boolean;
    onMobile: (callback: MobileCallback, deps?: Dependency[]) => WatchStopHandle;
}

export const useWindowSize = (): UseWindowSizeReturn => {
    const size = reactive<WindowSize>({
        width: window.innerWidth,
        height: window.innerHeight,
    });

    const onResize = (): void => {
        size.width = window.innerWidth;
        size.height = window.innerHeight;
    };

    onMounted(() => {
        window.addEventListener('resize', onResize);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', onResize);
    });

    const isMobile = (): boolean => size.width <= MOBILE_MAX_WIDTH;

    // 监听是否在移动端,使用方法同useEffect
    const onMobile = (callback: MobileCallback, deps: Dependency[] = []): WatchStopHandle => {
        let cleanup: CleanupFunction | null = null;

        // 监听合并
        const watchEffectDeps = () => [
            isMobile(),
            ...deps.map(dep => (isRef(dep) ? dep.value : dep)),
        ];

        const stopWatch = watch(
            watchEffectDeps,
            (newVal: any[], oldVal: any[] = []) => {
                const [mobile, ...rest] = newVal;
                if (mobile) {
                    if (typeof callback === 'function') {
                        const result = callback();
                        if (typeof result === 'function') {
                            cleanup = result;
                        }
                    }
                } else {
                    if (typeof cleanup === 'function') {
                        cleanup();
                        cleanup = null;
                    }
                }
            },
            { immediate: true }
        );

        return stopWatch;
    };

    return {
        size,
        isMobile,
        onMobile
    };
};

