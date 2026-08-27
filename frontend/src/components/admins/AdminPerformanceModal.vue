<template>
  <AppModal :is-open="isOpen" :title="`عملکرد ${admin?.display_name || 'کارمند'}`"
    description="تعداد لیست‌های تحویل‌داده‌شده و دریافت‌شده از مشتری" size="md" @close="$emit('close')">
    <AppDataTable :column-count="3" :empty="false" min-width="100%">
      <template #head><tr><th>بازه</th><th>تحویل</th><th>دریافت</th></tr></template>
      <tr v-for="period in periods" :key="period.key" class="app-table-row">
        <td class="font-black text-slate-800">{{ period.label }}</td>
        <td class="text-center text-lg font-black text-indigo-700">{{ formatNumber(admin?.performance?.[period.key]?.delivered) }}</td>
        <td class="text-center text-lg font-black text-emerald-700">{{ formatNumber(admin?.performance?.[period.key]?.received) }}</td>
      </tr>
    </AppDataTable>
    <template #footer><AppButton variant="secondary" @click="$emit('close')">بستن</AppButton></template>
  </AppModal>
</template>

<script setup>
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppModal from '../ui/AppModal.vue';
defineProps({ isOpen: { type: Boolean, default: false }, admin: { type: Object, default: null } });
defineEmits(['close']);
const periods = [{ key: 'day', label: 'امروز' }, { key: 'week', label: 'این هفته' }, { key: 'month', label: 'این ماه' }, { key: 'year', label: 'این سال' }];
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('fa-IR'); }
</script>
