<template>
  <AppModal :is-open="isOpen" :title="isEditMode ? 'ویرایش مشتری' : 'افزودن مشتری'"
    description="مشخصات پایه مشتری برای ساخت و پیگیری لیست‌ها استفاده می‌شود." size="md" :busy="saving" @close="close">
    <form id="customer-form" class="space-y-5" @submit.prevent="saveCustomer">
      <div class="grid gap-4 sm:grid-cols-2">
        <AppFormField for-id="customer-first-name" label="نام" :error="errors.first_name" required>
          <template #default="{ controlId, describedBy }"><input :id="controlId" v-model.trim="form.first_name"
            type="text" maxlength="100" autocomplete="given-name" class="app-input h-12"
            :aria-describedby="describedBy" :aria-invalid="Boolean(errors.first_name)" /></template>
        </AppFormField>
        <AppFormField for-id="customer-last-name" label="نام خانوادگی" :error="errors.last_name" required>
          <template #default="{ controlId, describedBy }"><input :id="controlId" v-model.trim="form.last_name"
            type="text" maxlength="100" autocomplete="family-name" class="app-input h-12"
            :aria-describedby="describedBy" :aria-invalid="Boolean(errors.last_name)" /></template>
        </AppFormField>
      </div>
      <AppFormField for-id="customer-phone" label="شماره تماس" :error="errors.phone">
        <template #default="{ controlId, describedBy }"><input :id="controlId" v-model.trim="form.phone"
          type="tel" maxlength="50" autocomplete="tel" dir="ltr" class="app-input h-12 text-left"
          :aria-describedby="describedBy" :aria-invalid="Boolean(errors.phone)" /></template>
      </AppFormField>
      <AppFormField for-id="customer-referrer" label="معرف">
        <template #default="{ controlId }"><input :id="controlId" v-model.trim="form.referrer"
          type="text" maxlength="255" class="app-input h-12" /></template>
      </AppFormField>
      <AppFormField label="وضعیت حساب">
        <CustomSelect v-model="form.account_status" :options="accountStatusSelectOptions" placeholder="وضعیت حساب"
          trigger-class="app-input h-12" />
      </AppFormField>
    </form>
    <template #footer>
      <AppButton type="submit" form="customer-form" variant="primary" size="lg" :loading="saving">
        {{ isEditMode ? 'ذخیره تغییرات' : 'افزودن مشتری' }}
      </AppButton>
      <AppButton variant="secondary" size="lg" :disabled="saving" @click="close">انصراف</AppButton>
    </template>
  </AppModal>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';
import CustomSelect from './CustomSelect.vue';
import AppButton from './ui/AppButton.vue';
import AppFormField from './ui/AppFormField.vue';
import AppModal from './ui/AppModal.vue';
import { validateCustomerIdentity } from '../utils/validators/customerValidators';
import { useFormState } from '../composables/useFormState';

const props = defineProps({
  isOpen: { type: Boolean, default: false }, customer: { type: Object, default: null },
  existingCustomers: { type: Array, default: () => [] }
});
const emit = defineEmits(['close', 'saved']);
const toast = useToast();
const invoiceStore = useInvoiceStore();
const accountStatusOptions = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];
const accountStatusSelectOptions = computed(() => [{ label: 'بدون وضعیت', value: '' }, ...accountStatusOptions.map((value) => ({ label: value, value }))]);
const { form, errors, saving, setValues, submit } = useFormState({
  first_name: '', last_name: '', phone: '', referrer: '', account_status: ''
}, { validate: (values) => validateCustomerIdentity(values, { existingCustomers: props.existingCustomers, currentCustomerId: props.customer?.id }) });
const isEditMode = computed(() => Boolean(props.customer?.id));

watch(() => props.isOpen, (open) => { if (open) fillForm(); });
watch(() => form.phone, () => { if (props.isOpen) validatePhoneDuplicate(); });
watch(() => props.existingCustomers, () => { if (props.isOpen) validatePhoneDuplicate(); }, { deep: true });
function fillForm() {
  setValues({ first_name: props.customer?.first_name || '', last_name: props.customer?.last_name || '',
    phone: props.customer?.phone || '', referrer: props.customer?.referrer || '', account_status: props.customer?.account_status || '' });
}
function validatePhoneDuplicate() {
  errors.phone = validateCustomerIdentity(form, { existingCustomers: props.existingCustomers, currentCustomerId: props.customer?.id }).phone;
  return !errors.phone;
}
function close() { if (!saving.value) emit('close'); }
async function saveCustomer() {
  const result = await submit(async (values) => {
    const payload = { first_name: values.first_name.trim(), last_name: values.last_name.trim(),
      phone: String(values.phone || '').trim() || null, referrer: String(values.referrer || '').trim() || null,
      account_status: String(values.account_status || '').trim() || null };
    return isEditMode.value ? invoiceStore.updateCustomer(props.customer.id, payload) : invoiceStore.addCustomer(payload, { allowExisting: false });
  });
  if (result.validation || result.saving) return;
  if (!result.success) return toast.error(result.message || 'عملیات با خطا مواجه شد');
  toast.success(isEditMode.value ? 'مشتری با موفقیت ویرایش شد' : 'مشتری با موفقیت اضافه شد');
  emit('saved', result.data); emit('close');
}
</script>
