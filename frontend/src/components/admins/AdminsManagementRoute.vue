<template>
  <div ref="tableSectionRef">
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block @click="openAddModal">افزودن ادمین</AppButton>
    </Teleport>

    <AppTablePanel title="مدیریت ادمین‌ها"
      description="مدیر اصلی می‌تواند حساب‌های ادمین را ایجاد، ویرایش، فعال یا غیرفعال کند."
      :count="loading ? null : filteredUsers.length">
      <template #filters>
        <AppFilterBar columns-class="md:grid-cols-3">
          <label class="space-y-1"><span class="text-xs font-bold text-slate-600">نام ادمین</span>
            <input v-model.trim="nameFilter" class="app-filter-control" type="search" placeholder="جست‌وجوی نام ادمین" /></label>
          <label class="space-y-1"><span class="text-xs font-bold text-slate-600">نام کاربری</span>
            <input v-model.trim="usernameFilter" class="app-filter-control" type="search" placeholder="جست‌وجوی نام کاربری" dir="ltr" /></label>
          <label class="space-y-1"><span class="text-xs font-bold text-slate-600">وضعیت دسترسی</span>
            <CustomSelect v-model="statusFilter" :options="statusFilterOptions" trigger-class="app-filter-control" /></label>
          <template #actions><AppButton variant="secondary" @click="clearFilters">پاک‌کردن فیلترها</AppButton></template>
        </AppFilterBar>
      </template>
      <AppDataTable class="admins-table" :column-count="6" :loading="loading" :empty="!filteredUsers.length"
        min-width="100%" loading-message="در حال دریافت حساب‌های داخلی..."
        empty-message="حسابی با این مشخصات پیدا نشد.">
        <template #head>
          <tr><th>ردیف</th><th>نام</th><th>نام کاربری</th><th>نقش</th><th>وضعیت</th><th>عملیات</th></tr>
        </template>

        <tr v-for="(user, index) in paginatedUsers" :key="user.id" class="app-table-row">
          <td class="text-center font-bold text-slate-500">{{ (rowStartIndex + index + 1).toLocaleString('fa-IR') }}</td>
          <td class="font-black text-slate-900">{{ user.display_name }}</td>
          <td class="text-center" dir="ltr">{{ user.username }}</td>
          <td class="text-center"><AppStatusBadge :label="user.role === 'MANAGER' ? 'مدیر' : 'ادمین'"
            :tone="user.role === 'MANAGER' ? 'violet' : 'info'" /></td>
          <td class="text-center"><AppStatusBadge group="active" :status="Boolean(user.is_active)" /></td>
          <td>
            <div v-if="user.role === 'ADMIN'" class="flex items-center justify-center gap-1">
              <AppIconButton label="ویرایش ادمین" size="sm" variant="primary" @click="openEditModal(user)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.5-9.5a2.1 2.1 0 0 1 3 3L12 15H9v-3z" /></svg>
              </AppIconButton>
              <AppIconButton :label="user.is_active ? 'غیرفعال‌کردن ادمین' : 'فعال‌کردن ادمین'" size="sm"
                :variant="user.is_active ? 'warning' : 'success'" :loading="statusSavingId === user.id"
                @click="requestStatusChange(user)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M12 3v9m6.4-5.4a9 9 0 1 1-12.8 0" /></svg>
              </AppIconButton>
              <AppIconButton label="حذف ادمین" size="sm" variant="danger" @click="openDeleteConfirm(user)">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-width="2" d="M6 7h12m-9 0V5h6v2m-8 0 1 13h8l1-13" /></svg>
              </AppIconButton>
            </div>
            <p v-else class="text-center text-xs text-slate-400">مدیر اصلی</p>
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
  <ConfirmModal :is-open="statusConfirmOpen" :title="pendingStatusAdmin?.is_active ? 'غیرفعال‌سازی ادمین' : 'فعال‌سازی ادمین'"
    :message="pendingStatusAdmin?.is_active ? `با غیرفعال‌کردن ${pendingStatusAdmin?.display_name || 'این ادمین'}، دسترسی او بلافاصله قطع می‌شود. ادامه می‌دهید؟` : `آیا دسترسی ${pendingStatusAdmin?.display_name || 'این ادمین'} دوباره فعال شود؟`"
    :loading="statusSavingId === pendingStatusAdmin?.id" :confirm-text="pendingStatusAdmin?.is_active ? 'بله، غیرفعال شود' : 'بله، فعال شود'"
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
import CustomSelect from '../CustomSelect.vue';
import AdminFormModal from './AdminFormModal.vue';
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
const nameFilter = ref('');
const usernameFilter = ref('');
const statusFilter = ref('all');
const tableSectionRef = ref(null);
const formOpen = ref(false);
const editingAdmin = ref(null);
const deleteConfirmOpen = ref(false);
const deletingAdmin = ref(null);
const deleting = ref(false);
const statusFilterOptions = [{ label: 'همه وضعیت‌ها', value: 'all' }, { label: 'فعال', value: 'active' }, { label: 'غیرفعال', value: 'inactive' }];
function normalize(value) { return String(value || '').trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }
const filteredUsers = computed(() => users.value.filter((user) => (
  (!nameFilter.value || normalize(user.display_name).includes(normalize(nameFilter.value)))
  && (!usernameFilter.value || normalize(user.username).includes(normalize(usernameFilter.value)))
  && (statusFilter.value === 'all' || (statusFilter.value === 'active' ? user.is_active : !user.is_active))
)));
const { currentPage, pageSize, pageSizeOptions, totalRows, totalPages, rowStartIndex,
  paginatedItems: paginatedUsers, visiblePageNumbers, goToPage } = usePaginatedList(filteredUsers, {
  initialPageSize: 15, pageSizeOptions: [10, 15, 20, 50],
  resetSources: [nameFilter, usernameFilter, statusFilter], scrollTarget: tableSectionRef
});
function clearFilters() { nameFilter.value = ''; usernameFilter.value = ''; statusFilter.value = 'all'; }

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
.admins-table :deep(.app-table) { width: 100%; table-layout: fixed; }
.admins-table :deep(.app-table-wrapper) { overflow-x: hidden; }
.admins-table :deep(th), .admins-table :deep(td) { padding: .7rem .5rem; vertical-align: middle; }
.admins-table :deep(th:nth-child(1)) { width: 7%; }
.admins-table :deep(th:nth-child(2)) { width: 24%; }
.admins-table :deep(th:nth-child(3)) { width: 22%; }
.admins-table :deep(th:nth-child(4)) { width: 13%; }
.admins-table :deep(th:nth-child(5)) { width: 14%; }
.admins-table :deep(th:nth-child(6)) { width: 20%; }
@media (max-width: 767px) {
  .admins-table :deep(th:nth-child(4)), .admins-table :deep(td:nth-child(4)) { display: none; }
  .admins-table :deep(th:nth-child(1)) { width: 10%; }
  .admins-table :deep(th:nth-child(2)) { width: 25%; }
  .admins-table :deep(th:nth-child(3)) { width: 25%; }
  .admins-table :deep(th:nth-child(5)) { width: 17%; }
  .admins-table :deep(th:nth-child(6)) { width: 23%; }
}
</style>
