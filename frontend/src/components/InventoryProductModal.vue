<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4">
      <div class="max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-[0_32px_100px_rgba(15,23,42,0.28)]">
        <div class="border-b border-slate-100 px-6 py-5">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="mt-2 text-2xl font-bold text-slate-900">
                {{ isEdit ? 'ویرایش محصول' : 'افزودن محصول جدید' }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              @click="$emit('close')"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form class="space-y-5 px-6 py-6" @submit.prevent="handleSubmit">
          <div class="grid gap-5 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">نام محصول</span>
              <input
                v-model.trim="form.name"
                type="text"
                class="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                placeholder="دوربین A7 IV"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">تعداد محصول</span>
              <input
                v-model.number="form.total_quantity"
                type="number"
                min="1"
                class="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                placeholder="0"
              />
            </label>
          </div>

          <label class="block space-y-2">
            <span class="text-sm font-semibold text-slate-700">دسته‌بندی محصول</span>
            <CustomSelect
              :model-value="selectedCategoryId"
              :options="categoryOptions"
              placeholder="انتخاب شاخه دقیق محصول"
              trigger-class="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm shadow-sm transition hover:border-slate-300 hover:shadow-md"
              @update:model-value="handleCategorySelect"
            />
            <div class="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span class="font-semibold text-slate-800">شاخه انتخاب‌شده:</span>
              {{ selectedCategoryLabel || 'هنوز شاخه‌ای انتخاب نشده است' }}
            </div>
          </label>

          <p v-if="errors.form" class="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {{ errors.form }}
          </p>

          <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="h-12 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="$emit('close')"
            >
              انصراف
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="h-12 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ saving ? 'در حال ذخیره...' : isEdit ? 'ذخیره تغییرات' : 'ثبت محصول' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import CustomSelect from './CustomSelect.vue';
import { useFormState } from '../composables/useFormState';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  product: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'save']);

const selectedCategoryId = ref('');
const { form, errors, setValues, submit } = useFormState({
  name: '',
  total_quantity: 0,
  notes: ''
}, {
  validate: (values) => {
    if (!String(values.name || '').trim()) return { form: 'نام محصول را وارد کنید' };
    if (Number(values.total_quantity) < 1) return { form: 'تعداد محصول باید حداقل 1 باشد' };
    if (!selectedCategoryId.value) return { form: 'شاخه دقیق محصول را از دسته‌بندی‌های موجود انتخاب کن' };
    return { form: '' };
  }
});

const isEdit = computed(() => Boolean(props.product?.id));
const categoryOptions = computed(() => props.categories.map((category) => ({
  label: category.label || category.name,
  value: category.id
})));

function resetForm() {
  setValues({
    name: props.product?.name,
    total_quantity: props.product?.total_quantity ?? 0,
    notes: props.product?.notes
  });
  selectedCategoryId.value = props.product?.category_id || '';
}

function handleCategorySelect(value) {
  selectedCategoryId.value = value;
}

const selectedCategoryLabel = computed(() =>
  categoryOptions.value.find((option) => String(option.value) === String(selectedCategoryId.value))?.label || ''
);

async function handleSubmit() {
  await submit(async (values) => {
    emit('save', {
      name: values.name.trim(),
      total_quantity: Number(values.total_quantity) || 0,
      category_id: selectedCategoryId.value || null,
      notes: values.notes.trim() || null
    });

    return { success: true };
  });
}

watch(() => props.isOpen, (value) => {
  if (value) {
    resetForm();
  }
});

watch(() => props.product, () => {
  if (props.isOpen) {
    resetForm();
  }
});
</script>
