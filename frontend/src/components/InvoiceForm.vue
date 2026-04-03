<template>
  <!-- Overlay -->
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-center justify-between p-5 border-b">
          <h3 class="text-lg font-bold text-gray-800">
            {{ isEditMode ? 'ویرایش فاکتور' : 'افزودن فاکتور جدید' }}
          </h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 transition">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <form @submit.prevent="handleSubmit" class="p-5 space-y-4">
          <!-- Customer dropdown (only shown when not in customer-specific mode) -->
          <div v-if="!customerId">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              مشتری <span class="text-red-500">*</span>
            </label>
            <div class="flex gap-2">
              <select
                v-model="form.customer_id"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                :class="{ 'border-red-500': errors.customer_id }"
              >
                <option value="">انتخاب مشتری</option>
                <option v-for="c in customersList" :key="c.id" :value="c.id">
                  {{ c.name }}
                </option>
              </select>
              <!-- Quick add customer button -->
              <button
                type="button"
                @click="showNewCustomerInput = !showNewCustomerInput"
                class="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-200 transition whitespace-nowrap"
              >
                + مشتری جدید
              </button>
            </div>
            <!-- Quick add customer input -->
            <div v-if="showNewCustomerInput" class="mt-2 flex gap-2">
              <input
                v-model="newCustomerName"
                type="text"
                placeholder="نام مشتری جدید"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                @keydown.enter.prevent="addNewCustomer"
              />
              <button
                type="button"
                @click="addNewCustomer"
                :disabled="addingCustomer"
                class="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
              >
                {{ addingCustomer ? '...' : 'افزودن' }}
              </button>
            </div>
            <p v-if="errors.customer_id" class="text-red-500 text-xs mt-1">{{ errors.customer_id }}</p>
          </div>

          <!-- Date (Persian format input) -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              تاریخ (شمسی - مثال: 1402/06/15) <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.persianDate"
              type="text"
              placeholder="YYYY/MM/DD"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': errors.date }"
              dir="ltr"
            />
            <p v-if="errors.date" class="text-red-500 text-xs mt-1">{{ errors.date }}</p>
          </div>

          <!-- Price -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              قیمت (تومان) <span class="text-red-500">*</span>
            </label>
            <input
              v-model.number="form.price"
              type="number"
              min="0"
              step="1000"
              placeholder="مبلغ به تومان"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              :class="{ 'border-red-500': errors.price }"
              dir="ltr"
            />
            <p v-if="errors.price" class="text-red-500 text-xs mt-1">{{ errors.price }}</p>
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">توضیحات (اختیاری)</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="توضیحات فاکتور..."
              class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            ></textarea>
          </div>

          <!-- Buttons -->
          <div class="flex gap-3 pt-2">
            <button
              type="submit"
              :disabled="saving"
              class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              <span v-if="saving" class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                در حال ذخیره...
              </span>
              <span v-else>{{ isEditMode ? 'ذخیره تغییرات' : 'افزودن فاکتور' }}</span>
            </button>
            <button
              type="button"
              @click="$emit('close')"
              class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
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
import { ref, reactive, computed, watch } from 'vue';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';
import { toPersianDate, toGregorianDate } from '../utils/dateConverter';

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
    } else {
      // Add mode
      form.customer_id = props.customerId || '';
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

  if (!form.price || form.price <= 0) {
    errors.price = 'قیمت الزامی است و باید بزرگتر از صفر باشد';
    valid = false;
  }

  return valid;
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
