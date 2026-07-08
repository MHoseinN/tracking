<template>
  <div>
  <Teleport to="#app-shell-actions">
    <button type="button" @click="openCategoryModal()" class="app-button-primary w-full">افزودن دسته‌بندی</button>
    <button type="button" @click="openProductModal()" class="app-button-success w-full">افزودن محصول</button>
    <button type="button" :disabled="!selectedCategoryObject" @click="openCategoryModal({ parent_id: selectedCategoryObject?.id || null })" class="app-button-secondary w-full disabled:opacity-50">افزودن زیرشاخه</button>
    <button type="button" :disabled="!selectedCategoryObject" @click="openCategoryModal(selectedCategoryObject)" class="app-button-secondary w-full disabled:opacity-50">ویرایش دسته</button>
    <button type="button" :disabled="!selectedCategoryObject" @click="showDeleteCategoryModal = true" class="app-button w-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus:ring-rose-100 disabled:opacity-50">حذف دسته</button>
    <button type="button" class="app-button-secondary w-full" @click="router.push('/inventory')">بازگشت به رزرو</button>
  </Teleport>

  <div class="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
    <aside
      class="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.06)] xl:sticky xl:top-28 xl:max-h-[calc(100vh-8.5rem)] xl:self-start xl:overflow-hidden">
      <div class="flex h-full min-h-0 flex-col space-y-4">
        <div class="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
          <svg class="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
          </svg>
          <input v-model.trim="treeSearch" type="text" placeholder="جستجو در شاخه‌ها..."
            class="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
        </div>

        <div class="min-h-0 flex-1 space-y-2">
          <button type="button" class="w-full rounded-xl px-3 py-2 text-right text-sm font-semibold transition"
            :class="selectedCategoryId ? 'text-slate-700 hover:bg-slate-50' : 'bg-blue-50 text-blue-700'"
            @click="selectedCategoryId = null">
            همه دسته‌ها
          </button>

          <button type="button" :disabled="!selectedCategoryObject"
            class="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            @click="openCategoryModal({ parent_id: selectedCategoryObject?.id || null })">
            افزودن زیرشاخه به دسته انتخاب‌شده
          </button>

          <div v-if="filteredTree.length"
            class="max-h-[320px] space-y-1 overflow-y-auto pl-1 pr-1 xl:max-h-[calc(100vh-20rem)]">
            <CategoryTreeItem v-for="node in filteredTree" :key="node.id" :node="node" :selected-id="selectedCategoryId"
              @select="selectedCategoryId = $event.id" />
          </div>
          <p v-else class="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">شاخه‌ای پیدا نشد.</p>
        </div>
      </div>
    </aside>

    <section class="space-y-6">
      <section class="rounded-xl border border-slate-200 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
          <div>
            <h2 class="text-xl font-black text-slate-900">محصولات {{ selectedCategoryObject?.name || 'همه شاخه‌ها' }}
            </h2>
            <p class="mt-2 text-sm text-slate-500">{{ visibleProducts.length.toLocaleString('fa-IR') }} محصول نمایش
              داده می‌شود.</p>
          </div>
        </div>

        <div class="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div class="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
              <svg class="h-5 w-5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
              <input v-model.trim="productSearch" type="text" placeholder="جستجوی لحظه‌ای در محصولات همین شاخه..."
                class="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
            </div>

            <div class="flex flex-wrap gap-3">
              <button type="button" :disabled="!selectedCategoryObject"
                class="inline-flex h-12 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="openCategoryModal({ parent_id: selectedCategoryObject?.id || null })">
                افزودن زیرشاخه
              </button>
              <button type="button" :disabled="!selectedCategoryObject"
                class="inline-flex h-12 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="openCategoryModal(selectedCategoryObject)">
                ویرایش دسته
              </button>
              <button type="button" :disabled="!selectedCategoryObject"
                class="inline-flex h-12 items-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                @click="showDeleteCategoryModal = true">
                حذف دسته
              </button>
            </div>
          </div>
        </div>

        <AppContentState
          v-if="inventoryStore.loading"
          loading
          message="در حال بارگذاری..."
          surface-class="border-0 bg-transparent px-5 py-16 shadow-none"
        />

        <AppContentState
          v-else-if="visibleProducts.length === 0"
          message="محصولی برای این شاخه پیدا نشد."
          surface-class="border-0 bg-transparent px-5 py-16 shadow-none"
        />

        <div v-else class="divide-y divide-slate-100">
          <article v-for="product in visibleProducts" :key="product.id"
            class="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{{
                  product.category_name || 'بدون دسته‌بندی' }}</span>
                <span class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {{ product.total_quantity.toLocaleString('fa-IR') }} واحد
                </span>
              </div>
              <h3 class="text-lg font-black text-slate-900">{{ product.name }}</h3>
              <p v-if="product.notes" class="text-sm text-slate-500">{{ product.notes }}</p>
            </div>

            <div class="flex flex-wrap gap-2">
              <button type="button"
                class="inline-flex h-11 items-center rounded-xl border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                @click="openProductModal(product)">
                ویرایش
              </button>
              <button type="button"
                class="inline-flex h-11 items-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                @click="openDeleteProduct(product)">
                حذف
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>
  </div>

  <InventoryCategoryModal :is-open="showCategoryModal" :category="selectedCategoryForModal"
    :categories="flatCategoryOptions" :saving="savingCategory" @close="closeCategoryModal" @save="handleSaveCategory" />

  <InventoryProductModal :is-open="showProductModal" :product="selectedProduct" :categories="flatCategoryOptions"
    :saving="savingProduct" @close="closeProductModal" @save="handleSaveProduct" />

  <ConfirmModal :is-open="showDeleteCategoryModal" title="حذف دسته‌بندی"
    :message="selectedCategoryObject ? `آیا دسته‌بندی «${selectedCategoryObject.name}» حذف شود؟` : 'آیا این دسته‌بندی حذف شود؟'"
    :loading="deleting" @confirm="handleDeleteCategory" @cancel="showDeleteCategoryModal = false" />

  <ConfirmModal :is-open="showDeleteProductModal" title="حذف محصول" :message="deleteProductMessage" :loading="deleting"
    @confirm="handleDeleteProduct" @cancel="showDeleteProductModal = false" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../components/AppContentState.vue';
