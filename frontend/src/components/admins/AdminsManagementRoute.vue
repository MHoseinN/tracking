<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" class="app-button-primary w-full justify-between" @click="openAddModal">
        <span>افزودن ادمین</span>
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button type="button" class="app-button-secondary w-full justify-between" @click="router.back()">
        <span>بازگشت</span>
        <svg class="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </Teleport>

    <div class="rounded-lg border border-gray-200 bg-white">
      <div class="grid gap-4 border-b border-gray-100 p-4 md:grid-cols-3">
        <div class="relative md:col-span-2">
          <svg class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z" />
          </svg>
          <input v-model="searchQuery" type="search" placeholder="جستجو در نام یا نام کاربری"
            class="h-12 w-full rounded-lg border border-gray-200 bg-white p-4 pr-10 text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100" />
        </div>
        <select v-model="statusFilter"
          class="h-12 rounded-lg border border-gray-200 bg-white px-4 text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-100">
          <option value="all">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="inactive">غیرفعال</option>
        </select>
      </div>

      <AppContentState v-if="loading" loading message="در حال دریافت حساب‌های داخلی..."
        surface-class="border-0 bg-transparent py-16 shadow-none" />

      <div v-else class="table-container">
        <table class="w-full bg-white text-sm">
          <thead class="bg-blue-50">
            <tr>
              <th class="border border-gray-200 p-3 text-center font-semibold">ردیف</th>
              <th class="border border-gray-200 p-3 text-right font-semibold">نام</th>
              <th class="border border-gray-200 p-3 text-right font-semibold">نام کاربری</th>
              <th class="border border-gray-200 p-3 text-center font-semibold">نقش</th>
              <th class="border border-gray-200 p-3 text-center font-semibold">وضعیت</th>
              <th class="border border-gray-200 p-3 text-center font-semibold">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in filteredUsers" :key="user.id" class="transition hover:bg-blue-50">
              <td class="border border-gray-100 px-4 py-3 text-center">{{ (index + 1).toLocaleString('fa-IR') }}</td>
              <td class="border border-gray-100 px-4 py-3 font-medium">{{ user.display_name }}</td>
              <td class="border border-gray-100 px-4 py-3 text-left" dir="ltr">{{ user.username }}</td>
              <td class="border border-gray-100 px-4 py-3 text-center">
                <span class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="user.role === 'MANAGER' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'">
                  {{ user.role === 'MANAGER' ? 'مدیر' : 'ادمین' }}
                </span>
              </td>
              <td class="border border-gray-100 px-4 py-3 text-center">
                <span class="rounded-full px-3 py-1 text-xs font-semibold"
                  :class="user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                  {{ user.is_active ? 'فعال' : 'غیرفعال' }}
                </span>
              </td>
              <td class="border border-gray-100 px-4 py-3">
                <div v-if="user.role === 'ADMIN'" class="flex items-center justify-center gap-2">
                  <button type="button" class="rounded-lg bg-blue-100 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-200"
                    @click="openEditModal(user)">ویرایش</button>
                  <button type="button" class="rounded-lg px-3 py-2 text-xs font-semibold"
                    :class="user.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'"
                    :disabled="statusSavingId === user.id" @click="toggleStatus(user)">
                    {{ user.is_active ? 'غیرفعال‌کردن' : 'فعال‌کردن' }}
                  </button>
                  <button type="button" class="rounded-lg bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200"
                    @click="openDeleteConfirm(user)">حذف</button>
                </div>
                <p v-else class="text-center text-xs text-slate-400">حساب مدیر اصلی</p>
              </td>
            </tr>
            <tr v-if="!filteredUsers.length">
              <td colspan="6" class="px-4 py-12 text-center text-slate-500">حسابی با این مشخصات پیدا نشد.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <AdminFormModal :is-open="formOpen" :admin="editingAdmin" :saving="saving" @close="closeForm" @save="saveAdmin" />
  <ConfirmModal :is-open="deleteConfirmOpen" title="حذف ادمین"
    :message="`آیا از حذف حساب ${deletingAdmin?.display_name || ''} مطمئن هستید؟`"
    :loading="deleting" confirm-text="بله، حذف شود" loading-text="در حال حذف..."
    @confirm="confirmDelete" @cancel="closeDeleteConfirm" />
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import AdminFormModal from './AdminFormModal.vue';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  createAdmin,
  deleteAdmin,
  getAdmins,
  updateAdmin,
  updateAdminStatus
} from '../../modules/admins/api/admin.service';

const router = useRouter();
const toast = useToast();
const users = ref([]);
const loading = ref(false);
const saving = ref(false);
const statusSavingId = ref(null);
const searchQuery = ref('');
const statusFilter = ref('all');
const formOpen = ref(false);
const editingAdmin = ref(null);
const deleteConfirmOpen = ref(false);
const deletingAdmin = ref(null);
const deleting = ref(false);

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک');
}

const filteredUsers = computed(() => {
  const query = normalize(searchQuery.value);
  return users.value.filter((user) => {
    const matchesStatus = statusFilter.value === 'all'
      || (statusFilter.value === 'active' && user.is_active)
      || (statusFilter.value === 'inactive' && !user.is_active);
    const matchesQuery = !query
      || normalize(user.display_name).includes(query)
      || normalize(user.username).includes(query);
    return matchesStatus && matchesQuery;
  });
});

async function loadAdmins() {
  loading.value = true;
  try {
    const response = await getAdmins();
    users.value = response.data.users || [];
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'دریافت حساب‌های ادمین با خطا مواجه شد'));
  } finally {
    loading.value = false;
  }
}

function openAddModal() {
  editingAdmin.value = null;
  formOpen.value = true;
}

function openEditModal(admin) {
  editingAdmin.value = { ...admin };
  formOpen.value = true;
}

function closeForm() {
  if (saving.value) return;
  formOpen.value = false;
  editingAdmin.value = null;
}

async function saveAdmin(payload) {
  saving.value = true;
  try {
    if (editingAdmin.value) {
      await updateAdmin(editingAdmin.value.id, payload);
      toast.success('اطلاعات ادمین ویرایش شد');
    } else {
      await createAdmin(payload);
      toast.success('ادمین جدید ساخته شد');
    }
    saving.value = false;
    closeForm();
    await loadAdmins();
  } catch (error) {
    saving.value = false;
    toast.error(getApiErrorMessage(error, 'ذخیره حساب ادمین با خطا مواجه شد'));
  }
}

async function toggleStatus(admin) {
  statusSavingId.value = admin.id;
  try {
    await updateAdminStatus(admin.id, !admin.is_active);
    toast.success(admin.is_active ? 'دسترسی ادمین غیرفعال شد' : 'دسترسی ادمین فعال شد');
    await loadAdmins();
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'تغییر وضعیت ادمین با خطا مواجه شد'));
  } finally {
    statusSavingId.value = null;
  }
}

function openDeleteConfirm(admin) {
  deletingAdmin.value = admin;
  deleteConfirmOpen.value = true;
}

function closeDeleteConfirm() {
  if (deleting.value) return;
  deleteConfirmOpen.value = false;
  deletingAdmin.value = null;
}

async function confirmDelete() {
  if (!deletingAdmin.value || deleting.value) return;
  deleting.value = true;
  try {
    await deleteAdmin(deletingAdmin.value.id);
    toast.success('ادمین حذف شد');
    deleting.value = false;
    closeDeleteConfirm();
    await loadAdmins();
  } catch (error) {
    deleting.value = false;
    toast.error(getApiErrorMessage(error, 'حذف ادمین با خطا مواجه شد'));
  }
}

onMounted(loadAdmins);
</script>
