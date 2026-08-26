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
      <AppFormField for-id="admin-display-name" label="نام نمایشی" :error="errors.display_name" required>
        <template #default="{ controlId, describedBy }">
          <input
            :id="controlId"
            v-model.trim="form.display_name"
            type="text"
            maxlength="100"
            autocomplete="name"
            class="app-input h-12"
            :aria-describedby="describedBy"
            :aria-invalid="Boolean(errors.display_name)"
          />
        </template>
      </AppFormField>

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