import CategoryTreeItem from '../components/CategoryTreeItem.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import InventoryCategoryModal from '../components/InventoryCategoryModal.vue';
import InventoryProductModal from '../components/InventoryProductModal.vue';
import { useInventoryStore } from '../stores/inventoryStore';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();

const treeSearch = ref('');
const productSearch = ref('');
const selectedCategoryId = ref(null);
const showCategoryModal = ref(false);
const showProductModal = ref(false);
const showDeleteCategoryModal = ref(false);
const showDeleteProductModal = ref(false);
const savingCategory = ref(false);
const savingProduct = ref(false);
const deleting = ref(false);
const selectedCategoryForModal = ref(null);
const selectedProduct = ref(null);
const deleteProductTarget = ref(null);

onMounted(async () => {
  await loadData();
});

const categoryTree = computed(() => inventoryStore.lookups.category_tree || []);
const selectedCategoryObject = computed(() => inventoryStore.lookups.categories.find((item) => String(item.id) === String(selectedCategoryId.value)) || null);
const flatCategoryOptions = computed(() => {
  const result = [];
  const walk = (nodes, depth = 0) => {
    nodes.forEach((node) => {
      result.push({
        id: node.id,
        name: node.name,
        parent_id: node.parent_id,
        label: `${'— '.repeat(depth)}${node.name}`
      });
      if (node.children?.length) walk(node.children, depth + 1);
    });
  };
  walk(categoryTree.value);
  return result;
});

