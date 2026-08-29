<template>
  <!-- Overlay -->
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('close')">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b">
          <h3 class="text-lg font-bold text-gray-800">
            {{ isEditMode ? 'ویرایش حساب' : 'افزودن حساب جدید' }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
          <!-- Customer dropdown -->
          <div v-if="allowCustomerSelection || !customerId">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              مشتری <span class="text-red-500">*</span>
            </label>
            <div class="relative">
              <div class="relative">
                <input v-model="customerSearch" @focus="showDropdown = true" @input="onCustomerInput"
                  @keydown.down.prevent="focusNext()" @keydown.up.prevent="focusPrev()"
                  @keydown.enter.prevent="handleCustomerEnter()" @blur="onBlur" type="text"
                  placeholder="جستجو یا انتخاب مشتری"
                  class="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-700"
                  :class="{ 'border-red-500': errors.customer_id }" />

                <button v-if="form.customer_id" type="button" @click="clearCustomer"
                  class="absolute inset-y-0 left-0 px-2 text-sm text-gray-500">پاک</button>

                <ul v-if="showDropdown && filteredCustomers.length"
                  class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md max-h-48 overflow-auto">
                  <li v-for="(c, idx) in filteredCustomers" :key="c.id" @mousedown.prevent="selectCustomer(c)"
                    :class="{ 'bg-blue-50': highlightedIndex === idx }"
                    class="px-3 py-2 hover:bg-blue-50 cursor-pointer">
                    {{ c.name }}</li>
                </ul>

                <p v-if="showDropdown && !filteredCustomers.length"
                  class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500">
                  موردی یافت نشد</p>
              </div>
              <p v-if="errors.customer_id" class="text-red-500 text-xs mt-1">{{ errors.customer_id }}</p>
            </div>
          </div>

          <!-- Date (Persian picker) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              تاریخ (شمسی) <span class="text-red-500">*</span>
            </label>
            <JalaliDatePicker v-model="form.persianDate" :error="!!errors.date" class="col-span-1" trigger-mode="button"
              button-class="h-11 w-full justify-between rounded-lg border border-slate-200 bg-white px-4 text-md font-medium text-slate-700 shadow-sm" />
            <p v-if="errors.date" class="text-red-500 text-xs mt-1">{{ errors.date }}</p>
          </div>

          <!-- Price -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان) <span class="text-red-500">*</span>
            </label>
            <input v-model.number="form.price" type="number" min="0" step="1000" placeholder="مبلغ به تومان"
              class="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-700"
              :class="{ 'border-red-500': errors.price }" dir="ltr" />
            <p v-if="formattedPrice" class="text-sm text-left text-gray-500 mt-1">{{ formattedPrice }}</p>
            <p v-if="errors.price" class="text-red-500 text-xs mt-1">{{ errors.price }}</p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-gray-700">توضیحات فاکتور</label>
            <textarea v-model="form.notes" rows="4" placeholder="توضیح یا یادداشت مرتبط با این فاکتور..."
              class="w-full rounded-lg max-h-36 border overflow-scroll border-stone-300 px-3 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-700"></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button type="submit" :disabled="saving"
              class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
              <span v-if="saving" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z">
                  </path>
                </svg>
                در حال ذخیره...
              </span>
              <span v-else>{{ isEditMode ? 'ذخیره تغییرات' : 'افزودن حساب' }}</span>
            </button>
            <button type="button" @click="$emit('close')"
              class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { toPersianDate, toGregorianDate } from '../utils/dateConverter';
import JalaliDatePicker from './JalaliDatePicker.vue';
import { useFormState } from '../composables/useFormState';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  customerId: { type: [Number, String], default: null },
  invoiceData: { type: Object, default: null },
  customersList: { type: Array, default: () => [] },
  allowCustomerSelection: { type: Boolean, default: false }
});

const emit = defineEmits(['save', 'close']);

const isEditMode = computed(() => !!props.invoiceData);

// Searchable customer UI state
const customerSearch = ref('');
const showDropdown = ref(false);
const highlightedIndex = ref(-1);

const filteredCustomers = computed(() => {
  const q = String(customerSearch.value || '').trim();
  if (!q) return props.customersList.slice(0, 50);
  return props.customersList.filter(c => c.name.includes(q) || c.name.toLowerCase().includes(q.toLowerCase()));
});

