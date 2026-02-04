import { nextTick, ref, Ref } from 'vue';

// 定义滚动元素类型
type ScrollElement = HTMLElement | null;

// 定义返回类型接口
interface UseAutoScrollToBottomReturn {
    scrollRef: Ref<ScrollElement>;
    smoothScrollToBottom: (duration?: number) => Promise<void>;
    scrollToBottom: () => Promise<void>;
    scrollToButtomNearBottom: () => Promise<void>;
}

export default function useAutoScrollToBottom(): UseAutoScrollToBottomReturn {
    const scrollRef = ref<ScrollElement>(null);
    let isScrolling = false;

    // 平滑滚动
    async function smoothScrollToBottom(duration: number = 500): Promise<void> {
        await nextTick();
        const target = scrollRef.value;
        if (!target) return;

        isScrolling = true;
        const targetY = target.scrollHeight;
        const startingY = target.scrollTop;
        const startTime = performance.now();

        function step(currentTime: number): void {
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            if (target) {
                target.scrollTop = startingY + ((targetY - startingY) * progress);
            }

            if (timeElapsed < duration) {
                requestAnimationFrame(step);
            } else {
                if (target) {
                    target.scrollTop = targetY; // 确保最终滚动位置准确无误
                }
                isScrolling = false;
            }
        }
        requestAnimationFrame(step);
    }

    // 直接滚动到底部
    async function scrollToBottom(): Promise<void> {
        await nextTick();
        const scrollElement = scrollRef.value;
        if (!scrollElement) return;

        scrollElement.scrollTop = scrollElement.scrollHeight - scrollElement.clientHeight;
    }

    async function scrollToButtomNearBottom(): Promise<void> {
        await nextTick();
        const scrollElement = scrollRef.value;
        if (!scrollElement) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        const scrollBottom = scrollTop + clientHeight;
        const scrollHold = 100; // 距离底部多少距离开始滚动

        if (scrollBottom + scrollHold >= scrollHeight) {
            scrollElement.scrollTop = scrollHeight - clientHeight;
        }
    }

    return {
        scrollRef,
        smoothScrollToBottom,
        scrollToBottom,
        scrollToButtomNearBottom
    };
}