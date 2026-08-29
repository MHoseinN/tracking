<template>
  <div ref="tableSectionRef">
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block @click="openAddModal">افزودن ادمین</AppButton>
    </Teleport>

    <AppTablePanel title="مدیریت ادمین‌ها">
      <template #filters>
        <AppFilterBar columns-class="md:grid-cols-1">
          <label class="app-filter-field"><span class="app-filter-label">جستجوی ادمین</span>
            <input v-model.trim="searchQuery" class="app-filter-control" type="search"
              placeholder="نام، نام کاربری یا شماره تماس" /></label>
        </AppFilterBar>
      </template>
      <AppDataTable class="admins-table" :column-count="10" :loading="loading" :empty="!filteredUsers.length"
        min-width="100%" loading-message="در حال دریافت حساب‌های داخلی..."
        empty-message="حسابی با این مشخصات پیدا نشد.">
        <template #head>
          <tr>
            <th>ردیف</th>
            <th>نام</th>
            <th>نام خانوادگی</th>
            <th>نام کاربری</th>
            <th>شماره تماس</th>
            <th>نقش</th>
            <th>وضعیت</th>
            <th>تحویل</th>
            <th>دریافت</th>
            <th>عملیات</th>
          </tr>
        </template>

        <tr v-for="(user, index) in paginatedUsers" :key="user.id" class="app-table-row">
          <td class="text-center font-bold text-slate-500">{{ (rowStartIndex + index + 1).toLocaleString('fa-IR') }}
          </td>
          <td class="text-center font-black text-slate-900">{{ user.first_name || user.display_name }}</td>
          <td class="text-center font-bold text-slate-700">{{ user.last_name || '—' }}</td>
          <td class="text-center" dir="ltr">{{ user.username }}</td>
          <td class="text-center" dir="ltr">{{ user.phone || '—' }}</td>
          <td class="text-center">
            <AppStatusBadge :label="user.role === 'MANAGER' ? 'مدیر' : 'ادمین'"
              :tone="user.role === 'MANAGER' ? 'violet' : 'info'" />
          </td>
          <td class="text-center">
            <AppStatusBadge group="active" :status="Boolean(user.is_active)" />
          </td>
          <td class="text-center font-black text-teal-700">{{ formatNumber(user.delivered_count) }}</td>
          <td class="text-center font-black text-emerald-700">{{ formatNumber(user.received_count) }}</td>
          <td>
            <div class="flex items-center justify-center gap-1">
              <AppIconButton label="آمار عملکرد" size="sm" @click="performanceAdmin = user">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-width="2" d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
                </svg>
              </AppIconButton>
              <template v-if="user.role === 'ADMIN'">
                <AppIconButton label="ویرایش ادمین" size="sm" variant="primary" @click="openEditModal(user)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.5-9.5a2.1 2.1 0 0 1 3 3L12 15H9v-3z" />
                  </svg>
                </AppIconButton>
                <AppIconButton :label="user.is_active ? 'غیرفعال‌کردن ادمین' : 'فعال‌کردن ادمین'" size="sm"
                  :variant="user.is_active ? 'warning' : 'success'" :loading="statusSavingId === user.id"
                  @click="requestStatusChange(user)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-width="2" d="M12 3v9m6.4-5.4a9 9 0 1 1-12.8 0" />
                  </svg>
                </AppIconButton>
                <AppIconButton label="حذف ادمین" size="sm" variant="danger" @click="openDeleteConfirm(user)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-width="2" d="M6 7h12m-9 0V5h6v2m-8 0 1 13h8l1-13" />
                  </svg>
                </AppIconButton>
              </template>
            </div>
          </td>
        </tr>
      </AppDataTable>
      <template #footer>
        <AppPagination :total-rows="totalRows" :row-start-index="rowStartIndex" :page-size="pageSize"
          :page-size-options="pageSizeOptions" :current-page="currentPage" :total-pages="totalPages"
          :visible-page-numbers="visiblePageNumbers" @update:page-size="pageSize = $event" @go-to-page="goToPage" />
      </template>
    </AppTablePanel>
  </div>

  <AdminFormModal :is-open="formOpen" :admin="editingAdmin" :saving="saving" @close="closeForm" @save="saveAdmin" />
  <AdminPerformanceModal :is-open="Boolean(performanceAdmin)" :admin="performanceAdmin"
    @close="performanceAdmin = null" />
  <ConfirmModal :is-open="statusConfirmOpen"
    :title="pendingStatusAdmin?.is_active ? 'غیرفعال‌سازی ادمین' : 'فعال‌سازی ادمین'"
    :message="pendingStatusAdmin?.is_active ? `با غیرفعال‌کردن ${pendingStatusAdmin?.display_name || 'این ادمین'}، دسترسی او بلافاصله قطع می‌شود. ادامه می‌دهید؟` : `آیا دسترسی ${pendingStatusAdmin?.display_name || 'این ادمین'} دوباره فعال شود؟`"
    :loading="statusSavingId === pendingStatusAdmin?.id"
    :confirm-text="pendingStatusAdmin?.is_active ? 'بله، غیرفعال شود' : 'بله، فعال شود'"
    loading-text="در حال تغییر وضعیت..." @confirm="confirmStatusChange" @cancel="closeStatusConfirm" />
  <ConfirmModal :is-open="deleteConfirmOpen" title="حذف ادمین"
    :message="`آیا از حذف حساب ${deletingAdmin?.display_name || ''} مطمئن هستید؟`" :loading="deleting"
    confirm-text="بله، حذف شود" loading-text="در حال حذف..." @confirm="confirmDelete" @cancel="closeDeleteConfirm" />
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useToast } from 'vue-toastification';
import AppPagination from '../AppPagination.vue';
import ConfirmModal from '../ConfirmModal.vue';
import AdminFormModal from './AdminFormModal.vue';
import AdminPerformanceModal from './AdminPerformanceModal.vue';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFilterBar from '../ui/AppFilterBar.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppStatusBadge from '../ui/AppStatusBadge.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { getApiErrorMessage } from '../../utils/apiError';
import { createAdmin, deleteAdmin, getAdmins, updateAdmin, updateAdminStatus } from '../../modules/admins/api/admin.service';

