import { onMounted, onUnmounted, nextTick, ref } from 'vue';

export default function useAutoScrollToBottom() {
    const elementRef = ref(null)
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

    async function scrollToButtomNearBottom() {
        await nextTick()
        const scrollElement = elementRef.value;
        const { scrollTop, scrollHeight, clientHeight } = scrollElement
        const scrollBottom = scrollTop + clientHeight;
        const scrollHold = 100; // 距离底部多少距离开始滚动
        if (scrollBottom + scrollHold >= scrollHeight) {
            scrollElement.scrollTop = scrollHeight - clientHeight;
        }
    }



    return {
        smoothScrollToBottom,
        scrollToBottom,
        scrollToButtomNearBottom
    };
}