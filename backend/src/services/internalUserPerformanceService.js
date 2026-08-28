const tehranPersianDateFormatter = new Intl.DateTimeFormat('en-u-ca-persian', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
const tehranGregorianDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tehran',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short'
});

const WEEKDAY_OFFSET = { Sat: 0, Sun: 1, Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6 };
const PERIODS = ['day', 'week', 'month', 'year'];

function periodKeys(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const persianParts = tehranPersianDateFormatter.formatToParts(date);
  const gregorianParts = tehranGregorianDateFormatter.formatToParts(date);
  const persianPart = (type) => persianParts.find((entry) => entry.type === type)?.value;
  const gregorianPart = (type) => gregorianParts.find((entry) => entry.type === type)?.value;
  const year = persianPart('year');
  const month = persianPart('month');
  const day = persianPart('day');
  const dayKey = `${year}-${month}-${day}`;
  const localMidnightUtc = new Date(Date.UTC(
    Number(gregorianPart('year')),
    Number(gregorianPart('month')) - 1,
    Number(gregorianPart('day'))
  ));
  localMidnightUtc.setUTCDate(localMidnightUtc.getUTCDate() - (WEEKDAY_OFFSET[gregorianPart('weekday')] ?? 0));
  const weekKey = localMidnightUtc.toISOString().slice(0, 10);
  return { day: dayKey, week: weekKey, month: `${year}-${month}`, year };
}

function emptyPerformance() {
  return Object.fromEntries(PERIODS.map((period) => [period, { delivered: 0, received: 0 }]));
}