const toast = useToast();
const users = ref([]);
const loading = ref(false);
const saving = ref(false);
const statusSavingId = ref(null);
const statusConfirmOpen = ref(false);
const pendingStatusAdmin = ref(null);
const searchQuery = ref('');
const performanceAdmin = ref(null);
const tableSectionRef = ref(null);
const formOpen = ref(false);
const editingAdmin = ref(null);
const deleteConfirmOpen = ref(false);
const deletingAdmin = ref(null);
const deleting = ref(false);
function normalize(value) { return String(value || '').trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }
const filteredUsers = computed(() => users.value.filter((user) => {
  const query = normalize(searchQuery.value);
  return !query || normalize(`${user.first_name || ''} ${user.last_name || ''} ${user.display_name} ${user.username} ${user.phone || ''}`).includes(query);
}));
const { currentPage, pageSize, pageSizeOptions, totalRows, totalPages, rowStartIndex,
  paginatedItems: paginatedUsers, visiblePageNumbers, goToPage } = usePaginatedList(filteredUsers, {
    initialPageSize: 15, pageSizeOptions: [10, 15, 20, 50],
    resetSources: [searchQuery], scrollTarget: tableSectionRef
  });
function clearFilters() { searchQuery.value = ''; }
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('fa-IR'); }

