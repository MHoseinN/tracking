<template>
  <!-- Overlay -->
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('close')">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh]">
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
        <form @submit.prevent class="p-5 space-y-4">
          <!-- Customer dropdown (only shown when not in customer-specific mode) -->
          <div v-if="!customerId">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              مشتری <span class="text-red-500">*</span>
            </label>
            <div class="flex gap-2">
              <div class="relative flex-1">
                <input
                  v-model="customerSearch"
                  @focus="showDropdown = true"
                  @input="onCustomerInput"
                  @keydown.down.prevent="focusNext()"
                  @keydown.up.prevent="focusPrev()"
                  @keydown.enter.prevent="confirmHighlighted()"
                  @blur="onBlur"
                  type="text"
                  placeholder="جستجو یا انتخاب مشتری"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': errors.customer_id }"
                />

                <button v-if="form.customer_id" type="button" @click="clearCustomer"
                  class="absolute inset-y-0 left-0 px-2 text-sm text-gray-500">پاک</button>

                <ul v-if="showDropdown && filteredCustomers.length" class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md max-h-48 overflow-auto">
                  <li v-for="(c, idx) in filteredCustomers" :key="c.id"
                    @mousedown.prevent="selectCustomer(c)"
                    :class="{'bg-blue-50': highlightedIndex === idx}"
                    class="px-3 py-2 hover:bg-blue-50 cursor-pointer">{{ c.name }}</li>
                </ul>

                <p v-if="showDropdown && !filteredCustomers.length" class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-500">موردی یافت نشد</p>
              </div>
              <!-- Quick add customer button -->
              <button type="button" @click="showNewCustomerInput = !showNewCustomerInput"
                class="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-200 transition whitespace-nowrap">
                + مشتری جدید
              </button>
            </div>
            <!-- Quick add customer input -->
            <div v-if="showNewCustomerInput" class="mt-2 flex gap-2">
              <input v-model="newCustomerName" type="text" placeholder="نام مشتری جدید"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                @keydown.enter.prevent="addNewCustomer" />
              <button type="button" @click="addNewCustomer" :disabled="addingCustomer"
                class="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50">
                {{ addingCustomer ? '...' : 'افزودن' }}
              </button>
            </div>
            <p v-if="errors.customer_id" class="text-red-500 text-xs mt-1">{{ errors.customer_id }}</p>
          </div>

          <!-- Date (Persian picker) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              تاریخ (شمسی) <span class="text-red-500">*</span>
            </label>
            <JalaliDatePicker v-model="form.persianDate" :error="!!errors.date" />
            <p v-if="errors.date" class="text-red-500 text-xs mt-1">{{ errors.date }}</p>
          </div>

          <!-- Price -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان) <span class="text-red-500">*</span>
            </label>
            <input v-model.number="form.price" type="number" min="0" step="1000" placeholder="مبلغ به تومان"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': errors.price }" dir="ltr" />
            <p v-if="formattedPrice" class="text-sm text-left text-gray-500 mt-1">{{ formattedPrice }}</p>
            <p v-if="errors.price" class="text-red-500 text-xs mt-1">{{ errors.price }}</p>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button type="button" @click="handleSubmit" @keydown="handleSubmit()" :disabled="saving"
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
import { ref, reactive, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';
import { toPersianDate, toGregorianDate } from '../utils/dateConverter';
import JalaliDatePicker from './JalaliDatePicker.vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  customerId: { type: [Number, String], default: null },
  invoiceData: { type: Object, default: null },
  customersList: { type: Array, default: () => [] }
});

const emit = defineEmits(['save', 'close']);
const toast = useToast();
const invoiceStore = useInvoiceStore();

const isEditMode = computed(() => !!props.invoiceData);
const saving = ref(false);
const showNewCustomerInput = ref(false);
const newCustomerName = ref('');
const addingCustomer = ref(false);

// Searchable customer UI state
const customerSearch = ref('');
const showDropdown = ref(false);
const highlightedIndex = ref(-1);

const filteredCustomers = computed(() => {
  const q = String(customerSearch.value || '').trim();
  if (!q) return props.customersList.slice(0, 50);
  return props.customersList.filter(c => c.name.includes(q) || c.name.toLowerCase().includes(q.toLowerCase()));
});

const form = reactive({
  customer_id: '',
  persianDate: '',
  price: '',
  description: ''
});

const errors = reactive({
  customer_id: '',
  date: '',
  price: ''
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

// Populate form when editing or when modal opens
watch(() => props.isOpen, (open) => {
  if (open) {
    resetForm();
    if (props.invoiceData) {
      // Edit mode: populate fields
      form.customer_id = props.invoiceData.customer_id || '';
      form.persianDate = toPersianDate(props.invoiceData.date);
      form.price = props.invoiceData.price || '';
      form.description = props.invoiceData.description || '';
      // Set customerSearch to existing name if available
      customerSearch.value = props.invoiceData.customer_name || '';
    } else {
      // Add mode
      form.customer_id = props.customerId || '';
      if (props.customerId) {
        const c = props.customersList.find(x => String(x.id) === String(props.customerId));
        customerSearch.value = c ? c.name : '';
      }
    }
  }
});

function resetForm() {
  form.customer_id = '';
  form.persianDate = '';
  form.price = '';
  form.description = '';
  errors.customer_id = '';
  errors.date = '';
  errors.price = '';
  showNewCustomerInput.value = false;
  newCustomerName.value = '';
}

function validate() {
  let valid = true;
  errors.customer_id = '';
  errors.date = '';
  errors.price = '';

  // Only validate customer if no customerId prop
  if (!props.customerId && !form.customer_id) {
    errors.customer_id = 'انتخاب مشتری الزامی است';
    valid = false;
  }

  if (!form.persianDate) {
    errors.date = 'تاریخ الزامی است';
    valid = false;
  } else {
    // Validate persian date format YYYY/MM/DD
    const dateRegex = /^\d{4}\/\d{1,2}\/\d{1,2}$/;
    if (!dateRegex.test(form.persianDate)) {
      errors.date = 'فرمت تاریخ صحیح نیست (YYYY/MM/DD)';
      valid = false;
    }
  }

  if (!form.price || form.price <= 0 || form.price.length < 4) {
    errors.price = 'قیمت الزامی است و باید بزرگتر از صفر باشد';
    valid = false;
  }

  return valid;
}

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

async function addNewCustomer() {
  if (!newCustomerName.value.trim()) return;

  addingCustomer.value = true;
  const result = await invoiceStore.addCustomer({ name: newCustomerName.value.trim() });
  addingCustomer.value = false;

  if (result.success) {
    // Refresh customers list by re-fetching
    await invoiceStore.fetchCustomers();
    form.customer_id = result.data.id;
    newCustomerName.value = '';
    showNewCustomerInput.value = false;
    toast.success('مشتری جدید اضافه شد');
  } else {
    toast.error(result.message);
  }
}

async function handleSubmit() {
  if (!validate()) return;

  saving.value = true;

  // Convert Persian date to Gregorian
  const gregorianDate = toGregorianDate(form.persianDate);

  if (!gregorianDate) {
    errors.date = 'تاریخ وارد شده معتبر نیست';
    saving.value = false;
    return;
  }

  const invoiceData = {
    customer_id: props.customerId || form.customer_id,
    date: gregorianDate,
    price: form.price,
    description: form.description || null
  };

  emit('save', { data: invoiceData, isEdit: isEditMode.value });
  saving.value = false;
}
</script>
