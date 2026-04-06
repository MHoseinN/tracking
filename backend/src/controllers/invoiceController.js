const db = require('../db/database');
const { validationResult } = require('express-validator');

// Helper: join invoices with customer name
const invoiceQuery = `
  SELECT i.*, c.name as customer_name
  FROM invoices i
  JOIN customers c ON i.customer_id = c.id
`;

// GET /api/invoices?year=&month=
function getInvoicesByMonth(req, res) {
  const { year, month } = req.query;

  try {
    let query, rows;

    if (year && month) {
      // Filter by Gregorian year/month
      const paddedMonth = String(month).padStart(2, '0');
      const datePrefix = `${year}-${paddedMonth}`;
      query = `${invoiceQuery} WHERE i.date LIKE ? ORDER BY i.date ASC`;
      rows = db.prepare(query).all(`${datePrefix}%`);
    } else {
      // Return all invoices if no filter provided
      query = `${invoiceQuery} ORDER BY i.date ASC`;
      rows = db.prepare(query).all();
    }

    res.json(rows);
  } catch (err) {
    console.error('Get invoices error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/invoices/customer/:customerId
function getCustomerInvoices(req, res) {
  const { customerId } = req.params;

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const rows = db.prepare(`${invoiceQuery} WHERE i.customer_id = ? ORDER BY i.date ASC`).all(customerId);
    res.json({ customer, invoices: rows });
  } catch (err) {
    console.error('Get customer invoices error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// GET /api/invoices/search?q=&start_date=&end_date=&customer_id=
function searchInvoices(req, res) {
  const { q, start_date, end_date, customer_id } = req.query;

  try {
    let conditions = [];
    let params = [];

    if (customer_id) {
      conditions.push('i.customer_id = ?');
      params.push(customer_id);
    }

    if (q) {
      conditions.push('(i.description LIKE ? OR c.name LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (start_date) {
      conditions.push('i.date >= ?');
      params.push(start_date);
    }

    if (end_date) {
      conditions.push('i.date <= ?');
      params.push(end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `${invoiceQuery} ${whereClause} ORDER BY i.date ASC`;

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    console.error('Search invoices error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/invoices
function createInvoice(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { customer_id, date, price, description } = req.body;

  try {
    // Verify customer exists
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const result = db.prepare(
      'INSERT INTO invoices (customer_id, date, price, description) VALUES (?, ?, ?, ?)'
    ).run(customer_id, date, price, description || null);

    const invoice = db.prepare(`${invoiceQuery} WHERE i.id = ?`).get(result.lastInsertRowid);
    res.status(201).json(invoice);
  } catch (err) {
    console.error('Create invoice error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// PUT /api/invoices/:id
function updateInvoice(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { customer_id, date, price, description } = req.body;

  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Verify customer exists if being changed
    if (customer_id) {
      const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
    }

    db.prepare(
      'UPDATE invoices SET customer_id = ?, date = ?, price = ?, description = ? WHERE id = ?'
    ).run(
      customer_id || invoice.customer_id,
      date || invoice.date,
      price !== undefined ? price : invoice.price,
      description !== undefined ? description : invoice.description,
      id
    );

    const updated = db.prepare(`${invoiceQuery} WHERE i.id = ?`).get(id);
    res.json(updated);
  } catch (err) {
    console.error('Update invoice error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// DELETE /api/invoices/:id
function deleteInvoice(req, res) {
  const { id } = req.params;

  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error('Delete invoice error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// PATCH /api/invoices/:id/status
function updateInvoiceStatus(req, res) {
  const { id } = req.params;
  const { field, value } = req.body;

  // Validate field
  if (!['is_shipped', 'is_settled'].includes(field)) {
    return res.status(400).json({ message: 'Invalid field. Must be is_shipped or is_settled' });
  }

  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    db.prepare(`UPDATE invoices SET ${field} = ? WHERE id = ?`).run(value ? 1 : 0, id);

    const updated = db.prepare(`${invoiceQuery} WHERE i.id = ?`).get(id);
    res.json(updated);
  } catch (err) {
    console.error('Update invoice status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getInvoicesByMonth,
  getCustomerInvoices,
  searchInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus
};