async function loadAdmins() {
  loading.value = true;
  try { const response = await getAdmins(); users.value = response.data.users || []; }
  catch (error) { toast.error(getApiErrorMessage(error, 'دریافت حساب‌های ادمین با خطا مواجه شد')); }
  finally { loading.value = false; }
}
function openAddModal() { editingAdmin.value = null; formOpen.value = true; }
function openEditModal(admin) { editingAdmin.value = { ...admin }; formOpen.value = true; }
function closeForm() { if (saving.value) return; formOpen.value = false; editingAdmin.value = null; }
async function saveAdmin(payload) {
  saving.value = true;
  try {
    if (editingAdmin.value) { await updateAdmin(editingAdmin.value.id, payload); toast.success('اطلاعات ادمین ویرایش شد'); }
    else { await createAdmin(payload); toast.success('ادمین جدید ساخته شد'); }
    saving.value = false; closeForm(); await loadAdmins();
  } catch (error) { saving.value = false; toast.error(getApiErrorMessage(error, 'ذخیره حساب ادمین با خطا مواجه شد')); }
}
function requestStatusChange(admin) { pendingStatusAdmin.value = admin; statusConfirmOpen.value = true; }
function closeStatusConfirm() { if (statusSavingId.value) return; statusConfirmOpen.value = false; pendingStatusAdmin.value = null; }
async function confirmStatusChange() {
  const admin = pendingStatusAdmin.value; if (!admin || statusSavingId.value) return; statusSavingId.value = admin.id;
  try { await updateAdminStatus(admin.id, !admin.is_active); toast.success(admin.is_active ? 'دسترسی ادمین غیرفعال شد' : 'دسترسی ادمین فعال شد'); await loadAdmins(); closeStatusConfirm(); }
  catch (error) { toast.error(getApiErrorMessage(error, 'تغییر وضعیت ادمین با خطا مواجه شد')); }
  finally { statusSavingId.value = null; statusConfirmOpen.value = false; pendingStatusAdmin.value = null; }
}
function openDeleteConfirm(admin) { deletingAdmin.value = admin; deleteConfirmOpen.value = true; }
function closeDeleteConfirm() { if (deleting.value) return; deleteConfirmOpen.value = false; deletingAdmin.value = null; }
async function confirmDelete() {
  if (!deletingAdmin.value || deleting.value) return; deleting.value = true;
  try { await deleteAdmin(deletingAdmin.value.id); toast.success('ادمین حذف شد'); deleting.value = false; closeDeleteConfirm(); await loadAdmins(); }
  catch (error) { deleting.value = false; toast.error(getApiErrorMessage(error, 'حذف ادمین با خطا مواجه شد')); }
}
onMounted(loadAdmins);
</script>

<style scoped>
.admins-table :deep(.app-table) {
  width: 100%;
  table-layout: fixed;
}

.admins-table :deep(.app-table-wrapper) {
  overflow-x: hidden;
}

.admins-table :deep(th) {
  text-align: center;
}

.admins-table :deep(th),
.admins-table :deep(td) {
  padding: .65rem .3rem;
  vertical-align: middle;
  overflow-wrap: anywhere;
}

.admins-table :deep(th:nth-child(1)) {
  width: 4%;
}

.admins-table :deep(th:nth-child(2)) {
  width: 9%;
}

.admins-table :deep(th:nth-child(3)) {
  width: 11%;
}

.admins-table :deep(th:nth-child(4)) {
  width: 11%;
}

.admins-table :deep(th:nth-child(5)) {
  width: 12%;
}

.admins-table :deep(th:nth-child(6)) {
  width: 8%;
}

.admins-table :deep(th:nth-child(7)) {
  width: 8%;
}

.admins-table :deep(th:nth-child(8)) {
  width: 7%;
}

.admins-table :deep(th:nth-child(9)) {
  width: 7%;
}

.admins-table :deep(th:nth-child(10)) {
  width: 23%;
}

@media (max-width: 767px) {

  .admins-table :deep(th:nth-child(5)),
  .admins-table :deep(td:nth-child(5)),
  .admins-table :deep(th:nth-child(6)),
  .admins-table :deep(td:nth-child(6)),
  .admins-table :deep(th:nth-child(7)),
  .admins-table :deep(td:nth-child(7)) {
    display: none;
  }

  .admins-table :deep(th:nth-child(1)) {
    width: 10%;
  }

  .admins-table :deep(th:nth-child(2)) {
    width: 15%;
  }

  .admins-table :deep(th:nth-child(3)) {
    width: 17%;
  }

  .admins-table :deep(th:nth-child(4)) {
    width: 18%;
  }

  .admins-table :deep(th:nth-child(8)) {
    width: 10%;
  }

  .admins-table :deep(th:nth-child(9)) {
    width: 10%;
  }

  .admins-table :deep(th:nth-child(10)) {
    width: 20%;
  }
}
</style>
