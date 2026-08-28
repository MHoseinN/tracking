<template>
  <aside
    class="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-8.5rem)]">
    <div class="flex h-full min-h-0 flex-col space-y-4">
      <div class="min-h-0 flex-1 space-y-2">
        <button type="button" class="w-full rounded-lg px-3 py-2 text-right text-sm font-semibold transition"
          :class="selectedCategoryId ? 'text-slate-700' : 'bg-blue-100 text-blue-700'" @click="$emit('select', null)">
          همه محصولات
        </button>

        <div v-if="categoryTree.length"
          class="max-h-[320px] space-y-1 overflow-y-auto pl-1 pr-1 xl:max-h-[calc(100vh-20rem)]">
          <CategoryTreeItem v-for="category in categoryTree" :key="category.id" :node="category"
            :selected-id="selectedCategoryId" :expanded-by-parent="expandedByParent" parent-key="root"
            @toggle="handleToggle" @select="$emit('select', $event.id)" />
        </div>
        <p v-else class="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">شاخه‌ای پیدا نشد.</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import CategoryTreeItem from '../CategoryTreeItem.vue';

const expandedByParent = ref({});

defineProps({
  categoryTree: { type: Array, default: () => [] },
  selectedCategoryId: { type: [String, Number], default: null }
});

defineEmits(['select']);

function handleToggle({ id, parentKey }) {
  expandedByParent.value = {
    ...expandedByParent.value,
    [parentKey]: String(expandedByParent.value[parentKey] || '') === String(id) ? null : id
  };
}
</script>
