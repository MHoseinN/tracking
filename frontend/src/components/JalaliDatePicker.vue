<template>
  <div class="relative">
    <input
      v-model="displayValue"
      @focus="openCalendar"
      readonly
      placeholder="تاریخ(شمسی)"
      class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      :class="{ 'border-red-500': error }
      "
    />

    <div v-if="show" class="absolute z-30 mt-2 bg-white border rounded-md shadow-lg p-3 w-64">
      <div class="flex items-center justify-between mb-2">
        <button @click="prevMonth" class="px-2">‹</button>
        <div class="text-sm font-medium">{{ monthLabel }} {{ currentYear }}</div>
        <button @click="nextMonth" class="px-2">›</button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-xs text-center text-gray-600 mb-2">
        <div v-for="d in weekDays" :key="d">{{ d }}</div>
      </div>

      <div class="grid grid-cols-7 gap-1 text-sm">
        <div v-for="blank in blanks" :key="`b-${blank}`" class="h-8"></div>

        <button
          v-for="day in daysInMonth"
          :key="day"
          @click="selectDay(day)"
          :class="['h-8 rounded-md', selectedDay === day ? 'bg-blue-600 text-white' : 'hover:bg-blue-50']"
        >
          {{ day }}
        </button>
      </div>

      <div class="flex justify-end mt-3">
        <button @click="closeCalendar" class="text-md text-rose-600 px-2 py-1">بستن</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import PersianDate from 'persian-date';
import { PERSIAN_MONTHS } from '../utils/dateConverter';

const props = defineProps({
  modelValue: { type: String, default: '' },
  error: { type: Boolean, default: false }
});
const emit = defineEmits(['update:modelValue']);

const show = ref(false);
const currentYear = ref(null);
const currentMonth = ref(null);
const selectedDay = ref(null);
const displayValue = ref('');

const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

function parseModel(val) {
  if (!val) return null;
  const m = String(val).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

function formatPersian(y, m, d) {
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

watch(() => props.modelValue, (v) => {
  const p = parseModel(v);
  if (p) {
    currentYear.value = p.y;
    currentMonth.value = p.m;
    selectedDay.value = p.d;
    displayValue.value = formatPersian(p.y, p.m, p.d);
  } else {
    // if empty, set current to today
    const pd = new PersianDate();
    currentYear.value = pd.year();
    currentMonth.value = pd.month();
    selectedDay.value = null;
    displayValue.value = '';
  }
});

onMounted(() => {
  const p = parseModel(props.modelValue);
  if (p) {
    currentYear.value = p.y;
    currentMonth.value = p.m;
    selectedDay.value = p.d;
    displayValue.value = formatPersian(p.y, p.m, p.d);
  } else {
    const pd = new PersianDate();
    currentYear.value = pd.year();
    currentMonth.value = pd.month();
  }
});

const monthLabel = computed(() => PERSIAN_MONTHS[currentMonth.value - 1] || '');

const daysInMonth = computed(() => {
  try {
    const nextMonth = currentMonth.value === 12 ? 1 : currentMonth.value + 1;
    const nextYear = currentMonth.value === 12 ? currentYear.value + 1 : currentYear.value;
    const endPd = new PersianDate([nextYear, nextMonth, 1]).subtract('day', 1);
    const len = endPd.date();
    return Array.from({ length: len }, (_, i) => i + 1);
  } catch (e) {
    return [];
  }
});

const blanks = computed(() => {
  try {
    const startPd = new PersianDate([currentYear.value, currentMonth.value, 1]);
    const startGreg = startPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');
    const d = new Date(startGreg);
    // Get weekday index: convert JS Sunday(0)-Saturday(6) to Persian week starting Saturday
    // We'll map: JS 6(Sat) -> 0, 0(Sun)->1, 1->2, ..., 5->6
    const jsWeekday = d.getDay();
    const persianWeekIndex = (jsWeekday + 1) % 7; // Saturday -> 0
    return Array.from({ length: persianWeekIndex }, (_, i) => i);
  } catch (e) {
    return [];
  }
});

function openCalendar() {
  show.value = true;
}
function closeCalendar() {
  show.value = false;
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentYear.value -= 1;
    currentMonth.value = 12;
  } else {
    currentMonth.value -= 1;
  }
}
function nextMonth() {
  if (currentMonth.value === 12) {
    currentYear.value += 1;
    currentMonth.value = 1;
  } else {
    currentMonth.value += 1;
  }
}

function selectDay(day) {
  selectedDay.value = day;
  const val = formatPersian(currentYear.value, currentMonth.value, day);
  displayValue.value = val;
  emit('update:modelValue', val);
  // Close after selection
  show.value = false;
}
</script>

<style scoped>
/* simple scrollbar for dropdown */
</style>
