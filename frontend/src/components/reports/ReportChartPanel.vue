<template>
  <div class="rounded-lg border border-slate-200 bg-slate-50 p-5 h-[460px]">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="font-bold text-slate-800">{{ title }}</h3>
      <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="badgeClass">{{ badge }}</span>
    </div>
    <canvas ref="canvasRef" class="w-full h-[380px]"></canvas>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';

const props = defineProps({
  title: { type: String, required: true },
  badge: { type: String, required: true },
  badgeClass: { type: String, required: true },
  type: { type: String, required: true },
  labels: { type: Array, default: () => [] },
  data: { type: Array, default: () => [] },
  color: { type: String, required: true },
  fillColor: { type: String, required: true }
});

const canvasRef = ref(null);
let chart = null;

function renderChart() {
  if (!canvasRef.value) return;
  chart?.destroy();
  chart = new Chart(canvasRef.value.getContext('2d'), {
    type: props.type,
    data: {
      labels: props.labels,
      datasets: [{
        label: props.title,
        data: props.data,
        borderColor: props.color,
        backgroundColor: props.fillColor,
        borderWidth: 2,
        fill: props.type === 'line',
        tension: 0.35,
        pointRadius: props.type === 'line' ? 4 : undefined,
        pointBackgroundColor: props.color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderRadius: props.type === 'bar' ? 6 : undefined
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { usePointStyle: true } } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (value) => Math.round(Number(value) || 0).toLocaleString('fa-IR') }
        }
      }
    }
  });
}

async function refreshChart() {
  await nextTick();
  renderChart();
}

onMounted(refreshChart);
watch(() => [props.title, props.labels, props.data], refreshChart, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>
