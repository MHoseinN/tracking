<template>
  <div class="space-y-5 px-5 py-5 sm:px-6">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">نام</label>
        <input :value="draft.first_name" type="text" placeholder="نام"
          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          @input="$emit('update-field', 'first_name', $event.target.value)" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">نام خانوادگی</label>
        <input :value="draft.last_name" type="text" placeholder="نام خانوادگی"
          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          @input="$emit('update-field', 'last_name', $event.target.value)" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">شماره تماس</label>
        <input :value="draft.phone" type="text" placeholder="شماره تماس"
          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          :class="{ 'border-rose-300 focus:border-rose-400 focus:ring-rose-100': phoneDuplicateError }"
          @input="$emit('update-field', 'phone', $event.target.value)" />
        <p v-if="phoneDuplicateError" class="mt-1 text-xs text-rose-500">{{ phoneDuplicateError }}</p>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">معرف</label>
        <input :value="draft.referrer" type="text" placeholder="معرف"
          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          @input="$emit('update-field', 'referrer', $event.target.value)" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">وضعیت حساب</label>
        <CustomSelect :model-value="draft.account_status" :options="accountStatusSelectOptions"
          placeholder="وضعیت حساب"
          trigger-class="rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md"
          @update:model-value="$emit('update-field', 'account_status', $event)" />
      </div>
    </div>

    <div class="grid gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
      <div>
        <textarea :value="notes" rows="7" placeholder="درباره این مشتری بنویسید..."
          class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          @input="$emit('update:notes', $event.target.value)"></textarea>
      </div>

      <div class="flex h-full flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div class="space-y-2">
          <p class="text-sm font-semibold text-slate-700">وضعیت فرم</p>
          <div class="rounded-lg bg-white px-3 py-3 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
            <span v-if="changed" class="font-semibold text-amber-600">تغییرات ذخیره نشده</span>
            <span v-else class="font-semibold text-emerald-600">همه چیز به روز است</span>
          </div>
        </div>

        <button :disabled="saving || !changed" type="button"
          class="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          @click="$emit('save')">
          <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ saving ? 'در حال ذخیره...' : 'ذخیره اطلاعات ' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import CustomSelect from '../CustomSelect.vue';

defineProps({
  draft: { type: Object, required: true },
  notes: { type: String, default: '' },
  accountStatusSelectOptions: { type: Array, default: () => [] },
  phoneDuplicateError: { type: String, default: '' },
  changed: { type: Boolean, default: false },
  saving: { type: Boolean, default: false }
});

defineEmits(['update-field', 'update:notes', 'save']);
</script>
