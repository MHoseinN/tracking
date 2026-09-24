<template>
  <AppModal :is-open="isOpen" :title="`آمار عملکرد ${admin?.display_name || 'کارمند'}`"
    description="تعداد لیست‌های تحویل‌داده‌شده و دریافت‌شده از مشتری" size="lg"
    dialog-class="admin-performance-dialog" body-class="admin-performance-dialog__body" @close="$emit('close')">
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

<style>
.admin-performance-dialog {
  height: min(44rem, calc(100dvh - 2rem));
}

.admin-performance-dialog__body {
  overflow-x: hidden;
}

@media (max-width: 639px) {
  .admin-performance-dialog .app-modal-header,
  .admin-performance-dialog .app-modal-body,
  .admin-performance-dialog .app-modal-footer {
    padding-inline: 1rem;
  }
}
</style>
