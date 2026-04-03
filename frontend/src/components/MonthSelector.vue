<template>
  <div class="flex items-center gap-2 flex-wrap">
    <!-- Month selector -->
    <div class="flex items-center gap-1">
      <label class="text-sm font-medium text-gray-700">ماه:</label>
      <select
        v-model="selectedMonth"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option v-for="(name, index) in PERSIAN_MONTHS" :key="index + 1" :value="index + 1">
          {{ name }}
        </option>
      </select>
    </div>

    <!-- Year input -->
    <div class="flex items-center gap-1">
      <label class="text-sm font-medium text-gray-700">سال:</label>
      <input
        v-model.number="selectedYear"
        type="number"
        min="1300"
        max="1500"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <!-- Apply button -->
    <button
      @click="applyFilter"
      class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
    >
      اعمال
    </button>

    <!-- Reset button -->
    <button
      @click="resetToCurrentMonth"
      class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
    >
      ماه جاری
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { PERSIAN_MONTHS, getCurrentPersianDate } from '../utils/dateConverter';

const emit = defineEmits(['change']);

const currentPersian = getCurrentPersianDate();
const selectedMonth = ref(currentPersian.month);
const selectedYear = ref(currentPersian.year);

function applyFilter() {
  emit('change', {
    persianYear: selectedYear.value,
    persianMonth: selectedMonth.value
  });
}

function resetToCurrentMonth() {
  const current = getCurrentPersianDate();
  selectedMonth.value = current.month;
  selectedYear.value = current.year;
  applyFilter();
}

onMounted(() => {
  // Emit initial value
  applyFilter();
});
</script>
