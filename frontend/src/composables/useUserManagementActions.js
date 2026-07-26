import { computed, ref } from 'vue';
import { getApiErrorMessage } from '../utils/apiError';

export function useUserManagementActions({ invoiceStore, toast, reloadOverview, showUndo }) {
  const statusSavingId = ref(null);
  const showForm = ref(false);
  const selectedCustomer = ref(null);
  const showDeleteConfirm = ref(false);
  const deletingCustomer = ref(false);
  const deleteTargetCustomer = ref(null);

  const deleteConfirmMessage = computed(() => {
    const customer = deleteTargetCustomer.value;
    if (!customer) return 'آیا از حذف این کاربر اطمینان دارید؟ این عملیات قابل بازگشت نیست.';

    return `آیا از حذف کاربر ${customer.first_name} ${customer.last_name} مطمئن هستید؟ این عملیات قابل بازگشت نیست.`;
  });

  const refreshCustomers = () => Promise.all([
    reloadOverview(),
    invoiceStore.fetchCustomers()
  ]);

  function openAddModal() {
    selectedCustomer.value = null;
    showForm.value = true;
  }

  function openEditModal(customer) {
    selectedCustomer.value = customer;
    showForm.value = true;
  }

  function closeModal() {
    showForm.value = false;
    selectedCustomer.value = null;
  }

  function openDeleteModal(customer) {
    deleteTargetCustomer.value = customer;
    showDeleteConfirm.value = true;
  }

  function closeDeleteModal() {
    if (deletingCustomer.value) return;
    showDeleteConfirm.value = false;
    deleteTargetCustomer.value = null;
  }

  async function handleCustomerSaved() {
    await refreshCustomers();
  }

  function customerPayload(customer, accountStatus) {
    return {
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      phone: customer.phone || null,
      referrer: customer.referrer || null,
      account_status: accountStatus || null
    };
  }

  async function handleStatusChange(customer, value) {
    const previousStatus = customer.account_status || '';
    const nextStatus = String(value || '').trim();
    customer.account_status = nextStatus;
    statusSavingId.value = customer.id;

    const result = await invoiceStore.updateCustomer(
      customer.id,
      customerPayload(customer, nextStatus)
    );
    statusSavingId.value = null;

    if (!result.success) {
      customer.account_status = previousStatus;
      toast.error(result.message || 'به‌روزرسانی وضعیت حساب با خطا مواجه شد');
      return;
    }

    toast.success('وضعیت حساب با موفقیت ثبت شد');
    showUndo({
      title: 'وضعیت حساب تغییر کرد',
      message: 'در صورت نیاز، بازگردانی کن.',
      handler: async () => {
        const revertResult = await invoiceStore.updateCustomer(
          customer.id,
          customerPayload(customer, previousStatus)
        );
        if (!revertResult.success) throw new Error(revertResult.message);

        await refreshCustomers();
        toast.success('وضعیت حساب بازگردانی شد');
      }
    });
    await refreshCustomers();
  }

  async function restoreCustomer(customerSnapshot, invoiceSnapshots) {
    const restoredCustomer = await invoiceStore.addCustomer({
      first_name: customerSnapshot.first_name || '',
      last_name: customerSnapshot.last_name || '',
      phone: customerSnapshot.phone || null,
      referrer: customerSnapshot.referrer || null,
      notes: customerSnapshot.notes || null,
      account_status: customerSnapshot.account_status || null
    }, { allowExisting: false });

    if (!restoredCustomer.success || !restoredCustomer.data?.id) {
      throw new Error(restoredCustomer.message || 'بازگردانی کاربر ممکن نشد');
    }

    for (const invoice of invoiceSnapshots) {
      const invoiceResult = await invoiceStore.addInvoice({
        customer_id: restoredCustomer.data.id,
        date: invoice.date,
        price: invoice.price,
        description: invoice.description || null,
        notes: invoice.notes || null
      });
      if (!invoiceResult.success) {
        throw new Error(invoiceResult.message || 'بازگردانی یکی از فاکتورها با خطا مواجه شد');
      }
    }

    await Promise.all([
      reloadOverview(),
      invoiceStore.fetchCustomers(),
      invoiceStore.fetchAllInvoices()
    ]);
    toast.success('کاربر و فاکتورهایش بازگردانی شدند');
  }

  async function confirmDeleteCustomer() {
    const customerId = deleteTargetCustomer.value?.id;
    if (!customerId || deletingCustomer.value) return;

    try {
      const snapshotResponse = await invoiceStore.fetchCustomerInvoiceSnapshot(customerId);
      const customerSnapshot = snapshotResponse?.customer;
      const invoiceSnapshots = snapshotResponse?.invoices || [];

      deletingCustomer.value = true;
      const result = await invoiceStore.deleteCustomer(customerId);
      deletingCustomer.value = false;

      if (!result.success) {
        toast.error(result.message || 'حذف کاربر با خطا مواجه شد');
        return;
      }

      toast.success('کاربر با موفقیت حذف شد');
      closeDeleteModal();
      if (customerSnapshot) {
        showUndo({
          title: 'کاربر حذف شد',
          message: 'در 5 ثانیه آینده می‌توانی او را برگردانی.',
          handler: () => restoreCustomer(customerSnapshot, invoiceSnapshots)
        });
      }
      await refreshCustomers();
    } catch (error) {
      deletingCustomer.value = false;
      toast.error(getApiErrorMessage(error, 'حذف کاربر با خطا مواجه شد'));
    }
  }

  return {
    statusSavingId,
    showForm,
    selectedCustomer,
    showDeleteConfirm,
    deletingCustomer,
    deleteTargetCustomer,
    deleteConfirmMessage,
    openAddModal,
    openEditModal,
    closeModal,
    openDeleteModal,
    closeDeleteModal,
    handleCustomerSaved,
    handleStatusChange,
    confirmDeleteCustomer
  };
}
