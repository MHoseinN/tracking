<template>
  <AppModal :is-open="isOpen" :title="isEdit ? 'ویرایش محصول' : 'افزودن محصول جدید'"
    description="قیمت اجاره محصول بر اساس یک روز و به تومان ثبت می‌شود." size="md" :busy="saving" @close="$emit('close')">
    <form id="product-form" class="space-y-5" @submit.prevent="handleSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField for-id="product-name" label="نام محصول" :error="errors.form" required>
          <template #default="{ controlId, describedBy }"><input :id="controlId" v-model.trim="form.name"
            type="text" maxlength="255" placeholder="دوربین Sony A7 IV" class="app-input h-12"
            :aria-describedby="describedBy" /></template>
        </AppFormField>
        <AppFormField for-id="product-price" label="قیمت یک روز (تومان)" required>
          <template #default="{ controlId }"><input :id="controlId" v-model.number="form.daily_price_toman"
            type="number" min="0" step="1000" dir="ltr" class="app-input h-12 text-left" /></template>
        </AppFormField>
      </div>
      <AppFormField label="دسته‌بندی محصول">
        <CustomSelect v-model="selectedCategoryId" :options="categoryOptions" placeholder="بدون دسته‌بندی" trigger-class="app-input h-12" />
      </AppFormField>
      <AppFormField v-if="isEdit && priceChanged" for-id="product-price-reason" label="دلیل تغییر قیمت"
        hint="اختیاری؛ برای ثبت تاریخچه تغییر قیمت استفاده می‌شود.">
        <template #default="{ controlId, describedBy }"><input :id="controlId" v-model.trim="form.price_change_reason"
          type="text" maxlength="500" class="app-input h-12" :aria-describedby="describedBy" /></template>
      </AppFormField>
    </form>
    <template #footer>
      <AppButton type="submit" form="product-form" variant="primary" size="lg" :loading="saving">
        {{ isEdit ? 'ذخیره تغییرات' : 'ثبت محصول' }}
      </AppButton>
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
import { useFormState } from '../../composables/useFormState';

const props = defineProps({
  isOpen: { type: Boolean, default: false }, product: { type: Object, default: null },
  categories: { type: Array, default: () => [] }, saving: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'save']);
const selectedCategoryId = ref('');
const { form, errors, setValues, submit } = useFormState({
  name: '', daily_price_toman: 0, price_change_reason: ''
}, { validate: (values) => {
  if (!String(values.name || '').trim()) return { form: 'نام محصول را وارد کنید' };
  if (!Number.isInteger(Number(values.daily_price_toman)) || Number(values.daily_price_toman) < 0) return { form: 'قیمت روزانه باید عدد صحیح صفر یا بیشتر باشد' };
  return { form: '' };
} });
const isEdit = computed(() => Boolean(props.product?.id));
const priceChanged = computed(() => Number(form.daily_price_toman) !== Number(props.product?.daily_price_toman || 0));
const categoryOptions = computed(() => [{ label: 'بدون دسته‌بندی', value: '' },
  ...props.categories.map((category) => ({ label: category.label || category.name, value: category.id }))]);
function resetForm() {
  setValues({ name: props.product?.name || '', daily_price_toman: props.product?.daily_price_toman ?? 0,
    price_change_reason: '' });
  selectedCategoryId.value = props.product?.category_id || '';
}
async function handleSubmit() {
  await submit(async (values) => {
    emit('save', { name: values.name.trim(), daily_price_toman: Number(values.daily_price_toman),
      category_id: selectedCategoryId.value || null, price_change_reason: values.price_change_reason.trim() || null });
    return { success: true };
  });
}
watch(() => [props.isOpen, props.product], ([open]) => { if (open) resetForm(); }, { deep: true });
</script>
