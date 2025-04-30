import { ref } from 'vue';

export const configDialogRef = ref(null);

export const openConfigDialog = (...args) => {
    if (configDialogRef.value) {
        configDialogRef.value.open(...args);
    }
}