<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="close"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white shadow-2xl" dir="rtl">
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
            <select
              v-model="form.account_status"
              class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">وضعیت حساب</option>
              <option v-for="option in accountStatusOptions" :key="option" :value="option">{{ option }}</option>
            </select>
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
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  customer: { type: Object, default: null },
  existingCustomers: { type: Array, default: () => [] }
});

const emit = defineEmits(['close', 'saved']);

const toast = useToast();
const invoiceStore = useInvoiceStore();
const saving = ref(false);

const accountStatusOptions = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];

const form = reactive({
  first_name: '',
  last_name: '',
  phone: '',
  referrer: '',
  account_status: ''
});

const errors = reactive({
  first_name: '',
  last_name: '',
  phone: ''
});

const isEditMode = computed(() => !!props.customer?.id);

watch(() => props.isOpen, (open) => {
  if (open) {
    fillForm();
  }
});

function normalizePhone(value) {
  return String(value || '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\d+]/g, '');
}

function fillForm() {
  form.first_name = props.customer?.first_name || '';
  form.last_name = props.customer?.last_name || '';
  form.phone = props.customer?.phone || '';
  form.referrer = props.customer?.referrer || '';
  form.account_status = props.customer?.account_status || '';
  clearErrors();
}

function clearErrors() {
  errors.first_name = '';
  errors.last_name = '';
  errors.phone = '';
}

function validate() {
  clearErrors();
  let valid = true;

  if (!String(form.first_name || '').trim()) {
    errors.first_name = 'نام الزامی است';
    valid = false;
  }

  if (!String(form.last_name || '').trim()) {
    errors.last_name = 'نام خانوادگی الزامی است';
    valid = false;
  }

  const normalizedPhone = normalizePhone(form.phone);
  if (normalizedPhone) {
    const duplicate = props.existingCustomers.find((customer) => {
      if (String(customer.id) === String(props.customer?.id || '')) return false;
      return normalizePhone(customer.phone) === normalizedPhone;
    });

    if (duplicate) {
      errors.phone = 'کاربری با این شماره تماس قبلا ثبت شده است';
      valid = false;
    }
  }

  return valid;
}

function close() {
  if (saving.value) return;
  emit('close');
}

async function saveCustomer() {
  if (!validate()) return;

  saving.value = true;
  const payload = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone: String(form.phone || '').trim() || null,
    referrer: String(form.referrer || '').trim() || null,
    account_status: String(form.account_status || '').trim() || null
  };

  const result = isEditMode.value
    ? await invoiceStore.updateCustomer(props.customer.id, payload)
    : await invoiceStore.addCustomer(payload, { allowExisting: false });

  saving.value = false;

  if (!result.success) {
    toast.error(result.message || 'عملیات با خطا مواجه شد');
    return;
  }

  toast.success(isEditMode.value ? 'کاربر با موفقیت ویرایش شد' : 'کاربر با موفقیت اضافه شد');
  emit('saved', result.data);
  emit('close');
}
</script>
