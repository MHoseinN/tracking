<template>
  <div class="table-container">
    <table class="w-full bg-white text-sm">
      <thead>
        <tr class="bg-blue-50">
          <th class="text-right px-4 py-3 font-semibold border border-gray-200">شماره</th>
          <th v-if="showCustomerColumn" class="text-right px-4 py-3 font-semibold border border-gray-200">نام مشتری</th>
          <th class="text-right px-4 py-3 font-semibold border border-gray-200">
            <button type="button" class="inline-flex items-center gap-2 transition hover:text-blue-600"
              @click="$emit('toggle-sort', 'date')">
              <span>تاریخ</span>
              <span class="text-xs">{{ getSortIndicator('date') }}</span>
            </button>
          </th>
          <th class="text-right px-4 py-3 font-semibold border border-gray-200">
            <button type="button" class="inline-flex items-center gap-2 transition hover:text-blue-600"
              @click="$emit('toggle-sort', 'price')">
              <span>قیمت</span>
              <span class="text-xs">{{ getSortIndicator('price') }}</span>
            </button>
          </th>
          <th class="text-center px-4 py-3 font-semibold border border-gray-200">وضعیت ارسال</th>
          <th class="text-center px-4 py-3 font-semibold border border-gray-200">وضعیت تسویه</th>
          <th v-if="showActions" class="text-center py-3 font-semibold border border-gray-200">عملیات</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!invoices || invoices.length === 0">
          <td :colspan="colCount" class="text-center py-12 border border-gray-100">
            <div class="flex flex-col items-center gap-2">
              <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>هیچ حسابی یافت نشد</span>
            </div>
          </td>
        </tr>
        <tr v-for="(invoice, index) in invoices" :key="invoice.id"
          :class="['border border-gray-100 hover:bg-blue-50 transition-colors', rowClickable ? 'cursor-pointer' : '']"
          @click="rowClickable ? $emit('edit', invoice) : null">
          <!-- Row number -->
          <td class="px-4 py-3 border border-gray-100">{{ index + 1 }}</td>

          <!-- Customer name (clickable) -->
          <td v-if="showCustomerColumn" @click.stop="$emit('customer-click', invoice.customer_id)"
            class="p-3 hover:bg-blue-100 border border-gray-100 transiton rounded-sm cursor-pointer">
            <button class="text-slate-700 font-medium">
              {{ invoice.customer_name }}
            </button>
          </td>

          <!-- Date (Persian) -->
          <td class="px-4 py-3 border border-gray-100 text-right" dir="ltr">
            <span class="inline-block min-w-[90px] text-right">{{ toPersianDate(invoice.date) }}</span>
          </td>

          <!-- Price -->
          <td class="px-4 py-3 border border-gray-100 font-medium">
            <span>{{ formatPrice(invoice.price) }}</span>
          </td>

          <!-- Shipping status -->
          <td class="text-center border border-gray-100">
            <button @click.stop="handleStatusChange(invoice, 'is_shipped')" :class="invoice.is_shipped
              ? getStatusBadgeClass(true)
              : getStatusBadgeClass(false)" class="px-4 py-2 rounded-full text-sm font-medium transition min-w-[80px]"
              :disabled="loadingStatus[`${invoice.id}_is_shipped`]">
              <span v-if="loadingStatus[`${invoice.id}_is_shipped`]" class="flex items-center justify-center">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </span>
              <span v-else>{{ invoice.is_shipped ? ' ارسال شده ✓' : ' ارسال نشده ✗' }}</span>
            </button>
          </td>

          <!-- Settlement status -->
          <td class="text-center border border-gray-100">
            <button @click.stop="handleStatusChange(invoice, 'is_settled')" :class="invoice.is_settled
              ? getStatusBadgeClass(true)
              : getStatusBadgeClass(false)" class="px-4 py-2 rounded-full text-sm font-medium transition min-w-[80px]"
              :disabled="loadingStatus[`${invoice.id}_is_settled`]">
              <span v-if="loadingStatus[`${invoice.id}_is_settled`]" class="flex items-center justify-center">
                <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
              </span>
              <span v-else>{{ invoice.is_settled ? ' تسویه شده ✓' : ' تسویه نشده ✗' }}</span>
            </button>
          </td>

          <!-- Actions -->
          <td v-if="showActions" class="py-3 border border-gray-100">
            <div class="flex justify-center items-center gap-2">
              <button @click.stop="$emit('edit', invoice)"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                title="ویرایش">
                <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button @click.stop="$emit('delete', invoice.id)"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition"
                title="حذف">
                <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button v-if="hasInvoiceNotes(invoice)" type="button" @click.stop="openNotesModal(invoice)"
                class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
                title="مشاهده توضیحات">
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </button>
              <button v-else
                class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-50 text-neutral-400 transition"
                disabled>
                <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-5">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="showStatusConfirm"
          class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4"
          @click.self="closeStatusConfirm">
          <div
            class="w-full max-w-md rounded-lg bg-white shadow-[0_22px_80px_-24px_rgba(15,23,42,0.55)] overflow-hidden">
            <div class="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-5 text-white">
              <div class="flex items-center gap-3">
                <div class="w-11 h-11 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-bold">{{ statusConfirmMeta.title }}</h3>
                  <p class="text-sm text-white/85">نیاز به تایید شما</p>
                </div>
              </div>
            </div>

            <div class="px-6 py-6">
              <p class="text-gray-600 leading-7">{{ statusConfirmMeta.message }}</p>

              <div class="mt-6 flex gap-3">
                <button @click="confirmStatusChange" :disabled="confirmingStatus"
                  class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
                  <span v-if="confirmingStatus" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z">
                      </path>
                    </svg>
                    در حال ثبت...
                  </span>
                  <span v-else>{{ statusConfirmMeta.confirmLabel }}</span>
                </button>

                <button @click="closeStatusConfirm" :disabled="confirmingStatus"
                  class="flex-1 bg-slate-100 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-200 transition disabled:opacity-60 disabled:cursor-not-allowed">
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0"
        enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="showNotesModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-sm p-4"
          @click.self="closeNotesModal">
          <div
            class="w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-[0_22px_80px_-24px_rgba(15,23,42,0.55)]">
            <div class="bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-5 text-slate-900">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-white/60">
                  <span class="text-xl font-black leading-none">!</span>
                </div>
                <div>
                  <h3 class="text-lg font-bold">توضیحات فاکتور</h3>
                  <p class="text-sm text-slate-700">{{ notesModalInvoiceLabel }}</p>
                </div>
              </div>
            </div>

            <div class="px-6 py-6">
              <p class="whitespace-pre-wrap break-words text-sm leading-8 text-slate-700">{{ activeInvoiceNotes }}</p>

              <div class="mt-6 flex justify-end">
                <button type="button" @click="closeNotesModal"
                  class="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';
