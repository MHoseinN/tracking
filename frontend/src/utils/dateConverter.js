/**
 * Date conversion utilities for Persian (Jalali) <-> Gregorian dates
 * Using persian-date library (ES module compatible)
 */

import PersianDate from 'persian-date';

// Persian month names
export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

/**
 * Convert Gregorian date string (YYYY-MM-DD) to Persian date string
 * @param {string} gregorianDate - Date in YYYY-MM-DD format
 * @returns {string} Persian date string (e.g. "1402/01/15")
 */
export function toPersianDate(gregorianDate) {
  if (!gregorianDate) return '';
  try {
    // Parse YYYY-MM-DD (or YYYY/MM/DD) explicitly to avoid timezone shifts
    const m = String(gregorianDate).match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    let dateObj;
    if (m) {
      const gy = Number(m[1]);
      const gm = Number(m[2]);
      const gd = Number(m[3]);
      // Use local Date constructor (year, monthIndex, day) to avoid UTC parsing quirks
      dateObj = new Date(gy, gm - 1, gd);
    } else {
      dateObj = new Date(gregorianDate);
    }

    const pd = new PersianDate(dateObj);
    return `${pd.year()}/${String(pd.month()).padStart(2, '0')}/${String(pd.date()).padStart(2, '0')}`;
  } catch (e) {
    console.error('Date conversion error:', e);
    return gregorianDate;
  }
}

/**
 * Convert Persian date string (YYYY/MM/DD) to Gregorian date string
 * @param {string} persianDate - Date in YYYY/MM/DD format
 * @returns {string} Gregorian date string (YYYY-MM-DD)
 */
export function toGregorianDate(persianDate) {
  if (!persianDate) return '';
  try {
    const parts = persianDate.split('/');
    if (parts.length !== 3) return persianDate;

    const pd = new PersianDate([parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])]);
    const gDate = pd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');
    return gDate;
  } catch (e) {
    console.error('Date conversion error:', e);
    return persianDate;
  }
}

/**
 * Get current Persian date info (year, month, day)
 * @returns {{ year: number, month: number, day: number }}
 */
export function getCurrentPersianDate() {
  try {
    const pd = new PersianDate();
    return {
      year: pd.year(),
      month: pd.month(),
      day: pd.date()
    };
  } catch (e) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }
}

/**
 * Get the Gregorian date range for a given Persian month
 * @param {number} persianYear
 * @param {number} persianMonth
 * @returns {{ startDate: string, endDate: string }} in YYYY-MM-DD format
 */
export function getPersianMonthGregorianRange(persianYear, persianMonth) {
  try {
    // Start of Persian month
    const startPd = new PersianDate([persianYear, persianMonth, 1]);
    // Convert start and next-start to Gregorian strings, then compute end by subtracting one day using local Date
    const startGregStr = startPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');

    const nextMonth = persianMonth === 12 ? 1 : persianMonth + 1;
    const nextYear = persianMonth === 12 ? persianYear + 1 : persianYear;
    const nextStartPd = new PersianDate([nextYear, nextMonth, 1]);
    const nextStartGregStr = nextStartPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');

    // Parse nextStartGregStr into local Date and subtract one day safely
    const m = String(nextStartGregStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return { startDate: startGregStr, endDate: startGregStr };
    const ny = Number(m[1]), nm = Number(m[2]), nd = Number(m[3]);
    const nextDateObj = new Date(ny, nm - 1, nd);
    nextDateObj.setDate(nextDateObj.getDate() - 1);

    const ey = nextDateObj.getFullYear();
    const em = String(nextDateObj.getMonth() + 1).padStart(2, '0');
    const ed = String(nextDateObj.getDate()).padStart(2, '0');
    const endGreg = `${ey}-${em}-${ed}`;

    return { startDate: startGregStr, endDate: endGreg };
  } catch (e) {
    console.error('Date range error:', e);
    return { startDate: null, endDate: null };
  }
}

/**
 * Format price as Persian number with thousands separator + تومان
 * @param {number} price
 * @returns {string}
 */
export function formatPrice(price) {
  if (price === null || price === undefined) return '';
  return Number(price).toLocaleString('fa-IR') + ' تومان';
}
