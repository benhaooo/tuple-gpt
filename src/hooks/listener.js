import useSessionsStore from "@/stores/modules/chat";
import { ref, computed, watch } from "vue";
const useListener = (onSessionChange) => {
    const sessionsStore = useSessionsStore();
    watch(() => sessionsStore.currentSessionId, (newVal, oldVal) => {
        onSessionChange && onSessionChange(newVal)
    })

}

export default useListener;