<template>
  <div class="space-y-5">
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block :loading="creating" @click="createNewDraft">
        {{ creating ? 'در حال ایجاد...' : 'ایجاد لیست جدید' }}
      </AppButton>
    </Teleport>

    <AppTablePanel
      title="لیست‌های تحویل"
      description="پیش‌نویس‌ها و لیست‌های ثبت‌شده در یک جدول قابل پیگیری هستند."
      :count="draftStore.loading ? null : filteredDrafts.length"
    >
      <template #filters>
        <AppFilterBar columns-class="md:grid-cols-[minmax(0,1fr)_240px]">
          <input
            v-model.trim="searchQuery"
            type="search"
            placeholder="جست‌وجوی شماره لیست، نام مشتری یا ایجادکننده..."
            class="app-filter-control"
          />
          <CustomSelect
            v-model="statusFilter"
            :options="statusOptions"
            trigger-class="app-filter-control"
          />
          <template #actions>
            <AppButton variant="secondary" @click="loadLists">به‌روزرسانی</AppButton>
          </template>
        </AppFilterBar>
      </template>

      <AppDataTable
        :column-count="9"
        :loading="draftStore.loading"
        :empty="!filteredDrafts.length"
        min-width="1150px"
        sticky-header
        loading-message="در حال دریافت لیست‌ها..."
        empty-message="لیستی با این جست‌وجو یا فیلتر پیدا نشد."
      >
        <template #head>
          <tr>
            <th>شماره لیست</th>
            <th>مشتری</th>
            <th>زمان تحویل</th>
            <th>تاریخ برگشت</th>
            <th>وضعیت لیست</th>
            <th>وضعیت فاکتور</th>
            <th>وضعیت تسویه</th>
            <th>ایجادکننده</th>
            <th>عملیات</th>
          </tr>
        </template>

        <tr v-for="draft in filteredDrafts" :key="draft.id" class="app-table-row">
          <td class="font-bold text-indigo-700">{{ draft.list_number || `پیش‌نویس #${draft.id}` }}</td>
          <td class="font-bold text-slate-900">{{ draft.customer_name || 'نامشخص' }}</td>
          <td>{{ formatDateTime(draft.delivered_at) }}</td>
          <td>{{ draft.last_returned_at ? formatDateTime(draft.last_returned_at) : '' }}</td>
          <td><AppStatusBadge group="list" :status="draft.status" /></td>
          <td>
            <div class="flex flex-col items-start gap-2">
              <AppStatusBadge group="invoice" :status="draft.invoice_status" />
              <AppStatusBadge
                v-if="draft.invoice_status !== 'NONE' && draft.invoice_status !== 'PROFORMA'"
                group="send"
                :status="draft.invoice_send_status"
              />
            </div>
          </td>
          <td>
            <AppStatusButton
              v-if="draft.status !== 'DRAFT'"
              group="settlement"
              :status="draft.settlement_status"
              :aria-label="`مدیریت تسویه لیست ${draft.list_number || draft.id}`"
              @click="openSettlement(draft)"
            />
            <AppStatusBadge v-else group="settlement" :status="draft.settlement_status" />
          </td>
          <td>{{ draft.created_by_name || '—' }}</td>
          <td>
            <div class="flex flex-wrap gap-2">
              <AppButton
                v-if="draft.status === 'DRAFT'"
                size="sm"
                variant="secondary"
                @click="router.push(`/lists/${draft.id}/edit`)"
              >ادامه ویرایش</AppButton>
              <AppButton v-else size="sm" variant="secondary" @click="router.push(`/lists/${draft.id}`)">
                مشاهده جزئیات
              </AppButton>
              <AppButton v-if="draft.status === 'DRAFT'" size="sm" variant="danger" @click="draftToDelete = draft">
                حذف
              </AppButton>
            </div>
          </td>
        </tr>
      </AppDataTable>
    </AppTablePanel>

    <ConfirmModal :is-open="Boolean(draftToDelete)" title="حذف پیش‌نویس"
      :message="`پیش‌نویس ${draftToDelete?.customer_name ? `مشتری «${draftToDelete.customer_name}»` : 'بدون نام'} و تمام اقلام آن حذف شود؟`"
      :loading="deleting" confirm-text="بله، حذف شود" loading-text="در حال حذف..."
      @confirm="confirmDelete" @cancel="draftToDelete = null" />
    <DeliverySettlementModal :is-open="showSettlementModal" :summary="settlementSummary" :saving="settlementSaving"
      @close="showSettlementModal = false" @record="handleRecordPayment" @void="handleVoidPayment" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import ConfirmModal from '../ConfirmModal.vue';
