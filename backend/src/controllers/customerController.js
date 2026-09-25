const db = require('../db/database');
const { validationResult } = require('express-validator');

const ACCOUNT_STATUS_VALUES = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];

function normalizeCustomerPayload(body = {}) {
  const legacyName = String(body.name || '').trim();
  let firstName = String(body.first_name || '').trim();
  let lastName = String(body.last_name || '').trim();

  if ((!firstName || !lastName) && legacyName) {
    const parts = legacyName.split(/\s+/).filter(Boolean);
    firstName = firstName || (parts.shift() || '');
    lastName = lastName || parts.join(' ');
  }

  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || legacyName;

  const hasNotesField = Object.prototype.hasOwnProperty.call(body, 'notes');

  return {
    firstName,
    lastName,
    fullName,
    phone: body.phone ? String(body.phone).trim() : null,
    referrer: body.referrer ? String(body.referrer).trim() : null,
    notes: hasNotesField ? (body.notes ? String(body.notes).trim() : null) : undefined,
    accountStatus: ACCOUNT_STATUS_VALUES.includes(String(body.account_status || '').trim())
      ? String(body.account_status || '').trim()
      : null
  };
}

function mapCustomerRow(row) {
  if (!row) return row;
  const first = String(row.first_name || '').trim();
  const last = String(row.last_name || '').trim();
  const fullName = [first, last].filter(Boolean).join(' ').trim() || row.name;

  return {
    ...row,
    first_name: first,
    last_name: last,
    name: fullName,
    phone: row.phone || '',
    referrer: row.referrer || '',
    notes: row.notes || '',
    account_status: row.account_status || ''
  };
}

function normalizePhone(value) {
  const digits = String(value || '')
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, '');
  if (digits.startsWith('0098')) return `0${digits.slice(4)}`;
  if (digits.startsWith('98') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
  return digits;
}

function findCustomerByPhone(phone, excludedId = null) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const customers = db.prepare('SELECT id, phone FROM customers WHERE phone IS NOT NULL AND TRIM(phone) <> ?').all('');
  return customers.find((customer) => {
    if (excludedId && String(customer.id) === String(excludedId)) return false;
    return normalizePhone(customer.phone) === normalizedPhone;
  }) || null;
}

