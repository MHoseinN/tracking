<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4"
      @click.self="$emit('close')">
      <form class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" @submit.prevent="submitForm">
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">{{ admin ? 'ویرایش ادمین' : 'افزودن ادمین' }}</h2>
            <p class="mt-1 text-xs text-slate-500">تمام ادمین‌ها دسترسی عملیاتی یکسان دارند.</p>
          </div>
          <button type="button" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100" @click="$emit('close')">
            <span class="sr-only">بستن</span>
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">نام نمایشی</label>
            <input v-model.trim="form.display_name" type="text" maxlength="100" autocomplete="name"
              class="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100" />
            <p v-if="errors.display_name" class="mt-1 text-xs text-rose-600">{{ errors.display_name }}</p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">نام کاربری</label>
            <input v-model.trim="form.username" type="text" maxlength="50" autocomplete="username" dir="ltr"
              class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100" />
            <p v-if="errors.username" class="mt-1 text-xs text-rose-600">{{ errors.username }}</p>
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700">
              رمز عبور
              <span v-if="admin" class="font-normal text-slate-400">(برای حفظ رمز فعلی خالی بگذارید)</span>
            </label>
            <input v-model="form.password" type="password" maxlength="128" autocomplete="new-password"
              class="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100" />
            <p v-if="errors.password" class="mt-1 text-xs text-rose-600">{{ errors.password }}</p>
          </div>

          <label v-if="admin" class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4">
            <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600" />
            <span class="text-sm font-medium text-slate-700">حساب ادمین فعال باشد</span>
          </label>
        </div>

        <div class="mt-7 flex gap-3">
          <button type="submit" :disabled="saving" class="app-button-primary flex-1 justify-center disabled:opacity-50">
            {{ saving ? 'در حال ذخیره...' : 'ذخیره ادمین' }}
          </button>
          <button type="button" :disabled="saving" class="app-button-secondary flex-1 justify-center" @click="$emit('close')">
            انصراف
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  admin: { type: Object, default: null },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'save']);

const form = reactive({ display_name: '', username: '', password: '', is_active: true });
const errors = reactive({ display_name: '', username: '', password: '' });

function resetForm() {
  form.display_name = props.admin?.display_name || '';
  form.username = props.admin?.username || '';
  form.password = '';
  form.is_active = props.admin?.is_active ?? true;
  errors.display_name = '';
  errors.username = '';
  errors.password = '';
}

function submitForm() {
  errors.display_name = form.display_name ? '' : 'نام نمایشی الزامی است';
  errors.username = form.username.length >= 3 ? '' : 'نام کاربری باید حداقل ۳ کاراکتر باشد';
  errors.password = (!props.admin && form.password.length < 6) || (form.password && form.password.length < 6)
    ? 'رمز عبور باید حداقل ۶ کاراکتر باشد'
    : '';

  if (errors.display_name || errors.username || errors.password) return;

  emit('save', {
    display_name: form.display_name,
    username: form.username,
    password: form.password || undefined,
    is_active: form.is_active
  });
}

watch(() => [props.isOpen, props.admin], resetForm, { deep: true, immediate: true });
</script>
