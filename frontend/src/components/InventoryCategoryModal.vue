<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
      <div class="w-full max-w-xl rounded-[2rem] bg-white shadow-[0_32px_100px_rgba(15,23,42,0.28)]">
        <div class="border-b border-slate-100 px-6 py-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs font-semibold tracking-[0.3em] text-slate-400">CATEGORY</p>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">{{ category?.id ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی' }}</h2>
            </div>
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              @click="$emit('close')"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form class="space-y-5 px-6 py-6" @submit.prevent="handleSubmit">
          <label class="block space-y-2">
            <span class="text-sm font-semibold text-slate-700">نام دسته‌بندی</span>
            <input
              v-model.trim="name"
              type="text"
              class="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="مثلا سونی یا نورپردازی"
            />
          </label>

          <datalist id="category-parent-options">
            <option v-for="option in parentOptions" :key="String(option.value || 'root')" :value="option.label"></option>
          </datalist>

          <label class="block space-y-2">
            <span class="text-sm font-semibold text-slate-700">دسته‌بندی والد</span>
            <input
              v-model.trim="parentName"
              list="category-parent-options"
              type="text"
              class="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="نام دسته والد را بنویس"
              @input="syncParentId"
            />
          </label>

          <p v-if="errorMessage" class="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {{ errorMessage }}
          </p>

          <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="h-12 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="$emit('close')"
            >
              انصراف
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="h-12 rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ saving ? 'در حال ذخیره...' : 'ذخیره دسته‌بندی' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  category: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'save']);

const name = ref('');
const parentId = ref('');
const parentName = ref('');
const errorMessage = ref('');

const parentOptions = computed(() => ([
  { label: 'بدون والد', value: '' },
  ...props.categories
    .filter((item) => !props.category?.id || item.id !== props.category.id)
    .map((item) => ({ label: item.label || item.name, value: item.id }))
]));

function resetForm() {
  name.value = props.category?.name || '';
  parentId.value = props.category?.parent_id || '';
  parentName.value = props.categories.find((item) => String(item.id) === String(parentId.value))?.name || '';
  errorMessage.value = '';
}

function syncParentId() {
  const matched = props.categories.find((item) => item.name === parentName.value.trim() || item.label === parentName.value.trim());
  parentId.value = matched?.id || '';
}

function handleSubmit() {
  errorMessage.value = '';
  if (!name.value.trim()) {
    errorMessage.value = 'نام دسته‌بندی را وارد کن';
    return;
  }

  emit('save', {
    name: name.value.trim(),
    parent_id: parentId.value || null
  });
}

watch(() => props.isOpen, (value) => {
  if (value) resetForm();
});

watch(() => props.category, () => {
  if (props.isOpen) resetForm();
});
</script>
