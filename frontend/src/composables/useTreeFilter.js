import { computed, unref } from 'vue';

function normalizeTreeQuery(query) {
  return String(query || '').trim().toLowerCase();
}

export function filterTree(nodes, query, getLabel = (node) => node.name) {
  const normalized = normalizeTreeQuery(query);
  if (!normalized) return nodes;

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children || [], normalized, getLabel);
      const selfMatch = String(getLabel(node) || '').toLowerCase().includes(normalized);

      if (selfMatch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }

      return null;
    })
    .filter(Boolean);
}

export function useTreeFilter(nodes, query, options = {}) {
  const getLabel = options.getLabel || ((node) => node.name);
  const filteredTree = computed(() => filterTree(unref(nodes), unref(query), getLabel));

  return {
    filteredTree
  };
}
