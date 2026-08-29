<template>
  <div class="app-filter-bar">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label v-if="showTextInput" class="app-filter-field">
        <span class="app-filter-label">جست‌وجوی مشتری</span>
        <input :value="textModelValue" type="search" :placeholder="textPlaceholder" class="app-filter-control"
          @input="$emit('update:textModelValue', $event.target.value)" />
      </label>
      <label class="app-filter-field">
        <span class="app-filter-label">تاریخ</span>
        <JalaliDatePicker :model-value="dateModelValue" input-class="app-filter-control !h-11"
          @update:modelValue="$emit('update:dateModelValue', $event)" />
      </label>
      <label class="app-filter-field">
        <span class="app-filter-label">وضعیت حساب</span>
        <CustomSelect :model-value="filterModelValue" :options="filterOptions" trigger-class="app-filter-control"
          @update:model-value="$emit('update:filterModelValue', $event)" />
      </label>
    </div>
    <div v-if="hasValue" class="flex justify-end">
      <button type="button" class="app-button-secondary" @click="$emit('clear')">پاک‌کردن فیلترها</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import CustomSelect from './CustomSelect.vue';
import JalaliDatePicker from './JalaliDatePicker.vue';

const props = defineProps({
  textModelValue: { type: String, default: '' },
  dateModelValue: { type: String, default: '' },
  filterModelValue: { type: String, default: 'all' },
  textPlaceholder: { type: String, default: 'جستجو' },
  showTextInput: { type: Boolean, default: true },
  searchIcon: { type: Boolean, default: true },
  filterOptions: {
    type: Array,
    default: () => ([
      { label: 'همه حساب‌ها', value: 'all' },
      { label: 'ارسال نشده', value: 'not_shipped' },
      { label: 'تسویه نشده', value: 'unsettled' }
    ])
  }
});

defineEmits(['update:textModelValue', 'update:dateModelValue', 'update:filterModelValue', 'clear']);

const hasValue = computed(() => Boolean(props.textModelValue?.trim() || props.dateModelValue));
</script>
