<template>
  <AppModal :is-open="isOpen" title="تغییر رمز عبور"
    description="برای امنیت حساب، ابتدا رمز فعلی را وارد کنید." :busy="saving" @close="close">
    <form id="change-password-form" class="space-y-4" @submit.prevent="submit">
      <AppFormField for-id="current-password" label="رمز عبور فعلی" required>
        <template #default="{ controlId }"><input :id="controlId" v-model="form.current" type="password"
          autocomplete="current-password" maxlength="128" dir="ltr" class="app-input h-12 text-left" /></template>
      </AppFormField>
      <AppFormField for-id="new-password" label="رمز عبور جدید" :error="passwordError" required>
        <template #default="{ controlId, describedBy }"><input :id="controlId" v-model="form.next" type="password"
          autocomplete="new-password" maxlength="128" dir="ltr" class="app-input h-12 text-left"
          :aria-describedby="describedBy" /></template>
      </AppFormField>
      <AppFormField for-id="confirm-password" label="تکرار رمز عبور جدید" required>
        <template #default="{ controlId }"><input :id="controlId" v-model="form.confirm" type="password"
          autocomplete="new-password" maxlength="128" dir="ltr" class="app-input h-12 text-left" /></template>
      </AppFormField>
    </form>
    <template #footer>
      <AppButton type="submit" form="change-password-form" variant="primary" :loading="saving">ثبت رمز جدید</AppButton>
      <AppButton variant="secondary" :disabled="saving" @click="close">انصراف</AppButton>
    </template>
  </AppModal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';
import AppButton from '../ui/AppButton.vue';
import AppFormField from '../ui/AppFormField.vue';
import AppModal from '../ui/AppModal.vue';

const props = defineProps({ isOpen: { type: Boolean, default: false }, saving: { type: Boolean, default: false } });
const emit = defineEmits(['close', 'submit']);
const form = reactive({ current: '', next: '', confirm: '' });
const passwordError = computed(() => {
  if (form.next && form.next.length < 6) return 'رمز جدید باید حداقل ۶ کاراکتر باشد.';
  if (form.confirm && form.next !== form.confirm) return 'تکرار رمز عبور با رمز جدید یکسان نیست.';
  return '';
});
function close() { if (!props.saving) emit('close'); }
function submit() {
  if (!form.current || !form.next || !form.confirm || passwordError.value) return;
  emit('submit', { current_password: form.current, new_password: form.next });
}
watch(() => props.isOpen, (open) => { if (open) Object.assign(form, { current: '', next: '', confirm: '' }); });
</script>