import CustomSelect from '../CustomSelect.vue';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFilterBar from '../ui/AppFilterBar.vue';
import AppStatusBadge from '../ui/AppStatusBadge.vue';
import AppStatusButton from '../ui/AppStatusButton.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import DeliverySettlementModal from './DeliverySettlementModal.vue';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { toPersianDate } from '../../utils/dateConverter';
import { STATUS_GROUPS } from '../../utils/statusStyles';

const router = useRouter();
const toast = useToast();
const draftStore = useDeliveryListStore();
const searchQuery = ref('');
const statusFilter = ref('all');
const creating = ref(false);
const deleting = ref(false);
const draftToDelete = ref(null);
const showSettlementModal = ref(false);
const settlementSummary = ref(null);
const settlementSaving = ref(false);

const statusOptions = [
  { label: 'همه وضعیت‌ها', value: 'all' },
  ...Object.entries(STATUS_GROUPS.list).map(([value, meta]) => ({ value, label: meta.label }))
];

const filteredDrafts = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return draftStore.lists.filter((draft) => {
    const matchesStatus = statusFilter.value === 'all' || draft.status === statusFilter.value;
    const matchesQuery = !query
      || String(draft.customer_name || '').toLowerCase().includes(query)
      || String(draft.created_by_name || '').toLowerCase().includes(query)
      || String(draft.list_number || '').toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });
});

onMounted(loadLists);

async function loadLists() {
  try { await draftStore.fetchLists(); }
  catch (_error) { toast.error(draftStore.error); }
}

async function createNewDraft() {
  if (creating.value) return;
  creating.value = true;
  const result = await draftStore.createDraft();
  creating.value = false;
  if (!result.success) return toast.error(result.message);
  router.push(`/lists/${result.data.id}/edit`);
}

async function confirmDelete() {
  if (!draftToDelete.value || deleting.value) return;
  deleting.value = true;
  const result = await draftStore.deleteDraft(draftToDelete.value.id);
  deleting.value = false;
  if (!result.success) return toast.error(result.message);
  toast.success('پیش‌نویس حذف شد');
  draftToDelete.value = null;
}

async function openSettlement(list) {
  const result = await draftStore.getSettlement(list.id);
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  showSettlementModal.value = true;
}

async function handleRecordPayment(payload) {
  if (settlementSaving.value) return;
  settlementSaving.value = true;
  const result = await draftStore.recordPayment(settlementSummary.value.list.id, payload);
  settlementSaving.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  toast.success('پرداخت ثبت شد');
}

async function handleVoidPayment(paymentId) {
  if (settlementSaving.value) return;
  settlementSaving.value = true;
  const result = await draftStore.voidPayment(settlementSummary.value.list.id, paymentId);
  settlementSaving.value = false;
  if (!result.success) return toast.error(result.message);
  settlementSummary.value = result.data;
  toast.success('پرداخت باطل شد و وضعیت تسویه دوباره محاسبه شد');
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fa-IR');
}

function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  const date = toPersianDate(text.slice(0, 10));
  const time = text.length >= 16 ? text.slice(11, 16) : '';
  return `${date}${time ? ` - ${time}` : ''}`;
}
</script>
