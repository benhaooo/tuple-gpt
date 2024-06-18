import { onMounted, onUnmounted, nextTick } from 'vue';

export default function useAutoScrollToBottom(elementRef) {
    let isScrolling = false;
    // 平滑滚动
    async function smoothScrollToBottom(duration = 500) {
        await nextTick()
        const target = elementRef.value
        isScrolling = true
        let targetY = target.scrollHeight;
        const startingY = target.scrollTop;
        const startTime = performance.now();
        function step(currentTime) {
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            target.scrollTop = startingY + ((targetY - startingY) * progress);

            if (timeElapsed < duration) {
                requestAnimationFrame(step);
            } else {
                target.scrollTop = targetY; // 确保最终滚动位置准确无误
                isScrolling = false
            }
        }
        requestAnimationFrame(step);
    }

    //直接滚动到底部
    async function scrollToBottom() {
        await nextTick()
        const scrollElement = elementRef.value;
        scrollElement.scrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
    }

    // 初始化全局滚轮滚动事件监听
    // let wheelListener;
    // function startWheelListener() {
    //     wheelListener = (e) => {
    //         // scrollListenerActive = false;
    //     };
    //     window.addEventListener('wheel', wheelListener, { passive: true });
    // }
    // let observer;

    // function stopWheelListener() {
    //     observer.disconnect();
    //     if (wheelListener) {
    //         window.removeEventListener('wheel', wheelListener);
    //     }
    // }

    // 组件挂载时初始化滚动到底部并开始滚轮滚动事件监听
    onMounted(() => {
        // scrollToBottom();
        // startWheelListener();

        observer = new MutationObserver((mutations) => {
            const newScrollHeight = elementRef.value.scrollHeight;
            console.log('新的scrollHeight:', newScrollHeight);
            // scrollToBottom()
        });

        observer.observe(elementRef.value, {
            attributeFilter: ['scrollHeight']
        });
    });

    // 组件卸载时移除滚轮滚动事件监听器
    // onUnmounted(stopWheelListener);

    // 提供一个方法用于重新激活scrollHeight监听并滚动到底部
    function resetAndScrollToBottom() {
        smoothScrollToBottom();
    }

    let lastScrollTop
    setInterval(() => {
        // if (isScrolling) return
        // console.log("🚀 ~ setInterval ~ elementRef.scrollTop:", elementRef.value.scrollTop)
        // console.log("🚀 ~ setInterval ~ elementRef.scrollTop:", elementRef.value.scrollHeight)
        // console.log("🚀 ~ setInterval ~ elementRef.scrollTop:", elementRef.value.clientHeight)

    }, 400);


    return {
        smoothScrollToBottom,
        scrollToBottom
    };
}