<template>
  <AppModal :is-open="isOpen" :title="`آمار عملکرد ${admin?.display_name || 'کارمند'}`"
    description="تعداد لیست‌های تحویل‌داده‌شده و دریافت‌شده از مشتری" size="lg" @close="$emit('close')">
    <UserPerformancePanel v-if="isOpen && admin" :key="admin.id" :fetch-performance="fetchPerformance" />
    <template #footer><AppButton variant="secondary" @click="$emit('close')">بستن</AppButton></template>
  </AppModal>
</template>

<script setup>
import AppButton from '../ui/AppButton.vue';
import AppModal from '../ui/AppModal.vue';
import UserPerformancePanel from '../profile/UserPerformancePanel.vue';
import { getAdminPerformance } from '../../modules/admins/api/admin.service';

const props = defineProps({ isOpen: { type: Boolean, default: false }, admin: { type: Object, default: null } });
defineEmits(['close']);
function fetchPerformance(params) { return getAdminPerformance(props.admin.id, params); }
</script>
