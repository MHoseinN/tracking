export const STATUS_GROUPS = Object.freeze({
  list: Object.freeze({
    DRAFT: { label: 'پیش‌نویس', tone: 'neutral' },
    DELIVERED: { label: 'تحویل‌شده', tone: 'info' },
    REMAINING: { label: 'مانده', tone: 'warning' },
    NEEDS_FOLLOW_UP: { label: 'نیاز به پیگیری', tone: 'danger' },
    COMPLETED: { label: 'تکمیل', tone: 'success' }
  }),
  invoice: Object.freeze({
    NONE: { label: 'بدون فاکتور', tone: 'neutral' },
    PROFORMA: { label: 'پیش‌فاکتور', tone: 'violet' },
    PARTIALLY_ISSUED: { label: 'صدور جزئی', tone: 'warning' },
    ISSUED: { label: 'صادرشده', tone: 'success' }
  }),
  send: Object.freeze({
    NOT_SENT: { label: 'ارسال‌نشده', tone: 'danger' },
    PARTIALLY_SENT: { label: 'ارسال جزئی', tone: 'warning' },
    SENT: { label: 'ارسال‌شده', tone: 'cyan' }
  }),
  settlement: Object.freeze({
    UNPAID: { label: 'تسویه‌نشده', tone: 'danger' },
    PARTIAL: { label: 'تسویه جزئی / بیعانه', tone: 'warning' },
    PAID: { label: 'تسویه کامل', tone: 'success' }
  }),
  item: Object.freeze({
    DELIVERED: { label: 'تحویل', tone: 'info' },
    RETURNED: { label: 'برگشت', tone: 'success' },
    REMAINING: { label: 'مانده', tone: 'warning' },
    DAMAGE: { label: 'خسارت', tone: 'danger' }
  }),
  active: Object.freeze({
    true: { label: 'فعال', tone: 'success' },
    false: { label: 'غیرفعال', tone: 'neutral' }
  })
});

const STATUS_TONE_CLASSES = Object.freeze({
  neutral: 'border-slate-200 bg-slate-100 text-slate-600',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700'
});

const INTERACTIVE_TONE_CLASSES = Object.freeze({
  neutral: 'hover:bg-slate-200 focus-visible:ring-slate-200',
  info: 'hover:bg-blue-100 focus-visible:ring-blue-200',
  success: 'hover:bg-emerald-100 focus-visible:ring-emerald-200',
  warning: 'hover:bg-amber-100 focus-visible:ring-amber-200',
  danger: 'hover:bg-rose-100 focus-visible:ring-rose-200',
  cyan: 'hover:bg-cyan-100 focus-visible:ring-cyan-200',
  violet: 'hover:bg-violet-100 focus-visible:ring-violet-200'
});

export function getStatusMeta(group, status) {
  const normalizedStatus = typeof status === 'boolean' ? String(status) : String(status ?? '');
  return STATUS_GROUPS[group]?.[normalizedStatus] || {
    label: normalizedStatus || 'نامشخص',
    tone: 'neutral'
  };
}

export function getStatusToneClass(tone = 'neutral', interactive = false) {
  const normalizedTone = STATUS_TONE_CLASSES[tone] ? tone : 'neutral';
  return [
    STATUS_TONE_CLASSES[normalizedTone],
    interactive ? INTERACTIVE_TONE_CLASSES[normalizedTone] : ''
  ].filter(Boolean).join(' ');
}

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
