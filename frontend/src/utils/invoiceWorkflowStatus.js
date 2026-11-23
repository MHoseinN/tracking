export function invoiceWorkflowStatus(list) {
  if (!list || list.status === 'DRAFT') return 'NONE';
  const returns = list.return_events || [];
  const pending = list.pending_invoice_item_count == null
    ? returns.flatMap((event) => event.items || []).filter((item) =>
      !item.rental_invoice_id && !item.invoice_excluded_at).length
    : Number(list.pending_invoice_item_count);
  if (pending > 0) return 'WAITING';
  const issued = list.issued_invoice_count == null
    ? (list.invoices?.length || 0) : Number(list.issued_invoice_count);
  const remaining = list.remaining_quantity == null
    ? (list.items || []).reduce((sum, item) => sum + Number(item.remaining_quantity || 0), 0)
    : Number(list.remaining_quantity);
  if (issued > 0) return remaining > 0 ? 'PARTIALLY_ISSUED' : 'ISSUED';
  if ((list.last_returned_at || returns.length) && remaining === 0) return 'NO_INVOICE_NEEDED';
  return 'NONE';
}