const filteredTree = computed(() => filterTree(categoryTree.value, treeSearch.value));
const visibleProducts = computed(() => {
  const query = productSearch.value.trim().toLowerCase();
  return inventoryStore.lookups.products.filter((product) => {
    const matchesSearch = !query
      || String(product.name || '').toLowerCase().includes(query)
      || String(product.category_name || '').toLowerCase().includes(query);

    const matchesCategory = !selectedCategoryId.value || String(product.category_id) === String(selectedCategoryId.value)
      || isCategoryDescendant(product.category_id, selectedCategoryId.value);

    return matchesSearch && matchesCategory;
  });
});

const deleteProductMessage = computed(() => deleteProductTarget.value?.name
  ? `آیا محصول «${deleteProductTarget.value.name}» حذف شود؟`
  : 'آیا این محصول حذف شود؟'
);

async function loadData() {
  try {
    await inventoryStore.fetchLookups();
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت اطلاعات مدیریت محصول');
  }
}

function filterTree(nodes, query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return nodes;

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children || [], normalized);
      const selfMatch = String(node.name || '').toLowerCase().includes(normalized);
      if (selfMatch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean);
}

function isCategoryDescendant(categoryId, selectedId) {
  const categories = inventoryStore.lookups.categories;
  let current = categories.find((item) => String(item.id) === String(categoryId));
  while (current?.parent_id) {
    if (String(current.parent_id) === String(selectedId)) return true;
    current = categories.find((item) => String(item.id) === String(current.parent_id));
  }
  return false;
}

function openCategoryModal(category = null) {
  selectedCategoryForModal.value = category
    ? { ...category }
    : { parent_id: selectedCategoryId.value || null };
  showCategoryModal.value = true;
}

function closeCategoryModal() {
  showCategoryModal.value = false;
  selectedCategoryForModal.value = null;
}

function openProductModal(product = null) {
  selectedProduct.value = product
    ? { ...product }
    : { category_id: selectedCategoryId.value || null };
  showProductModal.value = true;
}

function closeProductModal() {
  showProductModal.value = false;
  selectedProduct.value = null;
}

function openDeleteProduct(product) {
  deleteProductTarget.value = product;
  showDeleteProductModal.value = true;
}

async function handleSaveCategory(payload) {
  savingCategory.value = true;
  const isEdit = Boolean(selectedCategoryForModal.value?.id);
  const result = isEdit
    ? await inventoryStore.updateCategory(selectedCategoryForModal.value.id, payload)
    : await inventoryStore.createCategory(payload);
  savingCategory.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  closeCategoryModal();
  await loadData();
  toast.success(isEdit ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی ثبت شد');
}

async function handleSaveProduct(payload) {
  savingProduct.value = true;
  const normalizedPayload = {
    ...payload,
    category_id: payload.category_id || selectedCategoryId.value || null
  };
  const isEdit = Boolean(selectedProduct.value?.id);
  const result = isEdit
    ? await inventoryStore.updateProduct(selectedProduct.value.id, normalizedPayload)
    : await inventoryStore.createProduct(normalizedPayload);
  savingProduct.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  closeProductModal();
  await loadData();
  toast.success(isEdit ? 'محصول ویرایش شد' : 'محصول ثبت شد');
}

async function handleDeleteCategory() {
  if (!selectedCategoryObject.value?.id) return;
  deleting.value = true;
  const result = await inventoryStore.deleteCategory(selectedCategoryObject.value.id);
  deleting.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  showDeleteCategoryModal.value = false;
  selectedCategoryId.value = null;
  await loadData();
  toast.success('دسته‌بندی حذف شد');
}

async function handleDeleteProduct() {
  if (!deleteProductTarget.value?.id) return;
  deleting.value = true;
  const result = await inventoryStore.deleteProduct(deleteProductTarget.value.id);
  deleting.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  showDeleteProductModal.value = false;
  deleteProductTarget.value = null;
  await loadData();
  toast.success('محصول حذف شد');
}
</script>
