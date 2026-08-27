<template>
  <AppModal
    :is-open="isOpen"
    :title="admin ? 'ویرایش ادمین' : 'افزودن ادمین'"
    description="تمام ادمین‌ها دسترسی عملیاتی یکسان دارند."
    size="md"
    :busy="saving"
    @close="$emit('close')"
  >
    <form id="admin-form" class="space-y-5" @submit.prevent="submitForm">
      <div class="grid gap-4 sm:grid-cols-2">
      <AppFormField for-id="admin-first-name" label="نام" :error="errors.first_name" required>
        <template #default="{ controlId, describedBy }">
          <input
            :id="controlId"
            v-model.trim="form.first_name"
            type="text"
            maxlength="50"
            autocomplete="given-name"
            class="app-input h-12"
            :aria-describedby="describedBy"
            :aria-invalid="Boolean(errors.first_name)"
          />
        </template>
      </AppFormField>
      <AppFormField for-id="admin-last-name" label="نام خانوادگی" :error="errors.last_name" required>
        <template #default="{ controlId, describedBy }"><input :id="controlId" v-model.trim="form.last_name"
          type="text" maxlength="70" autocomplete="family-name" class="app-input h-12"
          :aria-describedby="describedBy" :aria-invalid="Boolean(errors.last_name)" /></template>
      </AppFormField>
      </div>

      <AppFormField for-id="admin-username" label="نام کاربری" :error="errors.username" required>
        <template #default="{ controlId, describedBy }">
          <input
            :id="controlId"
            v-model.trim="form.username"
            type="text"
            maxlength="50"
            autocomplete="username"
            dir="ltr"
            class="app-input h-12 text-left"
            :aria-describedby="describedBy"
            :aria-invalid="Boolean(errors.username)"
          />
        </template>
      </AppFormField>

      <AppFormField for-id="admin-phone" label="شماره تماس">
        <template #default="{ controlId }">
          <input :id="controlId" v-model.trim="form.phone" type="text" maxlength="50"
            autocomplete="tel" dir="ltr" class="app-input h-12 text-left" />
        </template>
      </AppFormField>

      <AppFormField
        for-id="admin-password"
        label="رمز عبور"
        :hint="admin ? 'برای حفظ رمز فعلی، این فیلد را خالی بگذارید.' : ''"
        :error="errors.password"
        :required="!admin"
      >
        <template #default="{ controlId, describedBy }">
          <input
            :id="controlId"
            v-model="form.password"
            type="password"
            maxlength="128"
            autocomplete="new-password"
            dir="ltr"
            class="app-input h-12 text-left"
            :aria-describedby="describedBy"
            :aria-invalid="Boolean(errors.password)"
          />
        </template>
      </AppFormField>

      <label v-if="admin" class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-300 bg-slate-50 p-4">
        <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200" />
        <span class="text-sm font-medium text-slate-700">حساب ادمین فعال باشد</span>
      </label>
    </form>

    <template #footer>
      <AppButton type="submit" form="admin-form" variant="primary" size="lg" :loading="saving">
        {{ saving ? 'در حال ذخیره...' : 'ذخیره ادمین' }}
      </AppButton>
      <AppButton variant="secondary" size="lg" :disabled="saving" @click="$emit('close')">انصراف</AppButton>
    </template>
  </AppModal>
</template>

<script setup>
import { reactive, watch } from 'vue';
import AppButton from '../ui/AppButton.vue';
import AppFormField from '../ui/AppFormField.vue';
import AppModal from '../ui/AppModal.vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  admin: { type: Object, default: null },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'save']);

const form = reactive({ first_name: '', last_name: '', username: '', phone: '', password: '', is_active: true });
const errors = reactive({ first_name: '', last_name: '', username: '', password: '' });

function resetForm() {
  form.first_name = props.admin?.first_name || props.admin?.display_name || '';
  form.last_name = props.admin?.last_name || '';
  form.username = props.admin?.username || '';
  form.phone = props.admin?.phone || '';
  form.password = '';
  form.is_active = props.admin?.is_active ?? true;
  errors.first_name = '';
  errors.last_name = '';
  errors.username = '';
  errors.password = '';
}

function submitForm() {
  errors.first_name = form.first_name ? '' : 'نام الزامی است';
  errors.last_name = form.last_name ? '' : 'نام خانوادگی الزامی است';
  errors.username = form.username.length >= 3 ? '' : 'نام کاربری باید حداقل ۳ کاراکتر باشد';
  errors.password = (!props.admin && form.password.length < 6) || (form.password && form.password.length < 6)
    ? 'رمز عبور باید حداقل ۶ کاراکتر باشد'
    : '';

  if (errors.first_name || errors.last_name || errors.username || errors.password) return;

  emit('save', {
    first_name: form.first_name,
    last_name: form.last_name,
    display_name: `${form.first_name} ${form.last_name}`.trim(),
    username: form.username,
    phone: form.phone || null,
    password: form.password || undefined,
    is_active: form.is_active
  });
}

watch(() => [props.isOpen, props.admin], resetForm, { deep: true, immediate: true });
</script>
