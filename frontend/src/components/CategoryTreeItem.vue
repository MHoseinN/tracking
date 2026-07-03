<template>
  <div class="space-y-1">
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-right text-sm transition"
      :class="isSelected ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'"
      @click="handleClick"
    >
      <span
        v-if="node.children?.length"
        class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500"
      >
        <svg class="h-4 w-4 transition" :class="expanded ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </span>
      <span v-else class="inline-flex h-6 w-6"></span>
      <span class="min-w-0 flex-1 truncate">{{ node.name }}</span>
    </button>

    <div v-if="expanded && node.children?.length" class="mr-4 space-y-1 border-r border-slate-200 pr-2">
      <CategoryTreeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  node: { type: Object, required: true },
  selectedId: { type: [String, Number, null], default: null }
});

const emit = defineEmits(['select']);
const expanded = ref(false);
const isSelected = computed(() => String(props.selectedId || '') === String(props.node.id));

function handleClick() {
  if (props.node.children?.length) {
    expanded.value = !expanded.value;
  }
  emit('select', props.node);
}
</script>
