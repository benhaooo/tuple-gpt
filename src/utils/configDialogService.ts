import { ref } from 'vue';
import type { Assistant } from '@/types/assistant';

export const configDialogRef = ref<{ open: (assistantData?: Partial<Assistant>, onConfirm?: (updatedAssistant: Assistant) => void) => void } | null>(null);

export const openConfigDialog = (assistantData?: Partial<Assistant>, onConfirm?: (updatedAssistant: Assistant) => void) => {
    if (configDialogRef.value) {
        configDialogRef.value.open(assistantData, onConfirm);
    }
}