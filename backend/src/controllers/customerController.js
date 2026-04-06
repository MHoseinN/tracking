const db = require('../db/database');
const { validationResult } = require('express-validator');

// GET /api/customers
function getAllCustomers(req, res) {
  try {
    const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    res.json(customers);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

// POST /api/customers
function createCustomer(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name } = req.body;

  try {
    // Check if customer with same name exists
    const existing = db.prepare('SELECT id FROM customers WHERE name = ?').get(name.trim());
    if (existing) {
      return res.status(400).json({ message: 'Customer with this name already exists', id: existing.id });
    }

    const result = db.prepare('INSERT INTO customers (name) VALUES (?)').run(name.trim());
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
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
  const { name } = req.body;

  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    db.prepare('UPDATE customers SET name = ? WHERE id = ?').run(name.trim(), id);
    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
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

module.exports = { getAllCustomers, createCustomer, updateCustomer, deleteCustomer };