import { toPersianDate, formatPrice } from '../utils/dateConverter';
import { getStatusBadgeClass } from '../utils/statusStyles';

const props = defineProps({
  invoices: { type: Array, default: () => [] },
  showCustomerColumn: { type: Boolean, default: true },
  showActions: { type: Boolean, default: true },
  rowClickable: { type: Boolean, default: false },
  sortKey: { type: String, default: 'date' },
  sortDirection: { type: String, default: 'desc' }
});

const emit = defineEmits(['edit', 'delete', 'status-change', 'customer-click', 'toggle-sort']);

const toast = useToast();
const invoiceStore = useInvoiceStore();

// Track loading state per invoice per field
const loadingStatus = reactive({});
const showStatusConfirm = ref(false);
const confirmingStatus = ref(false);
const pendingStatusChange = ref({ invoice: null, field: '' });
const showNotesModal = ref(false);
const activeNotesInvoice = ref(null);

// Calculate column count for empty state colspan
const colCount = computed(() => {
  let count = 5; // #, date, price, shipped, settled
  if (props.showCustomerColumn) count++;
  if (props.showActions) count++;
  return count;
});

const statusConfirmMeta = computed(() => {
  const { invoice, field } = pendingStatusChange.value;
  if (!invoice || !field) {
    return {
      title: 'تایید تغییر وضعیت',
      message: 'آیا از انجام این تغییر مطمئن هستید؟',
      confirmLabel: 'بله، اعمال شود'
    };
  }

  const isShipped = field === 'is_shipped';
  const currentValue = Boolean(invoice[field]);
  const nextValue = !currentValue;
  const label = isShipped ? 'وضعیت ارسال' : 'وضعیت تسویه';
  const nextState = nextValue
    ? (isShipped ? 'ارسال شده' : 'تسویه شده')
    : (isShipped ? 'ارسال نشده' : 'تسویه نشده');

  return {
    title: `تغییر ${label}`,
    message: `آیا می‌خواهید ${label} به «${nextState}» تغییر کند؟`,
    confirmLabel: 'بله، تغییر بده'
  };
});

const activeInvoiceNotes = computed(() => getInvoiceNotes(activeNotesInvoice.value));
const notesModalInvoiceLabel = computed(() => {
  if (!activeNotesInvoice.value) return '';
  return `فاکتور ${toPersianDate(activeNotesInvoice.value.date)}`;
});

function getInvoiceNotes(invoice) {
  return String(invoice?.notes || invoice?.description || '').trim();
}

function hasInvoiceNotes(invoice) {
  return Boolean(getInvoiceNotes(invoice));
}

function openNotesModal(invoice) {
  activeNotesInvoice.value = invoice;
  showNotesModal.value = true;
}

function closeNotesModal() {
  showNotesModal.value = false;
  activeNotesInvoice.value = null;
}

function getSortIndicator(column) {
  if (props.sortKey !== column) return '↕';
  return props.sortDirection === 'asc' ? '↑' : '↓';
}

function handleStatusChange(invoice, field) {
  pendingStatusChange.value = { invoice, field };
  showStatusConfirm.value = true;
}

function closeStatusConfirm() {
  if (confirmingStatus.value) return;
  showStatusConfirm.value = false;
  pendingStatusChange.value = { invoice: null, field: '' };
}

async function confirmStatusChange() {
  const { invoice, field } = pendingStatusChange.value;
  if (!invoice || !field) return;

  const key = `${invoice.id}_${field}`;
  if (loadingStatus[key]) return;

  loadingStatus[key] = true;
  confirmingStatus.value = true;
  const newValue = !invoice[field];

  const result = await invoiceStore.updateStatus(invoice.id, field, newValue);
  loadingStatus[key] = false;
  confirmingStatus.value = false;
  showStatusConfirm.value = false;
  pendingStatusChange.value = { invoice: null, field: '' };

  if (result.success) {
    emit('status-change', { id: invoice.id, field, value: newValue });
    const label = field === 'is_shipped' ? 'وضعیت ارسال' : 'وضعیت تسویه';
    toast.success(`${label} تغییر کرد`);
  } else {
    toast.error(result.message);
  }
}
</script>
