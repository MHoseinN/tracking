<template>
  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="(path, index) in iconPaths[name] || iconPaths.document" :key="index" :d="path" />
  </svg>
</template>

<script setup>
defineProps({ name: { type: String, required: true } });

const iconPaths = {
  back: ['M20 12H4', 'm11 5-7 7 7 7'],
  add: ['M12 5v14', 'M5 12h14'],
  userAdd: ['M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M3 20a7 7 0 0 1 14 0', 'M19 9v6', 'M16 12h6'],
  account: ['M3 6h18v14H3z', 'M3 10h18', 'M16 15h2'],
  chart: ['M4 20V4', 'M4 20h16', 'm8 15 3-4 3 2 5-6'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M4 17v3h16v-3'],
  history: ['M4 10a8 8 0 1 1-1 5', 'M4 4v6h6', 'M12 7v5l3 2'],
  document: ['M6 3h9l4 4v14H6z', 'M15 3v5h4', 'M9 12h7', 'M9 16h7'],
  documentAdd: ['M6 3h9l4 4v14H6z', 'M15 3v5h4', 'M12 11v7', 'M8.5 14.5h7'],
  edit: ['M4 20h4l11-11-4-4L4 16v4Z', 'm13 7 4 4'],
  return: ['M20 7v5a7 7 0 0 1-7 7H5', 'm9 15-4 4 4 4', 'M4 4h10v6H4z'],
  check: ['M4 12l5 5L20 6'],
  payment: ['M3 6h18v14H3z', 'M3 10h18', 'M16 15h2'],
  repair: ['M14 6a5 5 0 0 0 5 5l-9 9-4-4 9-9', 'M4 14 2 16l6 6 2-2'],
  folder: ['M3 6h7l2 2h9v12H3z'],
  layers: ['m12 3 9 5-9 5-9-5 9-5Z', 'm3 12 9 5 9-5', 'm3 16 9 5 9-5'],
  category: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  branch: ['M5 4v9a4 4 0 0 0 4 4h5', 'M12 14l3 3-3 3', 'M5 4h5'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 14h10l1-14', 'M10 11v6', 'M14 11v6'],
  save: ['M4 3h14l2 2v16H4z', 'M7 3v7h10V3', 'M8 21v-8h8v8'],
  backup: ['M4 7V4h16v3', 'M5 10h14v11H5z', 'M9 14h6']
};
</script>
