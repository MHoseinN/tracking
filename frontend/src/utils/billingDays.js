const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addCalendarDays(dateText, days) {
  const match = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function calculateBillingDays({ deliveredAt, returnedAt, cutoffMinutes = 660, nightBefore = false }) {
  const deliveredTime = Date.parse(deliveredAt);
  const returnedTime = Date.parse(returnedAt);
  if (!Number.isFinite(deliveredTime) || !Number.isFinite(returnedTime) || returnedTime < deliveredTime) return 1;
  const cutoff = Math.min(1439, Math.max(0, Number(cutoffMinutes) || 0));
  const deliveryDate = String(deliveredAt).slice(0, 10);
  const billingStartDate = addCalendarDays(deliveryDate, nightBefore ? 1 : 0);
  const firstBoundaryDate = addCalendarDays(billingStartDate, 1);
  const hours = String(Math.floor(cutoff / 60)).padStart(2, '0');
  const minutes = String(cutoff % 60).padStart(2, '0');
  const firstBoundary = Date.parse(`${firstBoundaryDate}T${hours}:${minutes}:00+03:30`);
  if (returnedTime <= firstBoundary) return 1;
  return 1 + Math.ceil((returnedTime - firstBoundary) / DAY_IN_MS);
}