// GET /api/customers
function getAllCustomers(req, res) {
  try {
    const customers = db.prepare(`
      SELECT c.*,
             COALESCE(workflow.invoiced_total_toman, 0) AS workflow_invoiced_toman,
             COALESCE(paid.paid_total_toman, 0) AS paid_total_toman,
             COALESCE(legacy.legacy_balance_toman, 0) AS legacy_balance_toman,
             MAX(0, COALESCE(workflow.invoiced_total_toman, 0) - COALESCE(paid.paid_total_toman, 0))
               + COALESCE(legacy.legacy_balance_toman, 0) AS balance_toman,
             MAX(0, COALESCE(paid.paid_total_toman, 0) - COALESCE(workflow.invoiced_total_toman, 0))
               AS credit_toman,
             COALESCE(open_lists.open_list_count, 0) AS open_list_count
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, SUM(final_amount_toman) AS invoiced_total_toman
        FROM invoices
        WHERE delivery_list_id IS NOT NULL AND status = 'ISSUED' AND deleted_at IS NULL
        GROUP BY customer_id
      ) workflow ON workflow.customer_id = c.id
      LEFT JOIN (
        SELECT dl.customer_id, SUM(p.amount_toman) AS paid_total_toman
        FROM payments p
        JOIN delivery_lists dl ON dl.id = p.delivery_list_id
        WHERE p.voided_at IS NULL AND dl.archived_at IS NULL
        GROUP BY dl.customer_id
      ) paid ON paid.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, SUM(price) AS legacy_balance_toman
        FROM invoices
        WHERE delivery_list_id IS NULL AND invoice_type = 'LEGACY'
          AND deleted_at IS NULL AND COALESCE(is_settled, 0) = 0
        GROUP BY customer_id
      ) legacy ON legacy.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, COUNT(*) AS open_list_count
        FROM delivery_lists
        WHERE archived_at IS NULL AND status <> 'COMPLETED'
        GROUP BY customer_id
      ) open_lists ON open_lists.customer_id = c.id
      WHERE c.deleted_at IS NULL
      ORDER BY c.name ASC
    `).all().map((row) => ({
      ...mapCustomerRow(row),
      workflow_invoiced_toman: Number(row.workflow_invoiced_toman) || 0,
      paid_total_toman: Number(row.paid_total_toman) || 0,
      legacy_balance_toman: Number(row.legacy_balance_toman) || 0,
      balance_toman: Number(row.balance_toman) || 0,
      credit_toman: Number(row.credit_toman) || 0,
      open_list_count: Number(row.open_list_count) || 0
    }));
    res.json(customers);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/customers/overview
function getCustomersOverview(req, res) {
  try {
    const rows = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.first_name,
        c.last_name,
        c.phone,
        c.referrer,
        c.account_status,
        c.created_at,
        (SELECT COUNT(*)
           FROM delivery_lists dl
          WHERE dl.customer_id = c.id AND dl.archived_at IS NULL
        ) AS list_count,
        (SELECT COUNT(*)
           FROM invoices i
          WHERE i.customer_id = c.id
            AND i.delivery_list_id IS NOT NULL
            AND i.status = 'ISSUED'
            AND i.deleted_at IS NULL
        ) AS invoice_count,
        (SELECT COALESCE(SUM(i.final_amount_toman), 0)
           FROM invoices i
          WHERE i.customer_id = c.id
            AND i.delivery_list_id IS NOT NULL
            AND i.status = 'ISSUED'
            AND i.deleted_at IS NULL
        ) AS total_invoices_amount
      FROM customers c
      WHERE c.deleted_at IS NULL
      ORDER BY total_invoices_amount DESC, invoice_count DESC, c.created_at DESC
    `).all();

    const normalized = rows.map((row) => ({
      ...mapCustomerRow(row),
      list_count: Number(row.list_count) || 0,
      invoice_count: Number(row.invoice_count) || 0,
      total_invoices_amount: Number(row.total_invoices_amount) || 0
    }));

    res.json(normalized);
  } catch (err) {
    console.error('Get customers overview error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/customers/:id/workflow
function getCustomerWorkflow(req, res) {
  const { id } = req.params;

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL').get(id);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const lists = db.prepare(`
      SELECT
        dl.id, dl.list_number, dl.status, dl.invoice_status,
        dl.invoice_send_status, dl.settlement_status, dl.delivered_at,
        dl.expected_return_at, dl.completed_at, dl.created_at,
        (SELECT MAX(re.returned_at)
           FROM return_events re
          WHERE re.delivery_list_id = dl.id AND re.deleted_at IS NULL
        ) AS last_returned_at,
        (SELECT COALESCE(SUM(i.final_amount_toman), 0)
           FROM invoices i
          WHERE i.delivery_list_id = dl.id
            AND i.status = 'ISSUED' AND i.deleted_at IS NULL
        ) AS invoice_total_toman,
        (SELECT COALESCE(SUM(p.amount_toman), 0)
           FROM payments p
          WHERE p.delivery_list_id = dl.id AND p.voided_at IS NULL
        ) AS paid_total_toman
      FROM delivery_lists dl
      WHERE dl.customer_id = ? AND dl.archived_at IS NULL
      ORDER BY COALESCE(dl.delivered_at, dl.created_at) DESC, dl.id DESC
    `).all(id).map((list) => ({
      ...list,
      invoice_total_toman: Number(list.invoice_total_toman) || 0,
      paid_total_toman: Number(list.paid_total_toman) || 0,
      balance_toman: Math.max(
        0,
        (Number(list.invoice_total_toman) || 0) - (Number(list.paid_total_toman) || 0)
      )
    }));

    const summary = lists.reduce((result, list) => {
      result.list_count += 1;
      if (list.invoice_status === 'ISSUED' || list.invoice_status === 'PARTIALLY_ISSUED') {
        result.invoice_count += 1;
      }
      result.invoiced_total_toman += list.invoice_total_toman;
      result.paid_total_toman += list.paid_total_toman;
      result.balance_toman += list.balance_toman;
      return result;
    }, {
      list_count: 0,
      invoice_count: 0,
      invoiced_total_toman: 0,
      paid_total_toman: 0,
      balance_toman: 0
    });

    const legacy = db.prepare(`
      SELECT COUNT(*) AS invoice_count, COALESCE(SUM(price), 0) AS balance_toman
      FROM invoices
      WHERE customer_id = ? AND delivery_list_id IS NULL AND invoice_type = 'LEGACY'
        AND deleted_at IS NULL AND COALESCE(is_settled, 0) = 0
    `).get(id);
    summary.legacy_invoice_count = Number(legacy.invoice_count) || 0;
    summary.legacy_balance_toman = Number(legacy.balance_toman) || 0;
    summary.balance_toman += summary.legacy_balance_toman;
    summary.invoiced_total_toman += summary.legacy_balance_toman;
    summary.credit_toman = Math.max(0, summary.paid_total_toman
      - (summary.invoiced_total_toman - summary.legacy_balance_toman));
    summary.open_list_count = lists.filter((list) => list.status !== 'COMPLETED').length;

    res.json({ customer: mapCustomerRow(customer), lists, summary });
  } catch (err) {
    console.error('Get customer workflow error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/customers
function createCustomer(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const payload = normalizeCustomerPayload(req.body);
  if (!payload.fullName) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  try {
    const phoneDuplicate = findCustomerByPhone(payload.phone);
    if (phoneDuplicate) {
      return res.status(400).json({ message: 'Customer with this phone already exists', id: phoneDuplicate.id });
    }

    // Check if customer with same identity exists
    const existing = db
      .prepare('SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(?)')
      .get(payload.fullName);

    if (existing) {
      return res.status(400).json({ message: 'Customer with this name already exists', id: existing.id });
    }

    const result = db
      .prepare('INSERT INTO customers (name, first_name, last_name, phone, referrer, notes, account_status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(payload.fullName, payload.firstName, payload.lastName, payload.phone, payload.referrer, payload.notes ?? null, payload.accountStatus);

    const customer = mapCustomerRow(db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid));
    res.status(201).json(customer);
  } catch (err) {
    console.error('Create customer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// PUT /api/customers/:id
function updateCustomer(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { id } = req.params;
  const payload = normalizeCustomerPayload(req.body);
  if (!payload.fullName) {
    return res.status(400).json({ message: 'Customer name is required' });
  }

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const phoneDuplicate = findCustomerByPhone(payload.phone, id);
    if (phoneDuplicate) {
      return res.status(400).json({ message: 'Customer with this phone already exists', id: phoneDuplicate.id });
    }

    const duplicate = db
      .prepare('SELECT id FROM customers WHERE id <> ? AND LOWER(TRIM(name)) = LOWER(?)')
      .get(id, payload.fullName);

    if (duplicate) {
      return res.status(400).json({ message: 'Customer with this name already exists', id: duplicate.id });
    }

    db.prepare('UPDATE customers SET name = ?, first_name = ?, last_name = ?, phone = ?, referrer = ?, notes = ?, account_status = ? WHERE id = ?').run(
      payload.fullName,
      payload.firstName,
      payload.lastName,
      payload.phone,
      payload.referrer,
      payload.notes !== undefined ? payload.notes : customer.notes,
      payload.accountStatus,
      id
    );

    const updated = mapCustomerRow(db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
    res.json(updated);
  } catch (err) {
    console.error('Update customer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// PATCH /api/customers/:id/notes
function updateCustomerNotes(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const rawNotes = req.body?.notes;
  const notes = rawNotes ? String(rawNotes).trim() : null;

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    db.prepare('UPDATE customers SET notes = ? WHERE id = ?').run(notes, id);
    const updated = mapCustomerRow(db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
    res.json(updated);
  } catch (err) {
    console.error('Update customer notes error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// PATCH /api/customers/:id/profile
function updateCustomerProfile(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const hasFirstName = Object.prototype.hasOwnProperty.call(req.body || {}, 'first_name');
  const hasLastName = Object.prototype.hasOwnProperty.call(req.body || {}, 'last_name');
  const hasPhone = Object.prototype.hasOwnProperty.call(req.body || {}, 'phone');
  const hasReferrer = Object.prototype.hasOwnProperty.call(req.body || {}, 'referrer');
  const hasAccountStatus = Object.prototype.hasOwnProperty.call(req.body || {}, 'account_status');

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const nextFirstName = hasFirstName ? String(req.body.first_name || '').trim() : String(customer.first_name || '').trim();
    const nextLastName = hasLastName ? String(req.body.last_name || '').trim() : String(customer.last_name || '').trim();
    if (!nextFirstName || !nextLastName) {
      return res.status(400).json({ message: 'Customer first_name and last_name are required' });
    }

    const nextPhone = hasPhone ? (req.body.phone ? String(req.body.phone).trim() : null) : customer.phone;
    const nextReferrer = hasReferrer ? (req.body.referrer ? String(req.body.referrer).trim() : null) : customer.referrer;
    const nextAccountStatus = hasAccountStatus ? (req.body.account_status ? String(req.body.account_status).trim() : null) : customer.account_status;
    const nextName = `${nextFirstName} ${nextLastName}`.trim();

    const phoneDuplicate = findCustomerByPhone(nextPhone, id);
    if (phoneDuplicate) {
      return res.status(400).json({ message: 'Customer with this phone already exists', id: phoneDuplicate.id });
    }

    db.prepare('UPDATE customers SET name = ?, first_name = ?, last_name = ?, phone = ?, referrer = ?, account_status = ? WHERE id = ?').run(
      nextName,
      nextFirstName,
      nextLastName,
      nextPhone,
      nextReferrer,
      nextAccountStatus,
      id
    );

    const updated = mapCustomerRow(db.prepare('SELECT * FROM customers WHERE id = ?').get(id));
    res.json(updated);
  } catch (err) {
    console.error('Update customer profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// DELETE /api/customers/:id
function deleteCustomer(req, res) {
  const { id } = req.params;

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const linkedList = db.prepare(`
      SELECT id FROM delivery_lists
      WHERE customer_id = ?
      LIMIT 1
    `).get(id);
    if (linkedList) {
      return res.status(409).json({
        message: 'این مشتری دارای لیست ثبت‌شده است و برای حفظ سابقه قابل حذف نیست'
      });
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getAllCustomers,
  getCustomersOverview,
  getCustomerWorkflow,
  createCustomer,
  updateCustomer,
  updateCustomerProfile,
  updateCustomerNotes,
  deleteCustomer
};
