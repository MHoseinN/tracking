<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"
      @click.self="$emit('close')">
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-[0_32px_100px_rgba(15,23,42,0.28)]">
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">{{ isEdit ? 'ویرایش محصول' : 'افزودن محصول جدید' }}</h2>
            <p class="mt-1 text-xs text-slate-500">محصول موجودی محدودکننده ندارد و قیمت بر اساس یک روز ثبت می‌شود.</p>
          </div>
          <button type="button" class="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
            @click="$emit('close')">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="space-y-5 px-6 py-6" @submit.prevent="handleSubmit">
          <div class="grid gap-5 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">نام محصول</span>
              <input v-model.trim="form.name" type="text" maxlength="255" placeholder="دوربین Sony A7 IV"
                class="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">قیمت یک روز (تومان)</span>
              <input v-model.number="form.daily_price_toman" type="number" min="0" step="1000" placeholder="0" dir="ltr"
                class="h-12 w-full rounded-lg border border-slate-200 px-4 text-left text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </label>
          </div>

          <label class="block space-y-2">
            <span class="text-sm font-semibold text-slate-700">دسته‌بندی محصول</span>
            <CustomSelect :model-value="selectedCategoryId" :options="categoryOptions" placeholder="بدون دسته‌بندی"
              trigger-class="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm shadow-sm"
              @update:model-value="selectedCategoryId = $event" />
          </label>

          <label class="block space-y-2">
            <span class="text-sm font-semibold text-slate-700">توضیحات</span>
            <textarea v-model.trim="form.notes" rows="3" maxlength="5000"
              class="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"></textarea>
          </label>

          <label v-if="isEdit && priceChanged" class="block space-y-2">
            <span class="text-sm font-semibold text-slate-700">دلیل تغییر قیمت <span class="font-normal text-slate-400">(اختیاری)</span></span>
            <input v-model.trim="form.price_change_reason" type="text" maxlength="500" placeholder="مثلاً قیمت جدید سال"
              class="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
          </label>

          <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-4">
            <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600" />
            <span class="text-sm font-semibold text-slate-700">محصول فعال و قابل انتخاب باشد</span>
          </label>

          <p v-if="errors.form" class="rounded-lg bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{{ errors.form }}</p>

          <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" class="h-12 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              @click="$emit('close')">انصراف</button>
            <button type="submit" :disabled="saving"
              class="h-12 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60">
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
  daily_price_toman: 0,
  notes: '',
  is_active: true,
  price_change_reason: ''
}, {
  validate: (values) => {
    if (!String(values.name || '').trim()) return { form: 'نام محصول را وارد کنید' };
    if (!Number.isInteger(Number(values.daily_price_toman)) || Number(values.daily_price_toman) < 0) {
      return { form: 'قیمت روزانه باید عدد صحیح صفر یا بیشتر باشد' };
    }
    return { form: '' };
  }
});

const isEdit = computed(() => Boolean(props.product?.id));
const priceChanged = computed(() => Number(form.daily_price_toman) !== Number(props.product?.daily_price_toman || 0));
const categoryOptions = computed(() => [
  { label: 'بدون دسته‌بندی', value: '' },
  ...props.categories.map((category) => ({ label: category.label || category.name, value: category.id }))
]);

function resetForm() {
  setValues({
    name: props.product?.name || '',
    daily_price_toman: props.product?.daily_price_toman ?? 0,
    notes: props.product?.notes || '',
    is_active: props.product?.is_active ?? true,
    price_change_reason: ''
  });
  selectedCategoryId.value = props.product?.category_id || '';
}

async function handleSubmit() {
  await submit(async (values) => {
    emit('save', {
      name: values.name.trim(),
      daily_price_toman: Number(values.daily_price_toman),
      category_id: selectedCategoryId.value || null,
      notes: values.notes.trim() || null,
      is_active: Boolean(values.is_active),
      price_change_reason: values.price_change_reason.trim() || null
    });
    return { success: true };
  });
}

watch(() => [props.isOpen, props.product], ([isOpen]) => {
  if (isOpen) resetForm();
}, { deep: true });
</script>
