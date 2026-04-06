<template>
  <div class="bg-white rounded-xl shadow p-4">
    <div class="flex flex-wrap items-end gap-3">
      <!-- Text search -->
      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm font-medium text-gray-700 mb-1">جستجو در توضیحات</label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="جستجو..."
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          @keydown.enter="handleSearch"
        />
      </div>

      <!-- Start date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">از تاریخ (شمسی)</label>
        <input
          v-model="startDate"
          type="text"
          placeholder="YYYY/MM/DD"
          dir="ltr"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
        />
      </div>

      <!-- End date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">تا تاریخ (شمسی)</label>
        <input
          v-model="endDate"
          type="text"
          placeholder="YYYY/MM/DD"
          dir="ltr"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
        />
      </div>

      <!-- Search button -->
      <button
        @click="handleSearch"
        class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
      >
        جستجو
      </button>

      <!-- Reset button -->
      <button
        @click="handleReset"
        class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
      >
        پاک کردن
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { toGregorianDate } from '../utils/dateConverter';

const emit = defineEmits(['search']);

const searchQuery = ref('');
const startDate = ref('');
const endDate = ref('');

function handleSearch() {
  const params = {};

  if (searchQuery.value.trim()) {
    params.q = searchQuery.value.trim();
  }

  if (startDate.value) {
    const gregorianStart = toGregorianDate(startDate.value);
    if (gregorianStart) params.start_date = gregorianStart;
  }

  if (endDate.value) {
    const gregorianEnd = toGregorianDate(endDate.value);
    if (gregorianEnd) params.end_date = gregorianEnd;
  }

  emit('search', params);
}

function handleReset() {
  searchQuery.value = '';
  startDate.value = '';
  endDate.value = '';
  emit('search', {});
}
</script>
