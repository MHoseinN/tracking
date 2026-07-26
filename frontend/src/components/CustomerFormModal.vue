<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="close"
    >
      <div class="w-full max-w-lg rounded-lg bg-white shadow-xl" dir="rtl">
        <div class="flex items-center justify-between border-b p-5">
          <h3 class="text-lg font-bold text-gray-800">
            {{ isEditMode ? 'ویرایش کاربر' : 'افزودن کاربر' }}
          </h3>
          <button @click="close" class="text-gray-400 transition hover:text-gray-600">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="saveCustomer" class="space-y-4 p-5">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">نام <span class="text-red-500">*</span></label>
              <input
                v-model="form.first_name"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': errors.first_name }"
              />
              <p v-if="errors.first_name" class="mt-1 text-xs text-red-500">{{ errors.first_name }}</p>
            </div>

            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">نام خانوادگی <span class="text-red-500">*</span></label>
              <input
                v-model="form.last_name"
                type="text"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': errors.last_name }"
              />
              <p v-if="errors.last_name" class="mt-1 text-xs text-red-500">{{ errors.last_name }}</p>
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">شماره تماس</label>
            <input
              v-model="form.phone"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': errors.phone }"
            />
            <p v-if="errors.phone" class="mt-1 text-xs text-red-500">{{ errors.phone }}</p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">معرف</label>
            <input
              v-model="form.referrer"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">وضعیت حساب</label>
            <CustomSelect
              :model-value="form.account_status"
              :options="accountStatusSelectOptions"
              placeholder="وضعیت حساب"
              trigger-class="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              @update:model-value="form.account_status = $event"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {{ saving ? 'در حال ذخیره...' : (isEditMode ? 'ذخیره تغییرات' : 'افزودن کاربر') }}
            </button>
            <button
              type="button"
              @click="close"
              class="flex-1 rounded-lg bg-gray-100 py-3 font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';
import CustomSelect from './CustomSelect.vue';
import { validateCustomerIdentity } from '../utils/validators/customerValidators';
import { useFormState } from '../composables/useFormState';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  customer: { type: Object, default: null },
  existingCustomers: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'saved']);

const toast = useToast();
const invoiceStore = useInvoiceStore();

const accountStatusOptions = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];
const accountStatusSelectOptions = computed(() => ([
  { label: 'وضعیت حساب', value: '' },
  ...accountStatusOptions.map((option) => ({ label: option, value: option }))
]));

const {
  form,
  errors,
  saving,
  setValues,
  submit
} = useFormState({
  first_name: '',
  last_name: '',
  phone: '',
  referrer: '',
  account_status: ''
}, {
  validate: (values) => validateCustomerIdentity(values, {
    existingCustomers: props.existingCustomers,
    currentCustomerId: props.customer?.id
  })
});

const isEditMode = computed(() => !!props.customer?.id);

watch(() => props.isOpen, (open) => {
  if (open) {
    fillForm();
  }
});

watch(() => form.phone, () => {
  if (!props.isOpen) return;
  validatePhoneDuplicate();
});

watch(() => props.existingCustomers, () => {
  if (!props.isOpen) return;
  validatePhoneDuplicate();
}, { deep: true });

function fillForm() {
  setValues({
    first_name: props.customer?.first_name,
    last_name: props.customer?.last_name,
    phone: props.customer?.phone,
    referrer: props.customer?.referrer,
    account_status: props.customer?.account_status
  });
}

function validatePhoneDuplicate() {
  errors.phone = validateCustomerIdentity(form, {
    existingCustomers: props.existingCustomers,
    currentCustomerId: props.customer?.id
  }).phone;
  return !errors.phone;
}

function close() {
  if (saving.value) return;
  emit('close');
}

async function saveCustomer() {
  const result = await submit(async (values) => {
    const payload = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: String(values.phone || '').trim() || null,
      referrer: String(values.referrer || '').trim() || null,
      account_status: String(values.account_status || '').trim() || null
    };

    return isEditMode.value
      ? invoiceStore.updateCustomer(props.customer.id, payload)
      : invoiceStore.addCustomer(payload, { allowExisting: false });
  });

  if (result.validation || result.saving) return;

  if (!result.success) {
    toast.error(result.message || 'عملیات با خطا مواجه شد');
    return;
  }

  toast.success(isEditMode.value ? 'کاربر با موفقیت ویرایش شد' : 'کاربر با موفقیت اضافه شد');
  emit('saved', result.data);
  emit('close');
}
</script>
