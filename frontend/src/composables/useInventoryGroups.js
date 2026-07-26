import { computed } from 'vue';

export function useInventoryGroups({ units, categories, searchTerm, statusFilter, selectedCategoryId }) {
  function isCategoryDescendant(categoryId, ancestorId) {
    let current = categories.value.find((category) => String(category.id) === String(categoryId));
    while (current?.parent_id) {
      if (String(current.parent_id) === String(ancestorId)) return true;
      current = categories.value.find((category) => String(category.id) === String(current.parent_id));
    }
    return false;
  }

  const filteredUnits = computed(() => {
    const query = searchTerm.value.trim().toLowerCase();
    return units.value.filter((unit) => {
      const matchesSearch = !query || [unit.product_name, unit.category_name, unit.customer_name]
        .some((field) => String(field || '').toLowerCase().includes(query));
      const matchesCategory = !selectedCategoryId.value
        || String(unit.category_id) === String(selectedCategoryId.value)
        || isCategoryDescendant(unit.category_id, selectedCategoryId.value);
      const normalizedStatus = unit.status === 'reserved' ? 'reserved' : 'available';
      const matchesStatus = statusFilter.value === 'all' || normalizedStatus === statusFilter.value;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  });

  const groupedProducts = computed(() => {
    const groups = new Map();
    filteredUnits.value.forEach((unit) => {
      if (!groups.has(unit.product_id)) {
        groups.set(unit.product_id, {
          product_id: unit.product_id,
          product_name: unit.product_name,
          category_name: unit.category_name,
          total_units: 0,
          reserved_units: 0,
          available_units: 0,
          units: []
        });
      }
      const group = groups.get(unit.product_id);
      group.units.push(unit);
      group.total_units += 1;
      group[unit.status === 'reserved' ? 'reserved_units' : 'available_units'] += 1;
    });
    return Array.from(groups.values()).sort((left, right) => left.product_name.localeCompare(right.product_name, 'fa'));
  });

  return { filteredUnits, groupedProducts };
}