function normalizeJalaliDate(value) {
  const match = String(value || '').trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function createInternalUserPerformanceService(db) {
  function tableExists(name) {
    return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
  }

  function columnExists(table, column) {
    if (!tableExists(table)) return false;
    return Boolean(db.prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`).get(column));
  }

  function getPerformanceByUser(referenceDate = new Date()) {
    const targetKeys = periodKeys(referenceDate);
    const userRows = db.prepare(`
      SELECT id FROM users ${columnExists('users', 'deleted_at') ? 'WHERE deleted_at IS NULL' : ''}
    `).all();
    const counters = new Map(userRows.map((user) => [Number(user.id), emptyPerformance()]));
    const unique = new Map();

    function countRows(rows, action) {
      rows.forEach((row) => {
        const userId = Number(row.user_id);
        const keys = periodKeys(row.occurred_at);
        if (!counters.has(userId) || !keys) return;
        PERIODS.forEach((period) => {
          if (keys[period] !== targetKeys[period]) return;
          const uniqueKey = `${userId}:${action}:${period}:${row.list_id}`;
          if (unique.has(uniqueKey)) return;
          unique.set(uniqueKey, true);
          counters.get(userId)[period][action] += 1;
        });
      });
    }

    const hasLegacyMarker = columnExists('delivery_lists', 'legacy_invoice_id');
    const currentWorkflowOnly = hasLegacyMarker ? 'AND legacy_invoice_id IS NULL' : '';
    const currentReturnWorkflowOnly = hasLegacyMarker ? 'AND delivery_lists.legacy_invoice_id IS NULL' : '';

    if (tableExists('delivery_lists')) countRows(db.prepare(`
      SELECT delivered_by_user_id AS user_id, id AS list_id, delivered_at AS occurred_at
      FROM delivery_lists
      WHERE delivered_by_user_id IS NOT NULL AND delivered_at IS NOT NULL AND archived_at IS NULL
        ${currentWorkflowOnly}
    `).all(), 'delivered');

    if (tableExists('return_events') && tableExists('delivery_lists')) countRows(db.prepare(`
      SELECT return_events.received_by_user_id AS user_id,
             return_events.delivery_list_id AS list_id,
             return_events.returned_at AS occurred_at
      FROM return_events
      JOIN delivery_lists ON delivery_lists.id = return_events.delivery_list_id
      WHERE return_events.deleted_at IS NULL AND delivery_lists.archived_at IS NULL
        ${currentReturnWorkflowOnly}
    `).all(), 'received');

    return Object.fromEntries(counters);
  }

  function eventRows() {
    const rows = [];
    const hasLegacyMarker = columnExists('delivery_lists', 'legacy_invoice_id');
    const currentWorkflowOnly = hasLegacyMarker ? 'AND legacy_invoice_id IS NULL' : '';
    const currentReturnWorkflowOnly = hasLegacyMarker ? 'AND delivery_lists.legacy_invoice_id IS NULL' : '';

    if (tableExists('delivery_lists')) {
      rows.push(...db.prepare(`
        SELECT delivered_by_user_id AS user_id, id AS list_id, delivered_at AS occurred_at,
               'delivered' AS action
        FROM delivery_lists
        WHERE delivered_by_user_id IS NOT NULL AND delivered_at IS NOT NULL AND archived_at IS NULL
          ${currentWorkflowOnly}
      `).all());
    }

    if (tableExists('return_events') && tableExists('delivery_lists')) {
      rows.push(...db.prepare(`
        SELECT return_events.received_by_user_id AS user_id,
               return_events.delivery_list_id AS list_id,
               return_events.returned_at AS occurred_at,
               'received' AS action
        FROM return_events
        JOIN delivery_lists ON delivery_lists.id = return_events.delivery_list_id
        WHERE return_events.received_by_user_id IS NOT NULL
          AND return_events.deleted_at IS NULL AND delivery_lists.archived_at IS NULL
          ${currentReturnWorkflowOnly}
      `).all());
    }

    return rows;
  }

  function getPerformanceByUserRange({ from = null, to = null } = {}) {
    const fromKey = normalizeJalaliDate(from);
    const toKey = normalizeJalaliDate(to);
    const userRows = db.prepare(`
      SELECT id FROM users ${columnExists('users', 'deleted_at') ? 'WHERE deleted_at IS NULL' : ''}
    `).all();
    const counters = new Map(userRows.map((user) => [Number(user.id), { delivered: 0, received: 0 }]));
    const unique = new Set();

    eventRows().forEach((row) => {
      const userId = Number(row.user_id);
      const dayKey = periodKeys(row.occurred_at)?.day;
      if (!counters.has(userId) || !dayKey) return;
      if (fromKey && dayKey < fromKey) return;
      if (toKey && dayKey > toKey) return;
      const uniqueKey = `${userId}:${row.action}:${row.list_id}`;
      if (unique.has(uniqueKey)) return;
      unique.add(uniqueKey);
      counters.get(userId)[row.action] += 1;
    });

    return Object.fromEntries(counters);
  }

  function getUserPerformanceRange(userId, range = {}) {
    return getPerformanceByUserRange(range)[Number(userId)] || { delivered: 0, received: 0 };
  }

  function getAvailableYears(userId = null) {
    const years = new Set([periodKeys(new Date()).year]);
    eventRows().forEach((row) => {
      if (userId !== null && Number(row.user_id) !== Number(userId)) return;
      const year = periodKeys(row.occurred_at)?.year;
      if (year) years.add(year);
    });
    return [...years].sort((a, b) => Number(b) - Number(a));
  }

  function getUserPerformanceOverview(userId, selectedYear = null, referenceDate = new Date()) {
    const currentKeys = periodKeys(referenceDate);
    const requestedYear = /^\d{4}$/.test(String(selectedYear || ''))
      ? String(selectedYear)
      : currentKeys.year;
    const rows = [];
    const addRow = (row) => rows.push({
      ...row,
      ...getUserPerformanceRange(userId, { from: row.from, to: row.to })
    });

    if (requestedYear === currentKeys.year) {
      const today = currentKeys.day.replaceAll('-', '/');
      const yesterday = periodKeys(new Date(referenceDate.getTime() - (24 * 60 * 60 * 1000))).day.replaceAll('-', '/');
      const sevenDaysAgo = periodKeys(new Date(referenceDate.getTime() - (6 * 24 * 60 * 60 * 1000))).day.replaceAll('-', '/');
      addRow({ key: 'today', type: 'relative', from: today, to: today });
      addRow({ key: 'yesterday', type: 'relative', from: yesterday, to: yesterday });
      addRow({ key: 'last_7_days', type: 'relative', from: sevenDaysAgo, to: today });
    }

    const currentMonth = Number(currentKeys.month.split('-')[1]);
    const monthLimit = requestedYear < currentKeys.year ? 12 : (requestedYear === currentKeys.year ? currentMonth : 0);
    for (let month = 1; month <= monthLimit; month += 1) {
      const monthText = String(month).padStart(2, '0');
      addRow({
        key: `month_${monthText}`,
        type: 'month',
        year: requestedYear,
        month,
        from: `${requestedYear}/${monthText}/01`,
        to: `${requestedYear}/${monthText}/31`
      });
    }

    addRow({
      key: 'year_total',
      type: 'year',
      year: requestedYear,
      from: `${requestedYear}/01/01`,
      to: `${requestedYear}/12/31`
    });

    return {
      selected_year: requestedYear,
      current_year: currentKeys.year,
      available_years: getAvailableYears(userId),
      rows
    };
  }

  function getUserPerformance(userId, referenceDate = new Date()) {
    return getPerformanceByUser(referenceDate)[Number(userId)] || emptyPerformance();
  }

  return {
    getPerformanceByUser,
    getUserPerformance,
    getPerformanceByUserRange,
    getUserPerformanceRange,
    getUserPerformanceOverview,
    getAvailableYears
  };
}

module.exports = { createInternalUserPerformanceService, normalizeJalaliDate, periodKeys };
