<template>
    <div class="flex flex-col justify-center items-center h-full">
        <div @click="rollDice"
            class="text-9xl transition-all cursor-grab shadow-md flex justify-center items-center mb-24"
            :class="{ '-translate-y-12': SVGCard }" :style="{ transform: diceTransform }">
            {{ currentFace }}
        </div>
        <div @click="handleClick" class=" rounded-md overflow-hidden" v-if="SVGCard" v-html="SVGCard"></div>
        <div v-if="showTooltip" :style="tooltipStyle" class="tooltip">
            {{ currentAdventure }}
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { fetchTurtle } from '@/apis/turtle';

const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const currentFace = ref(faces[0]);
const diceTransform = ref('rotate(0deg)');
const rotationDegrees = ref(0);
let intervalId = null;

const SVGCard = ref('')
const pointeData = ref({})

const showTooltip = ref(false);
const tooltipStyle = ref({});
const currentAdventure = ref('');

const rollDice = () => {
    if (intervalId !== null) {
        return;
    }

    const request = fetchTurtle();

    let index = 0;
    intervalId = setInterval(() => {
        rotationDegrees.value += 360;
        diceTransform.value = `rotate(${rotationDegrees.value}deg)`;

        currentFace.value = faces[index % faces.length];
        index++;
    }, 500);

    request.then((res) => {
        const { data, svg } = res;
        setTimeout(() => {
            SVGCard.value = svg;
            pointeData.value = JSON.parse(data);
        }, 300);
    });
    request.finally(() => {
        clearInterval(intervalId);
        intervalId = null;
    });
};

const handleClick = (event) => {
    const svg = event.currentTarget.querySelector('svg');
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM().inverse();
    const svgPoint = point.matrixTransform(ctm);

    const radius = 10;
    for (const dataPoint of pointeData.value) {
        const dx = svgPoint.x - dataPoint.x;
        const dy = svgPoint.y - dataPoint.y;
        if (dx * dx + dy * dy <= radius * radius) {
            showTooltip.value = true;
            currentAdventure.value = dataPoint.奇遇;
            tooltipStyle.value = {
                position: 'absolute',
                left: `${event.pageX}px`,
                top: `${event.pageY - 40}px`,
            };
            break;
        }
    }
};
</script>

<style lang="less" scoped>
.tooltip {
    background-color: rgba(0, 77, 64, 0.9);
    color: #ffffff;
    padding: 5px 10px;
    border-radius: 4px;
    position: absolute;
    white-space: nowrap;
}
</style>