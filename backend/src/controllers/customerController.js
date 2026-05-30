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

  return {
    firstName,
    lastName,
    fullName,
    phone: body.phone ? String(body.phone).trim() : null,
    referrer: body.referrer ? String(body.referrer).trim() : null,
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
    account_status: row.account_status || ''
  };
}

// GET /api/customers
function getAllCustomers(req, res) {
  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all().map(mapCustomerRow);
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
        COUNT(i.id) AS invoice_count,
        COALESCE(SUM(i.price), 0) AS total_invoices_amount
      FROM customers c
      LEFT JOIN invoices i ON i.customer_id = c.id
      GROUP BY c.id
      ORDER BY total_invoices_amount DESC, invoice_count DESC, c.created_at DESC
    `).all();

    const normalized = rows.map((row) => ({
      ...mapCustomerRow(row),
      invoice_count: Number(row.invoice_count) || 0,
      total_invoices_amount: Number(row.total_invoices_amount) || 0
    }));

    res.json(normalized);
  } catch (err) {
    console.error('Get customers overview error:', err);
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
    // Check if customer with same identity exists
    const existing = db
      .prepare('SELECT id FROM customers WHERE LOWER(TRIM(name)) = LOWER(?)')
      .get(payload.fullName);

    if (existing) {
      return res.status(400).json({ message: 'Customer with this name already exists', id: existing.id });
    }

    const result = db
      .prepare('INSERT INTO customers (name, first_name, last_name, phone, referrer, account_status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(payload.fullName, payload.firstName, payload.lastName, payload.phone, payload.referrer, payload.accountStatus);

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

    const duplicate = db
      .prepare('SELECT id FROM customers WHERE id <> ? AND LOWER(TRIM(name)) = LOWER(?)')
      .get(id, payload.fullName);

    if (duplicate) {
      return res.status(400).json({ message: 'Customer with this name already exists', id: duplicate.id });
    }

    db.prepare('UPDATE customers SET name = ?, first_name = ?, last_name = ?, phone = ?, referrer = ?, account_status = ? WHERE id = ?').run(
      payload.fullName,
      payload.firstName,
      payload.lastName,
      payload.phone,
      payload.referrer,
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

// DELETE /api/customers/:id
function deleteCustomer(req, res) {
  const { id } = req.params;

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('Delete customer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = { getAllCustomers, getCustomersOverview, createCustomer, updateCustomer, deleteCustomer };
