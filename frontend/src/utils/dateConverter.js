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
    const pd = new PersianDate(new Date(gregorianDate));
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
    const startGreg = startPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');

    // End of Persian month (last day - go to start of next month then subtract 1 day)
    const nextMonth = persianMonth === 12 ? 1 : persianMonth + 1;
    const nextYear = persianMonth === 12 ? persianYear + 1 : persianYear;
    const endPd = new PersianDate([nextYear, nextMonth, 1]).subtract('day', 1);
    const endGreg = endPd.toCalendar('gregorian').toLocale('en').format('YYYY-MM-DD');

    return { startDate: startGreg, endDate: endGreg };
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
