export function getStatusBadgeClass(active, variant = 'success-danger') {
  if (variant === 'info-warning') {
    return active
      ? 'border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'
      : 'border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200';
  }

  return active
    ? 'border-emerald-300 bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
    : 'border-rose-300 bg-rose-100 text-rose-700 hover:bg-rose-200';
}

export function getAccountStatusTone(status) {
  switch (status) {
    case 'خوش حساب':
      return 'border-emerald-300 text-emerald-700 bg-emerald-50';
    case 'بد حساب':
      return 'border-rose-300 text-rose-700 bg-rose-50';
    case 'پرداخت نقدی':
      return 'border-blue-300 text-blue-700 bg-blue-50';
    case 'هماهنگی با مدیر':
      return 'border-amber-300 text-amber-700 bg-amber-50';
    default:
      return 'border-gray-300 text-gray-500 bg-white';
  }
}
