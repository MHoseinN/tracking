<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" class="app-button-primary w-full" :disabled="creating" @click="createNewDraft">
        {{ creating ? 'در حال ایجاد...' : 'ایجاد لیست جدید' }}
      </button>
      <button type="button" class="app-button-secondary w-full" @click="loadDrafts">به‌روزرسانی</button>
    </Teleport>

    <section class="app-panel overflow-hidden">
      <div class="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-black text-slate-900">پیش‌نویس لیست‌ها</h2>
          <p class="mt-1 text-xs text-slate-500">هر پیش‌نویس مستقل است و می‌توانید بعداً تکمیلش کنید.</p>
        </div>
        <input v-model.trim="searchQuery" type="search" placeholder="جست‌وجوی نام مشتری یا سازنده..."
          class="h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 md:w-80" />
      </div>

      <AppContentState v-if="draftStore.loading" loading message="در حال دریافت پیش‌نویس‌ها..." />
      <AppContentState v-else-if="!filteredDrafts.length" message="پیش‌نویسی برای نمایش وجود ندارد." />

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[980px]">
          <thead class="border-b border-slate-100 bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">ردیف</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">مشتری</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">زمان تحویل</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">برگشت تقریبی</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">اقلام</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">ایجادکننده</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">آخرین ذخیره</th>
              <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(draft, index) in filteredDrafts" :key="draft.id"
              class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              <td class="px-4 py-4 text-sm text-slate-500">{{ formatNumber(index + 1) }}</td>
              <td class="px-4 py-4 text-sm font-bold text-slate-800">{{ draft.customer_name || 'نامشخص' }}</td>
              <td class="px-4 py-4 text-sm text-slate-600">{{ formatDateTime(draft.delivered_at) }}</td>
              <td class="px-4 py-4 text-sm text-slate-600">{{ formatDateTime(draft.expected_return_at) }}</td>
              <td class="px-4 py-4 text-sm text-slate-600">{{ formatNumber(draft.item_count) }} قلم</td>
              <td class="px-4 py-4 text-sm text-slate-600">{{ draft.created_by_name || '—' }}</td>
              <td class="px-4 py-4 text-sm text-slate-500">{{ formatDateTime(draft.last_autosaved_at) }}</td>
              <td class="px-4 py-4">
                <div class="flex gap-2">
                  <button type="button" class="app-button-secondary px-3 py-2 text-xs"
                    @click="router.push(`/lists/${draft.id}/edit`)">ادامه ویرایش</button>
                  <button type="button" class="app-button-secondary border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                    @click="draftToDelete = draft">حذف</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <ConfirmModal :is-open="Boolean(draftToDelete)" title="حذف پیش‌نویس"
      :message="`پیش‌نویس ${draftToDelete?.customer_name ? `مشتری «${draftToDelete.customer_name}»` : 'بدون نام'} و تمام اقلام آن حذف شود؟`"
      :loading="deleting" confirm-text="بله، حذف شود" loading-text="در حال حذف..."
      @confirm="confirmDelete" @cancel="draftToDelete = null" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { toPersianDate } from '../../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const draftStore = useDeliveryListStore();
const searchQuery = ref('');
const creating = ref(false);
const deleting = ref(false);
const draftToDelete = ref(null);

const filteredDrafts = computed(() => {
  const query = searchQuery.value.toLowerCase();
  if (!query) return draftStore.drafts;
  return draftStore.drafts.filter((draft) =>
    String(draft.customer_name || '').toLowerCase().includes(query)
    || String(draft.created_by_name || '').toLowerCase().includes(query)
  );
});

onMounted(loadDrafts);

async function loadDrafts() {
  try { await draftStore.fetchDrafts(); }
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
