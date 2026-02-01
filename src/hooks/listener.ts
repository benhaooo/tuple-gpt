import useSessionsStore from "@/stores/modules/chat";
import { watch } from "vue";

// 定义会话变化回调函数类型
type SessionChangeCallback = (newSessionId: string, oldSessionId?: string) => void;

const useListener = (onSessionChange?: SessionChangeCallback): void => {
    const sessionsStore = useSessionsStore();

    watch(
        () => sessionsStore.currentSessionId,
        (newVal: string, oldVal?: string) => {
            onSessionChange && onSessionChange(newVal, oldVal);
        }
    );
};

export default useListener;