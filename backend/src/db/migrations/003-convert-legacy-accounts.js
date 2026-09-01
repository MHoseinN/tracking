const { ensureColumn } = require('./helpers');
const { getPersianYear } = require('../../services/workflowNumberingService');

const migration = {
  id: '20260827_003_convert_legacy_accounts_to_delivery_lists',
  up(db) {
    ensureColumn(
      db,
      'delivery_lists',
      'legacy_invoice_id',
      'INTEGER REFERENCES invoices(id) ON DELETE RESTRICT'
    );
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_delivery_lists_legacy_invoice
        ON delivery_lists(legacy_invoice_id)
        WHERE legacy_invoice_id IS NOT NULL;
    `);

    const actor = db.prepare(`
      SELECT id
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY CASE WHEN role = 'MANAGER' AND is_active = 1 THEN 0 ELSE 1 END, id
      LIMIT 1
    `).get();
    if (!actor) throw new Error('Legacy account conversion requires at least one user');

    const legacyInvoices = db.prepare(`
      SELECT invoices.*, customers.name AS customer_name
      FROM invoices
      JOIN customers ON customers.id = invoices.customer_id
      WHERE invoices.invoice_type = 'LEGACY'
        AND invoices.delivery_list_id IS NULL
        AND invoices.deleted_at IS NULL
      ORDER BY invoices.date, invoices.id
    `).all();
    if (!legacyInvoices.length) return;

    const listNumber = createNumberAllocator(
      db.prepare('SELECT list_number AS number FROM delivery_lists WHERE list_number IS NOT NULL').all(),
      2
    );
    const invoiceNumber = createNumberAllocator(
      db.prepare('SELECT invoice_number AS number FROM invoices WHERE invoice_number IS NOT NULL AND deleted_at IS NULL').all(),
      3
    );

    const insertList = db.prepare(`
      INSERT INTO delivery_lists (
        list_number, customer_id, customer_name_snapshot, status,
        invoice_status, invoice_send_status, settlement_status,
        delivered_at, expected_return_at, completed_at, notes,
        created_by_user_id, delivered_by_user_id, last_autosaved_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'COMPLETED', 'ISSUED', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO delivery_list_items (
        delivery_list_id, product_id, product_name_snapshot,
        daily_price_toman, delivered_quantity, notes, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, 1, ?, ?, ?)
    `);
    const insertReturn = db.prepare(`
      INSERT INTO return_events (
        delivery_list_id, returned_at, received_by_user_id, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertReturnItem = db.prepare(`
      INSERT INTO return_event_items (
        return_event_id, delivery_list_item_id, healthy_quantity,
        damaged_quantity, system_calculated_days,
        final_charged_days, day_override_reason, created_at, updated_at
      ) VALUES (?, ?, 1, 0, 1, 1, ?, ?, ?)
    `);
    const updateInvoice = db.prepare(`
      UPDATE invoices
      SET delivery_list_id = ?, invoice_number = ?, invoice_type = 'PRIMARY',
          status = 'ISSUED', settlement_status = ?, send_status = ?,
          subtotal_toman = ?, extra_charges_toman = 0,
          discount_percent_basis_points = 0, discount_amount_toman = 0,
          rounding_adjustment_toman = 0, final_amount_toman = ?,
          issued_at = ?, issued_by_user_id = ?, updated_at = ?, version = version + 1
      WHERE id = ? AND invoice_type = 'LEGACY' AND delivery_list_id IS NULL
    `);
    const insertLine = db.prepare(`
      INSERT INTO invoice_lines (
        invoice_id, delivery_list_item_id, return_event_item_id, line_type,
        description, quantity, billing_from_at, billing_to_at, charged_days,
        unit_price_toman, line_total_toman, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, 'RENTAL', ?, 1, ?, ?, 1, ?, ?, 0, ?, ?)
    `);
    const insertPayment = db.prepare(`
      INSERT INTO payments (
        delivery_list_id, invoice_id, amount_toman, payment_method,
        paid_at, received_by_user_id, notes, created_at
      ) VALUES (?, ?, ?, 'OTHER', ?, ?, ?, ?)
    `);
    const insertSendLog = db.prepare(`
      INSERT INTO invoice_send_logs (
        invoice_id, channel, status, sent_at, sent_by_user_id, notes, created_at
      ) VALUES (?, 'MANUAL', 'SENT', ?, ?, ?, ?)
    `);
    const attachLegacySource = db.prepare(`
      UPDATE delivery_lists SET legacy_invoice_id = ? WHERE id = ?
    `);
    const insertAuditLog = db.prepare(`
      INSERT INTO audit_logs (
        actor_user_id, entity_type, entity_id, action, after_json, metadata_json, created_at
      ) VALUES (?, 'DELIVERY_LIST', ?, 'MIGRATE_LEGACY_ACCOUNT', ?, ?, ?)
    `);

    legacyInvoices.forEach((invoice) => {
      const occurredAt = normalizeLegacyTimestamp(invoice.date, invoice.created_at);
      const createdAt = normalizeCreatedTimestamp(invoice.created_at, occurredAt);
      const amount = Math.max(0, Math.round(Number(invoice.final_amount_toman || invoice.price || 0)));
      const sentStatus = Number(invoice.is_shipped) === 1 || invoice.send_status === 'SENT'
        ? 'SENT'
        : 'NOT_SENT';
      const settlementStatus = Number(invoice.is_settled) === 1 || invoice.settlement_status === 'PAID'
        ? 'PAID'
        : 'UNPAID';
      const itemName = normalizedText(invoice.description)
        || 'اقلام حساب قدیمی (جزئیات ثبت نشده)';
      const migrationNote = `تبدیل خودکار از حساب قدیمی شماره ${invoice.id}`;
      const nextListNumber = listNumber(occurredAt);
      const nextInvoiceNumber = invoiceNumber(occurredAt);

      const listResult = insertList.run(
        nextListNumber,
        invoice.customer_id,
        invoice.customer_name,
        sentStatus,
        settlementStatus,
        occurredAt,
        occurredAt,
        occurredAt,
        migrationNote,
        actor.id,
        actor.id,
        occurredAt,
        createdAt,
        occurredAt
      );
      const listId = Number(listResult.lastInsertRowid);
      const itemResult = insertItem.run(
        listId,
        itemName,
        amount,
        migrationNote,
        createdAt,
        occurredAt
      );
      const itemId = Number(itemResult.lastInsertRowid);
      const returnResult = insertReturn.run(
        listId,
        occurredAt,
        actor.id,
        migrationNote,
        createdAt,
        occurredAt
      );
      const returnEventId = Number(returnResult.lastInsertRowid);
      const returnItemResult = insertReturnItem.run(
        returnEventId,
        itemId,
        migrationNote,
        createdAt,
        occurredAt
      );
      const returnItemId = Number(returnItemResult.lastInsertRowid);

      const invoiceUpdate = updateInvoice.run(
        listId,
        nextInvoiceNumber,
        settlementStatus,
        sentStatus,
        amount,
        amount,
        occurredAt,
        actor.id,
        occurredAt,
        invoice.id
      );
      if (invoiceUpdate.changes !== 1) {
        throw new Error(`Legacy invoice ${invoice.id} could not be converted`);
      }

      insertLine.run(
        invoice.id,
        itemId,
        returnItemId,
        itemName,
        occurredAt,
        occurredAt,
        amount,
        amount,
        createdAt,
        occurredAt
      );
      if (settlementStatus === 'PAID' && amount > 0) {
        insertPayment.run(
          listId,
          invoice.id,
          amount,
          occurredAt,
          actor.id,
          migrationNote,
          createdAt
        );
      }
      if (sentStatus === 'SENT') {
        insertSendLog.run(
          invoice.id,
          occurredAt,
          actor.id,
          migrationNote,
          createdAt
        );
      }
      attachLegacySource.run(invoice.id, listId);
      insertAuditLog.run(
        actor.id,
        String(listId),
        JSON.stringify({
          list_number: nextListNumber,
          invoice_number: nextInvoiceNumber,
          invoice_status: 'ISSUED',
          invoice_send_status: sentStatus,
          settlement_status: settlementStatus
        }),
        JSON.stringify({ legacy_invoice_id: invoice.id }),
        createdAt
      );
    });
  }
};

function normalizedText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function normalizeLegacyTimestamp(value, fallback) {
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T12:00:00+03:30`;
  const parsed = new Date(text || fallback);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid legacy invoice date: ${value}`);
  return parsed.toISOString();
}

function normalizeCreatedTimestamp(value, fallback) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function createNumberAllocator(existingRows, prefixLength) {
  const used = new Set(existingRows.map((row) => String(row.number || '')).filter(Boolean));
  const maximumByPrefix = new Map();
  used.forEach((value) => {
    const prefix = value.slice(0, prefixLength);
    const suffix = value.slice(prefixLength);
    if (!/^\d+$/.test(prefix) || !/^\d+$/.test(suffix)) return;
    const sequence = Number(suffix);
    if (sequence < 1000) return;
    maximumByPrefix.set(prefix, Math.max(maximumByPrefix.get(prefix) || 999, sequence));
  });

  return (dateValue) => {
    const year = String(getPersianYear(dateValue));
    const prefix = year.slice(-prefixLength);
    let sequence = maximumByPrefix.get(prefix) || 999;
    let candidate;
    do {
      sequence += 1;
      candidate = `${prefix}${sequence}`;
    } while (used.has(candidate));
    maximumByPrefix.set(prefix, sequence);
    used.add(candidate);
    return candidate;
  };
}

module.exports = migration;