const {
  form,
  errors,
  saving,
  setValues,
  resetForm: resetInvoiceForm,
  submit
} = useFormState({
  customer_id: '',
  persianDate: '',
  price: '',
  description: '',
  notes: ''
}, {
  validate: (values) => {
    const validationErrors = {
      customer_id: '',
      date: '',
      price: ''
    };

    if (!values.customer_id) {
      validationErrors.customer_id = 'انتخاب مشتری الزامی است';
    }

    if (!values.persianDate) {
      validationErrors.date = 'تاریخ الزامی است';
    } else if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(values.persianDate)) {
      validationErrors.date = 'فرمت تاریخ صحیح نیست (YYYY/MM/DD)';
    }

    if (!values.price || Number(values.price) <= 0) {
      validationErrors.price = 'قیمت الزامی است و باید بزرگتر از صفر باشد';
    }

    return validationErrors;
  }
});

const formattedPrice = computed(() => {
  try {
    if (form.price === null || form.price === undefined || form.price === '') return '';
    const n = Number(form.price) || 0;
    if (!n) return '';
    return n.toLocaleString('fa-IR') + ' تومان';
  } catch (e) {
    return '';
  }
});

function resolveInvoiceNotes(invoice) {
  return String(invoice?.notes || invoice?.description || '').trim();
}

// Populate form when editing or when modal opens
watch(() => props.isOpen, (open) => {
  if (open) {
    resetInvoiceForm();
    if (props.invoiceData) {
      const resolvedNotes = resolveInvoiceNotes(props.invoiceData);
      // Edit mode: populate fields
      setValues({
        customer_id: props.invoiceData.customer_id,
        persianDate: toPersianDate(props.invoiceData.date),
        price: props.invoiceData.price,
        description: resolvedNotes,
        notes: resolvedNotes
      });
      // Set customerSearch to existing name if available
      customerSearch.value = props.invoiceData.customer_name || '';
    } else {
      // Add mode
      setValues({ customer_id: props.customerId });
      if (props.customerId) {
        const c = props.customersList.find(x => String(x.id) === String(props.customerId));
        customerSearch.value = c ? c.name : '';
      }
    }
  }
});

function onCustomerInput() {
  // when typing, clear selected id until user picks
  if (!customerSearch.value) {
    form.customer_id = '';
  }
  highlightedIndex.value = -1;
}

function selectCustomer(c) {
  form.customer_id = c.id;
  customerSearch.value = c.name;
  showDropdown.value = false;
}

function clearCustomer() {
  form.customer_id = '';
  customerSearch.value = '';
}

function onBlur() {
  // delay to allow click selection
  setTimeout(() => { showDropdown.value = false; highlightedIndex.value = -1; }, 150);
}

function focusNext() {
  if (!filteredCustomers.value.length) return;
  highlightedIndex.value = Math.min(highlightedIndex.value + 1, filteredCustomers.value.length - 1);
}

function focusPrev() {
  if (!filteredCustomers.value.length) return;
  highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
}

function confirmHighlighted() {
  const idx = highlightedIndex.value;
  if (idx >= 0 && idx < filteredCustomers.value.length) selectCustomer(filteredCustomers.value[idx]);
}

function handleCustomerEnter() {
  const hasHighlighted = highlightedIndex.value >= 0 && highlightedIndex.value < filteredCustomers.value.length;
  if (hasHighlighted) {
    confirmHighlighted();
    return;
  }

  handleSubmit();
}

async function handleSubmit() {
  await submit(async (values) => {
    const gregorianDate = toGregorianDate(values.persianDate);

    if (!gregorianDate) {
      errors.date = 'تاریخ وارد شده معتبر نیست';
      return { success: false, validation: true };
    }

    const normalizedNotes = String(values.notes || '').trim();
    emit('save', {
      data: {
        customer_id: values.customer_id || props.customerId,
        date: gregorianDate,
        price: values.price,
        description: normalizedNotes || null,
        notes: normalizedNotes || null
      },
      isEdit: isEditMode.value
    });

    return { success: true };
  });
}
</script>
