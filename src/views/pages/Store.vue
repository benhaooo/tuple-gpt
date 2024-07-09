<template>
    <h2>test</h2>
</template>

<script setup>
// const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
// recognition.lang = 'zh-CN'; // 设置识别语言
// recognition.interimResults = false;

// recognition.continuous = true; // 连续识别
// recognition.interimResults = false; // 显示临时结果

// recognition.onstart = () => {
//     console.log('语音识别已启动');
// };

// recognition.start();

// recognition.onresult = (event) => {
//     let interimTranscript = '';
//     let finalTranscript = '';

//     for (let i = 0; i < event.results.length; i++) {
//         const transcript = event.results[i][0].transcript;
//         if (event.results[i].isFinal) {
//             finalTranscript += transcript;
//         } else {
//             interimTranscript += transcript;
//         }
//     }
//     console.log("🚀 ~ finalTranscript:", finalTranscript)

//     console.log("🚀 ~ interimTranscript:", interimTranscript)

// };
// recognition.onresult = (event) => {
//     for (let i = event.resultIndex; i < event.results.length; ++i) {
//         if (event.results[i].isFinal) {
//             const transcript = event.results[i][0].transcript.trim();
//             console.log('Transcript:', transcript);
//             if (transcript.toLowerCase() === 'your wake word') {
//                 console.log('Wake word detected!');
//                 // 执行唤醒后的操作
//             }
//         }
//     }
// };

// recognition.onerror = (event) => {
//     console.error('Speech recognition error:', event.error);
// };

</script>