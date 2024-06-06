<template>

</template>
<script setup>
const intervalId = 0
beforeUnMount(() => {
    if (intervalId) {
        clearInterval(intervalId)
    }
    window.removeEventListener('resize', handleResize)
    even.off('test', handleResize)
})

</script>