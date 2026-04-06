<template>
  <div class="table-container">
    <table class="w-full bg-white text-sm">
      <thead>
        <tr class="bg-gray-50 border-b-2 border-gray-200">
          <th class="text-right px-4 py-3 font-semibold text-gray-600">#</th>
          <th v-if="showCustomerColumn" class="text-right px-4 py-3 font-semibold text-gray-600">نام مشتری</th>
          <th class="text-right px-4 py-3 font-semibold text-gray-600">تاریخ</th>
          <th class="text-right px-4 py-3 font-semibold text-gray-600">قیمت</th>
          <th class="text-center px-4 py-3 font-semibold text-gray-600">وضعیت ارسال</th>
          <th class="text-center px-4 py-3 font-semibold text-gray-600">وضعیت تسویه</th>
          <th v-if="showActions" class="text-center px-4 py-3 font-semibold text-gray-600">عملیات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!invoices || invoices.length === 0">
          <td :colspan="colCount" class="text-center py-12 text-gray-400">
            <div class="flex flex-col items-center gap-2">
              <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>هیچ حسابی یافت نشد</span>
            </div>
          </td>
        </tr>
        <tr
          v-for="(invoice, index) in invoices"
          :key="invoice.id"
          class="border-b border-gray-100 hover:bg-blue-50 transition-colors"
        >
          <!-- Row number -->
          <td class="px-4 py-3 text-gray-500">{{ index + 1 }}</td>

          <!-- Customer name (clickable) -->
          <td v-if="showCustomerColumn" class="px-4 py-3">
            <button
              @click="$emit('customer-click', invoice.customer_id)"
              class="text-blue-600 hover:text-blue-800 hover:underline font-medium transition"
            >
              {{ invoice.customer_name }}
            </button>
          </td>

          <!-- Date (Persian) -->
          <td class="px-4 py-3 text-gray-700 text-right" dir="ltr">
            <span class="inline-block min-w-[90px] text-right">{{ toPersianDate(invoice.date) }}</span>
          </td>

          <!-- Price -->
          <td class="px-4 py-3 text-gray-700 font-medium">{{ formatPrice(invoice.price) }}</td>

          <!-- Shipping status -->
          <td class="px-4 py-3 text-center">
            <button
              @click="handleStatusChange(invoice, 'is_shipped')"
              :class="invoice.is_shipped
                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'"
              class="px-3 py-1 rounded-full text-xs font-medium transition min-w-[80px]"
              :disabled="loadingStatus[`${invoice.id}_is_shipped`]"
            >
              <span v-if="loadingStatus[`${invoice.id}_is_shipped`]" class="flex items-center justify-center">
                <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </span>
              <span v-else>{{ invoice.is_shipped ? '✓ ارسال شده' : '✗ ارسال نشده' }}</span>
            </button>
          </td>

          <!-- Settlement status -->
          <td class="px-4 py-3 text-center">
            <button
              @click="handleStatusChange(invoice, 'is_settled')"
              :class="invoice.is_settled
                ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'"
              class="px-3 py-1 rounded-full text-xs font-medium transition min-w-[80px]"
              :disabled="loadingStatus[`${invoice.id}_is_settled`]"
            >
              <span v-if="loadingStatus[`${invoice.id}_is_settled`]" class="flex items-center justify-center">
                <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </span>
              <span v-else>{{ invoice.is_settled ? '✓ تسویه شده' : '✗ تسویه نشده' }}</span>
            </button>
          </td>

          <!-- Actions -->
          <td v-if="showActions" class="px-4 py-3">
            <div class="flex items-center justify-center gap-2">
              <!-- Edit button -->
              <button
                @click="$emit('edit', invoice)"
                class="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg text-xs font-medium transition"
                title="ویرایش"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                ویرایش
              </button>

              <!-- Delete button -->
              <button
                @click="$emit('delete', invoice.id)"
                class="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded-lg text-xs font-medium transition"
                title="حذف"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                حذف
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';
import { toPersianDate, formatPrice } from '../utils/dateConverter';

const props = defineProps({
  invoices: { type: Array, default: () => [] },
  showCustomerColumn: { type: Boolean, default: true },
  showActions: { type: Boolean, default: true }
});

const emit = defineEmits(['edit', 'delete', 'status-change', 'customer-click']);

const toast = useToast();
const invoiceStore = useInvoiceStore();

// Track loading state per invoice per field
const loadingStatus = reactive({});

// Calculate column count for empty state colspan
const colCount = computed(() => {
  let count = 5; // #, date, price, shipped, settled
  if (props.showCustomerColumn) count++;
  if (props.showActions) count++;
  return count;
});

async function handleStatusChange(invoice, field) {
  const key = `${invoice.id}_${field}`;
  if (loadingStatus[key]) return;

  loadingStatus[key] = true;
  const newValue = !invoice[field];

  const result = await invoiceStore.updateStatus(invoice.id, field, newValue);
  loadingStatus[key] = false;

  if (result.success) {
    emit('status-change', { id: invoice.id, field, value: newValue });
    const label = field === 'is_shipped' ? 'وضعیت ارسال' : 'وضعیت تسویه';
    toast.success(`${label} تغییر کرد`);
  } else {
    toast.error(result.message);
  }
}
</script>
