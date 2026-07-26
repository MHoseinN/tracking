import { ref } from 'vue';

export function useCustomerInvoiceActions({ invoiceStore, customerId, reloadInvoices, toast, showUndo }) {
  const showInvoiceForm = ref(false);
  const selectedInvoice = ref(null);
  const showConfirmDelete = ref(false);
  const deleteTargetId = ref(null);
  const deleting = ref(false);

  function openAddModal() {
    selectedInvoice.value = null;
    showInvoiceForm.value = true;
  }

  function openEditModal(invoice) {
    selectedInvoice.value = invoice;
    showInvoiceForm.value = true;
  }

  function closeInvoiceForm() {
    showInvoiceForm.value = false;
    selectedInvoice.value = null;
  }

  function openDeleteModal(invoiceId) {
    deleteTargetId.value = invoiceId;
    showConfirmDelete.value = true;
  }

  async function handleSaveInvoice({ data, isEdit }) {
    const result = isEdit && selectedInvoice.value
      ? await invoiceStore.updateInvoice(selectedInvoice.value.id, data)
      : await invoiceStore.addInvoice(data);

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(isEdit ? 'فاکتور با موفقیت ویرایش شد' : 'فاکتور با موفقیت اضافه شد');
    closeInvoiceForm();
    await reloadInvoices();
  }

  async function handleDeleteInvoice() {
    if (!deleteTargetId.value || deleting.value) return;
    deleting.value = true;
    const result = await invoiceStore.deleteInvoice(deleteTargetId.value);
    deleting.value = false;

    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('فاکتور با موفقیت حذف شد');
    showConfirmDelete.value = false;
    deleteTargetId.value = null;
    if (result.data) {
      showUndo({
        title: 'فاکتور حذف شد',
        message: 'در صورت نیاز، بازگردانی کن.',
        handler: async () => {
          const restoreResult = await invoiceStore.addInvoice({
            customer_id: customerId.value,
            date: result.data.date,
            price: result.data.price,
            description: result.data.description || null,
            notes: result.data.notes || null
          });
          if (!restoreResult.success) throw new Error(restoreResult.message);
          await reloadInvoices();
          toast.success('فاکتور بازگردانی شد');
        }
      });
    }
    await reloadInvoices();
  }

  async function handleStatusChange({ id, field, value }) {
    await reloadInvoices();
    showUndo({
      title: 'وضعیت فاکتور تغییر کرد',
      message: 'اگر اشتباه بوده، بازگردانی کن.',
      handler: async () => {
        const revertResult = await invoiceStore.updateStatus(id, field, !value);
        if (!revertResult.success) throw new Error(revertResult.message);
        await reloadInvoices();
        toast.success('وضعیت فاکتور بازگردانی شد');
      }
    });
  }

  return {
    showInvoiceForm,
    selectedInvoice,
    showConfirmDelete,
    deleteTargetId,
    deleting,
    openAddModal,
    openEditModal,
    closeInvoiceForm,
    openDeleteModal,
    handleSaveInvoice,
    handleDeleteInvoice,
    handleStatusChange
  };
}
