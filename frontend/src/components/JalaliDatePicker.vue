<template>
  <div ref="pickerRoot" class="relative">
    <input v-if="triggerMode === 'input'" v-model="displayValue" @focus="openCalendar" readonly
      :placeholder="placeholder"
      class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-400 cursor-pointer"
      :class="[inputClass, { 'border-red-500': error }]" />
    <button v-else type="button" @click="toggleCalendar"
      class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm bgro font-medium transition"
      :class="buttonClass">
      <span>{{ displayValue || buttonPlaceholder }}</span>
      <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
      </svg>
    </button>

    <div v-if="show" class="fixed z-50 mx-auto bg-white mt-1 rounded-md border border-gray-300 shadow-lg p-2 w-64">
      <div class="flex items-center justify-between">
        <button type="button" @click="prevMonth"
          class="rounded-full flex items-center text-3xl w-8 h-8 justify-center hover:bg-gray-200 font-extrabold transition">‹</button>
        <div class="text-md font-medium">{{ monthLabel }} {{ currentYear }}</div>
        <button type="button" @click="nextMonth"
          class="rounded-full flex items-center text-3xl w-8 h-8 justify-center hover:bg-gray-200 font-extrabold transition">›</button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-md text-center py-1 border-b">
        <div v-for="d in weekDays" :key="d" class="text-black rounded-md">{{ d }}
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1 text-sm py-1">
        <div v-for="blank in blanks" :key="`b-${blank}`"></div>

        <button v-for="day in daysInMonth" :key="day" type="button" @click="selectDay(day)"
          :class="['h-8 hover:bg-gray-100 transition rounded-md', selectedDay === day ? 'bg-gray-200 text-black' : '']">
          {{ day }}
        </button>
      </div>

      <div class="flex justify-start">
        <button type="button" @click="closeCalendar"
          class="bg-rose-500 rounded-lg text-sm px-4 py-1 hover:bg-rose-600 text-white">لغو</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import PersianDate from 'persian-date';
import { PERSIAN_MONTHS } from '../utils/dateConverter';

const props = defineProps({
  modelValue: { type: String, default: '' },
  error: { type: Boolean, default: false },
  triggerMode: { type: String, default: 'input' },
  placeholder: { type: String, default: 'تاریخ(شمسی)' },
  buttonPlaceholder: { type: String, default: 'انتخاب تاریخ' },
  inputClass: { type: String, default: '' },
  buttonClass: { type: String, default: '' }
});
const emit = defineEmits(['update:modelValue']);

const show = ref(false);
const currentYear = ref(null);
const currentMonth = ref(null);
const selectedDay = ref(null);
const displayValue = ref('');
const pickerRoot = ref(null);

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

  document.addEventListener('mousedown', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside);
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
function toggleCalendar() {
  show.value = !show.value;
}
function closeCalendar() {
  show.value = false;
}

function handleClickOutside(event) {
  if (!show.value) return;
  if (!pickerRoot.value) return;

  if (!pickerRoot.value.contains(event.target)) {
    closeCalendar();
  }
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
