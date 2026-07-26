import { computed } from 'vue';
import { toGregorianDate } from '../utils/dateConverter';

export function useCustomerInvoiceList({ invoices, searchDate, statusFilter, sortKey, sortDirection }) {
  const filteredInvoices = computed(() => {
    const gregorianDate = searchDate.value ? toGregorianDate(searchDate.value) : '';
    return invoices.value.filter((invoice) => {
      const matchesDate = !gregorianDate || invoice.date === gregorianDate;
      const matchesStatus = statusFilter.value === 'all'
        || (statusFilter.value === 'not_shipped' && !invoice.is_shipped)
        || (statusFilter.value === 'unsettled' && !invoice.is_settled);
      return matchesDate && matchesStatus;
    });
  });

  const sortedInvoices = computed(() => [...filteredInvoices.value].sort((left, right) => {
    let comparison;
    if (sortKey.value === 'price') {
      comparison = (Number(left.price) || 0) - (Number(right.price) || 0);
    } else {
      comparison = String(left.date || '').localeCompare(String(right.date || ''));
      if (comparison === 0) comparison = (Number(left.id) || 0) - (Number(right.id) || 0);
    }
    return sortDirection.value === 'asc' ? comparison : -comparison;
  }));

  return { filteredInvoices, sortedInvoices };
}
