<template>
  <aside class="rounded-lg border border-slate-200 bg-white px-2 py-4 shadow-md sticky top-4 max-h-[calc(100vh-8.5rem] overflow-hidden">
    <div class="flex h-full min-h-0 flex-col space-y-4">
      <div class="min-h-0 flex-1 space-y-2">
        <button type="button" class="w-full rounded-lg px-3 py-2 text-right text-sm font-semibold transition"
          :class="selectedCategoryId ? 'text-slate-700' : 'bg-blue-100 text-blue-700'" @click="$emit('select', null)">
          همه محصولات
        </button>
        <div v-if="filteredTree.length" class="space-y-1 overflow-y-auto pl-1 pr-1 max-h-[calc(100vh-20rem)]">
          <CategoryTreeItem v-for="node in filteredTree" :key="node.id" :node="node"
            :selected-id="selectedCategoryId" @select="$emit('select', $event.id)" />
        </div>
        <p v-else class="rounded-lg bg-white px-3 py-3 text-sm text-slate-500">شاخه‌ای پیدا نشد.</p>
      </div>
    </div>
  </aside>
</template>

<script setup>
import CategoryTreeItem from '../CategoryTreeItem.vue';

defineProps({
  filteredTree: { type: Array, default: () => [] },
  selectedCategoryId: { type: [String, Number], default: null }
});

defineEmits(['select']);
</script>
