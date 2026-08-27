<template>
  <AppModal :is-open="isOpen" :title="category?.id ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی'"
    description="دسته‌بندی‌ها برای مرتب‌سازی و جست‌وجوی سریع محصولات استفاده می‌شوند." size="md" :busy="saving"
    @close="$emit('close')">
    <form id="product-category-form" class="space-y-5" @submit.prevent="handleSubmit">
      <AppFormField for-id="category-name" label="نام دسته‌بندی" :error="errorMessage" required>
        <template #default="{ controlId, describedBy }"><input :id="controlId" v-model.trim="name" type="text"
          maxlength="255" placeholder="مثلاً سونی یا نورپردازی" class="app-input h-12"
          :aria-describedby="describedBy" :aria-invalid="Boolean(errorMessage)" /></template>
      </AppFormField>
      <AppFormField label="دسته‌بندی والد">
        <CustomSelect v-model="parentId" :options="parentOptions" placeholder="بدون والد" trigger-class="app-input h-12" />
      </AppFormField>
    </form>
    <template #footer>
      <AppButton type="submit" form="product-category-form" variant="primary" size="lg" :loading="saving">ذخیره دسته‌بندی</AppButton>
      <AppButton variant="secondary" size="lg" :disabled="saving" @click="$emit('close')">انصراف</AppButton>
    </template>
  </AppModal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import CustomSelect from '../CustomSelect.vue';
import AppButton from '../ui/AppButton.vue';
import AppFormField from '../ui/AppFormField.vue';
import AppModal from '../ui/AppModal.vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false }, category: { type: Object, default: null },
  categories: { type: Array, default: () => [] }, saving: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'save']);
const name = ref('');
const parentId = ref('');
const errorMessage = ref('');
const parentOptions = computed(() => [{ label: 'بدون والد', value: '' }, ...props.categories
  .filter((item) => !props.category?.id || item.id !== props.category.id)
  .map((item) => ({ label: item.label || item.name, value: item.id }))]);
function resetForm() { name.value = props.category?.name || ''; parentId.value = props.category?.parent_id || ''; errorMessage.value = ''; }
function handleSubmit() {
  errorMessage.value = '';
  if (!name.value.trim()) { errorMessage.value = 'نام دسته‌بندی را وارد کنید'; return; }
  emit('save', { name: name.value.trim(), parent_id: parentId.value || null });
}
watch(() => [props.isOpen, props.category], ([open]) => { if (open) resetForm(); }, { deep: true });
</script>
