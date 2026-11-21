const express = require('express');
const db = require('../db/database');
const auth = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const { nextInvoiceNumber } = require('../services/workflowNumberingService');
const { createDeliveryInvoiceService } = require('../services/deliveryInvoiceService');
const { createInvoicePdfService, renderInvoicePdf } = require('../services/invoicePdfService');

const router = express.Router();
router.use(auth);
router.use(requireRole('MANAGER', 'ADMIN'));

class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const required = (value, label) => {
  const result = String(value ?? '').trim();
  if (!result) throw new InputError(`${label} الزامی است`);
  return result;
};
const positiveId = (value, label) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) throw new InputError(`${label} نامعتبر است`);
  return number;
};
const money = (value, label, allowZero = false) => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < (allowZero ? 0 : 1)) throw new InputError(`${label} نامعتبر است`);
  return number;
};
const date = (value, label) => {
  const parsed = new Date(required(value, label));
  if (Number.isNaN(parsed.getTime())) throw new InputError(`${label} نامعتبر است`);
  return parsed.toISOString();
};
const optionalId = (value, label) => value == null || value === '' ? null : positiveId(value, label);
const find = (table, id) => db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(positiveId(id, 'شناسه'));
const ensure = (row, label) => { if (!row) throw new InputError(`${label} پیدا نشد`, 404); return row; };
const run = (handler) => (req, res) => {
  try { const result = handler(req); res.status(result?.created ? 201 : 200).json(result?.data ?? result); }
  catch (error) {
    if (error instanceof InputError) return res.status(error.status).json({ message: error.message });
    if (error.code?.startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ message: 'اطلاعات با رکوردهای موجود سازگار نیست' });
    console.error('Damaged assets:', error);
    return res.status(500).json({ message: 'خطای سرور' });
  }
};

function allocations(repairerId) {
  const assets = db.prepare(`SELECT id, repair_cost_toman FROM damaged_assets
    WHERE repairer_id = ? AND repair_cost_toman > 0 ORDER BY COALESCE(returned_at, created_at), id`).all(repairerId);
  const payments = db.prepare(`SELECT * FROM repairer_payments WHERE repairer_id = ? ORDER BY paid_at, id`).all(repairerId);
  let available = payments.reduce((sum, payment) => sum + payment.amount_toman, 0);
  const byAsset = {};
  for (const asset of assets) {
    const paid = Math.min(available, asset.repair_cost_toman);
    byAsset[asset.id] = { paid, due: asset.repair_cost_toman - paid };
    available -= paid;
  }
  return { byAsset, paid: payments.reduce((sum, payment) => sum + payment.amount_toman, 0),
    due: assets.reduce((sum, asset) => sum + asset.repair_cost_toman, 0) - payments.reduce((sum, payment) => sum + payment.amount_toman, 0) };
}

function assets() {
  const rows = db.prepare(`SELECT a.*, r.name AS repairer_name, c.name AS customer_name,
    l.list_number, i.invoice_number, i.send_status AS invoice_send_status,
    i.parent_invoice_id
    FROM damaged_assets a
    LEFT JOIN repairers r ON r.id = a.repairer_id
    LEFT JOIN customers c ON c.id = a.customer_id
    LEFT JOIN delivery_lists l ON l.id = a.delivery_list_id
    LEFT JOIN invoices i ON i.id = a.invoice_id
    ORDER BY a.created_at DESC, a.id DESC`).all();
  const cache = new Map();
  return rows.map((row) => {
    if (row.repairer_id && !cache.has(row.repairer_id)) cache.set(row.repairer_id, allocations(row.repairer_id));
    return { ...row,
      status: row.invoice_id && row.invoice_send_status === 'SENT' ? 'COMPLETED' : row.status,
      repair_paid_toman: cache.get(row.repairer_id)?.byAsset[row.id]?.paid || 0,
      repair_due_toman: cache.get(row.repairer_id)?.byAsset[row.id]?.due || 0 };
  });
}

function syncReturnItem(returnItemId) {
  if (!returnItemId) return;
  const item = db.prepare(`SELECT rei.damaged_quantity, rei.return_event_id, re.delivery_list_id,
      COUNT(a.id) AS registered,
      SUM(CASE WHEN a.status IN ('COMPLETED', 'INVOICED') OR
        (a.invoice_id IS NOT NULL AND i.send_status = 'SENT') THEN 1 ELSE 0 END) AS completed
    FROM return_event_items rei JOIN return_events re ON re.id = rei.return_event_id
    LEFT JOIN damaged_assets a ON a.return_event_item_id = rei.id
    LEFT JOIN invoices i ON i.id = a.invoice_id
    WHERE rei.id = ? GROUP BY rei.id`).get(returnItemId);
  if (!item) return;
  const resolved = Number(item.registered) >= item.damaged_quantity && Number(item.completed) >= item.damaged_quantity;
  db.prepare(`UPDATE return_event_items SET issue_resolved_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(resolved ? new Date().toISOString() : null, returnItemId);
  const pending = db.prepare(`SELECT COUNT(*) AS count FROM return_event_items rei
    JOIN return_events re ON re.id = rei.return_event_id
    WHERE re.delivery_list_id = ? AND rei.damaged_quantity > 0 AND rei.issue_resolved_at IS NULL
      AND rei.deleted_at IS NULL AND re.deleted_at IS NULL`).get(item.delivery_list_id).count;
  const remaining = db.prepare(`SELECT COALESCE(SUM(dli.delivered_quantity),0) - COALESCE((
    SELECT SUM(rei.healthy_quantity + rei.damaged_quantity) FROM return_event_items rei
    JOIN return_events re ON re.id = rei.return_event_id
    JOIN delivery_list_items dli2 ON dli2.id = rei.delivery_list_item_id
    WHERE dli2.delivery_list_id = ? AND rei.deleted_at IS NULL AND re.deleted_at IS NULL),0) AS count
    FROM delivery_list_items dli WHERE dli.delivery_list_id = ? AND dli.deleted_at IS NULL`).get(item.delivery_list_id, item.delivery_list_id).count;
  const status = pending ? 'NEEDS_FOLLOW_UP' : remaining > 0 ? 'REMAINING' : 'COMPLETED';
  db.prepare(`UPDATE delivery_lists SET status = ?, completed_at = CASE WHEN ? = 'COMPLETED'
    THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END,
    updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ?`)
    .run(status, status, item.delivery_list_id);
}
function syncInvoiceAssets(invoiceId) {
  db.prepare('SELECT DISTINCT return_event_item_id FROM damaged_assets WHERE invoice_id = ? AND return_event_item_id IS NOT NULL')
    .all(invoiceId).forEach((row) => syncReturnItem(row.return_event_item_id));
}

router.get('/', run(() => ({ assets: assets() })));
router.get('/candidates', run(() => ({ candidates: db.prepare(`SELECT rei.id AS return_event_item_id,
  re.delivery_list_id, dli.product_id, dli.product_name_snapshot, dl.customer_id,
  dl.list_number, rei.damage_notes, rei.damaged_quantity - COUNT(a.id) AS unregistered_quantity
  FROM return_event_items rei JOIN return_events re ON re.id = rei.return_event_id
  JOIN delivery_list_items dli ON dli.id = rei.delivery_list_item_id
  JOIN delivery_lists dl ON dl.id = re.delivery_list_id
  LEFT JOIN damaged_assets a ON a.return_event_item_id = rei.id
  WHERE rei.damaged_quantity > 0 AND rei.deleted_at IS NULL AND re.deleted_at IS NULL
  GROUP BY rei.id HAVING unregistered_quantity > 0 ORDER BY re.returned_at DESC`).all() })));
router.get('/repairers', run(() => ({ repairers: db.prepare(`SELECT * FROM repairers WHERE deleted_at IS NULL ORDER BY name, id`).all()
  .map((repairer) => ({ ...repairer, ...allocations(repairer.id) })) })));
router.post('/repairers', run((req) => {
  const name = required(req.body.name, 'نام تعمیرکننده');
  const id = db.prepare('INSERT INTO repairers (name, phone, notes) VALUES (?, ?, ?)')
    .run(name, req.body.phone || null, req.body.notes || null).lastInsertRowid;
  return { created: true, data: ensure(find('repairers', id), 'تعمیرکننده') };
}));
router.put('/repairers/:id', run((req) => {
  const repairer = ensure(find('repairers', req.params.id), 'تعمیرکننده');
  if (repairer.deleted_at) throw new InputError('تعمیرکننده حذف شده است');
  db.prepare(`UPDATE repairers SET name = ?, phone = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(required(req.body.name, 'نام تعمیرکننده'), req.body.phone || null, req.body.notes || null, repairer.id);
  return find('repairers', repairer.id);
}));
router.delete('/repairers/:id', run((req) => {
  const repairer = ensure(find('repairers', req.params.id), 'تعمیرکننده');
  if (allocations(repairer.id).due > 0) throw new InputError('تعمیرکننده با بدهی باز قابل حذف نیست');
  db.prepare(`UPDATE repairers SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(repairer.id);
  return { success: true };
}));
router.get('/repairers/:id/payments', run((req) => ({ payments: db.prepare(`SELECT * FROM repairer_payments WHERE repairer_id = ? ORDER BY paid_at DESC, id DESC`)
  .all(positiveId(req.params.id, 'تعمیرکننده')) })));
router.post('/repairers/:id/payments', run((req) => db.transaction(() => {
  const repairer = ensure(find('repairers', req.params.id), 'تعمیرکننده');
  if (repairer.deleted_at) throw new InputError('تعمیرکننده حذف شده است');
  const amount = money(req.body.amount_toman, 'مبلغ پرداخت');
  if (amount > allocations(repairer.id).due) throw new InputError('مبلغ پرداخت از بدهی بیشتر است');
  const id = db.prepare(`INSERT INTO repairer_payments (repairer_id, amount_toman, paid_at, notes, created_by_user_id)
    VALUES (?, ?, ?, ?, ?)`).run(repairer.id, amount, date(req.body.paid_at, 'تاریخ پرداخت'), req.body.notes || null, req.user.id).lastInsertRowid;
  return { created: true, data: find('repairer_payments', id) };
})()));

router.post('/', run((req) => db.transaction(() => {
  const product = ensure(db.prepare(`SELECT * FROM products WHERE id = ? AND deleted_at IS NULL`).get(positiveId(req.body.product_id, 'محصول')), 'محصول');
  const assetNumber = required(req.body.asset_number, 'شماره اموال');
  const issue = required(req.body.issue_description, 'شرح ایراد یا خسارت');
  const returnId = optionalId(req.body.return_event_item_id, 'قلم برگشتی');
  let listId = null;
  let customerId = optionalId(req.body.customer_id, 'مشتری');
  let relatedInvoiceId = optionalId(req.body.related_invoice_id, 'فاکتور مرتبط');
  if (returnId) {
    const source = ensure(db.prepare(`SELECT rei.damaged_quantity, rei.damage_notes, dli.product_id,
      re.delivery_list_id, dl.customer_id, COUNT(a.id) AS registered
      FROM return_event_items rei JOIN return_events re ON re.id = rei.return_event_id
      JOIN delivery_list_items dli ON dli.id = rei.delivery_list_item_id
      JOIN delivery_lists dl ON dl.id = re.delivery_list_id
      LEFT JOIN damaged_assets a ON a.return_event_item_id = rei.id
      WHERE rei.id = ? AND rei.deleted_at IS NULL AND re.deleted_at IS NULL GROUP BY rei.id`).get(returnId), 'قلم برگشتی');
    if (source.product_id !== product.id || source.registered >= source.damaged_quantity) throw new InputError('ظرفیت خسارت این قلم تکمیل شده است');
    listId = source.delivery_list_id;
    customerId = source.customer_id;
    relatedInvoiceId = null;
  }
  if (customerId) ensure(find('customers', customerId), 'مشتری');
  if (relatedInvoiceId) {
    const invoice = ensure(db.prepare(`SELECT id, customer_id, status FROM invoices WHERE id = ? AND deleted_at IS NULL`).get(relatedInvoiceId), 'فاکتور مرتبط');
    if (invoice.customer_id !== customerId || invoice.status !== 'ISSUED') throw new InputError('فاکتور مرتبط با مشتری پرونده سازگار نیست');
  }
  if (!returnId && customerId && !relatedInvoiceId) throw new InputError('برای پرونده مستقل مشتری، فاکتور مرتبط را انتخاب کنید');
  const id = db.prepare(`INSERT INTO damaged_assets (product_id, product_name_snapshot, asset_number,
    customer_id, related_invoice_id, delivery_list_id, return_event_item_id, issue_description, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(product.id, product.name, assetNumber,
      customerId, relatedInvoiceId, listId, returnId, issue, req.user.id).lastInsertRowid;
  return { created: true, data: find('damaged_assets', id) };
})()));

router.patch('/:id', run((req) => db.transaction(() => {
  const asset = ensure(find('damaged_assets', req.params.id), 'پرونده');
  if (asset.invoice_id) throw new InputError('پرونده فاکتورشده قابل ویرایش نیست');
  const operation = required(req.body.operation, 'عملیات');
  if (operation === 'details') {
    db.prepare(`UPDATE damaged_assets SET asset_number = ?, issue_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(required(req.body.asset_number, 'شماره اموال'), required(req.body.issue_description, 'شرح ایراد'), asset.id);
  } else if (operation === 'send') {
    if (asset.status !== 'NEEDS_FOLLOW_UP') throw new InputError('ارسال به تعمیر در این وضعیت مجاز نیست');
    const repairerId = positiveId(req.body.repairer_id, 'تعمیرکننده');
    const repairer = ensure(find('repairers', repairerId), 'تعمیرکننده');
    if (repairer.deleted_at) throw new InputError('تعمیرکننده حذف شده است');
    db.prepare(`UPDATE damaged_assets SET status = 'REPAIR', repairer_id = ?, sent_at = ?, returned_at = NULL,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(repairerId, date(req.body.sent_at, 'تاریخ ارسال'), asset.id);
  } else if (operation === 'return') {
    if (asset.status !== 'REPAIR') throw new InputError('پرونده در وضعیت تعمیر نیست');
    const returnedAt = date(req.body.returned_at, 'تاریخ برگشت');
    if (returnedAt < asset.sent_at) throw new InputError('تاریخ برگشت پیش از تاریخ ارسال است');
    db.prepare(`UPDATE damaged_assets SET status = 'RETURNED', returned_at = ?, repair_cost_toman = ?,
      updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(returnedAt, money(req.body.repair_cost_toman, 'هزینه تعمیر', true), asset.id);
  } else if (operation === 'resolve') {
    if (!['NEEDS_FOLLOW_UP', 'RETURNED'].includes(asset.status)) throw new InputError('پرونده هنوز آماده تکمیل نیست');
    db.prepare(`UPDATE damaged_assets SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(asset.id);
  } else if (operation === 'assess') {
    if (!asset.customer_id) throw new InputError('برای تعیین خسارت باید مشتری پرونده مشخص باشد');
    if (!['NEEDS_FOLLOW_UP', 'RETURNED'].includes(asset.status)) throw new InputError('پرونده هنوز آماده تعیین خسارت نیست');
    db.prepare(`UPDATE damaged_assets SET status = 'DAMAGE_ASSESSED', damage_amount_toman = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(money(req.body.damage_amount_toman, 'مبلغ خسارت'), asset.id);
  } else throw new InputError('عملیات نامعتبر است');
  syncReturnItem(asset.return_event_item_id);
  return find('damaged_assets', asset.id);
})()));

router.post('/:id/invoice', run((req) => db.transaction(() => {
  const asset = ensure(find('damaged_assets', req.params.id), 'پرونده');
  if (asset.status !== 'DAMAGE_ASSESSED' || asset.invoice_id) throw new InputError('خسارت در وضعیت صدور فاکتور نیست');
  const issuedAt = new Date().toISOString();
  const description = `خسارت ${asset.product_name_snapshot}، شماره اموال ${asset.asset_number}: ${asset.issue_description}`;
  const last = asset.related_invoice_id
    ? db.prepare(`SELECT * FROM invoices WHERE id = ? AND customer_id = ? AND status = 'ISSUED' AND deleted_at IS NULL`)
      .get(asset.related_invoice_id, asset.customer_id)
    : db.prepare(`SELECT * FROM invoices WHERE customer_id = ? AND delivery_list_id = ? AND status = 'ISSUED' AND deleted_at IS NULL
      ORDER BY issued_at DESC, id DESC LIMIT 1`).get(asset.customer_id, asset.delivery_list_id);
  let invoiceId;
  let adjustmentAdded = false;
  if (!last && asset.delivery_list_id) {
    invoiceId = createDeliveryInvoiceService(db).issueInvoice(asset.delivery_list_id,
      { extras: [{ type: 'DAMAGE', description, amount_toman: asset.damage_amount_toman }] }, req.user.id).id;
    adjustmentAdded = true;
  } else if (last && last.send_status !== 'SENT' && !last.is_shipped && last.settlement_status === 'UNPAID' && !last.is_settled) {
    const subtotal = last.invoice_type === 'LEGACY' && !Number(last.subtotal_toman)
      ? Math.round(Number(last.price) || 0) : Number(last.subtotal_toman);
    const grossBefore = subtotal + Number(last.extra_charges_toman);
    const fixedDiscount = Number(last.discount_amount_toman) - Math.floor(grossBefore * Number(last.discount_percent_basis_points) / 10000);
    const grossAfter = grossBefore + asset.damage_amount_toman;
    const discount = Math.floor(grossAfter * Number(last.discount_percent_basis_points) / 10000) + fixedDiscount;
    const total = grossAfter - discount + Number(last.rounding_adjustment_toman);
    db.prepare(`UPDATE invoices SET price = ?, subtotal_toman = ?, extra_charges_toman = extra_charges_toman + ?,
      discount_amount_toman = ?, final_amount_toman = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ?`)
      .run(total, subtotal, asset.damage_amount_toman, discount, total, last.id);
    invoiceId = last.id;
  } else {
    const number = nextInvoiceNumber(db, issuedAt);
    invoiceId = db.prepare(`INSERT INTO invoices (customer_id, date, price, description, delivery_list_id,
      parent_invoice_id, invoice_number, invoice_type, status, subtotal_toman, extra_charges_toman,
      final_amount_toman, issued_at, issued_by_user_id, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', 0, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
      .run(asset.customer_id, issuedAt.slice(0, 10), asset.damage_amount_toman, description,
        asset.delivery_list_id, last?.id || null, number, last ? 'SUPPLEMENT' : 'PRIMARY',
        asset.damage_amount_toman, asset.damage_amount_toman, issuedAt, req.user.id).lastInsertRowid;
  }
  if (!adjustmentAdded) db.prepare(`INSERT INTO invoice_adjustments (invoice_id, adjustment_type, description, amount_toman, sort_order)
    VALUES (?, 'DAMAGE', ?, ?, ?)`).run(invoiceId, description, asset.damage_amount_toman,
      db.prepare(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS position FROM invoice_adjustments WHERE invoice_id = ?`).get(invoiceId).position);
  db.prepare(`UPDATE damaged_assets SET invoice_id = ?, status = 'INVOICED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(invoiceId, asset.id);
  syncReturnItem(asset.return_event_item_id);
  return { invoice_id: invoiceId, invoice_number: db.prepare('SELECT invoice_number FROM invoices WHERE id = ?').get(invoiceId).invoice_number };
})()));

router.patch('/:id/send-invoice', run((req) => db.transaction(() => {
  const asset = ensure(find('damaged_assets', req.params.id), 'پرونده');
  if (!asset.invoice_id) throw new InputError('فاکتور پرونده صادر نشده است');
  const invoice = ensure(find('invoices', asset.invoice_id), 'فاکتور');
  const sentAt = date(req.body.sent_at || new Date().toISOString(), 'تاریخ ارسال');
  const channel = String(req.body.channel || 'MANUAL').toUpperCase();
  if (!['EITA', 'PRINT', 'MANUAL', 'OTHER'].includes(channel)) throw new InputError('روش ارسال نامعتبر است');
  if (invoice.delivery_list_id) {
    createDeliveryInvoiceService(db).updateSendStatus(invoice.delivery_list_id, invoice.id,
      { send_status: 'SENT', sent_at: sentAt, channel, recipient: req.body.recipient || null }, req.user.id);
  } else {
    db.prepare(`INSERT INTO invoice_send_logs (invoice_id, channel, recipient, status, sent_at, sent_by_user_id)
      VALUES (?, ?, ?, 'SENT', ?, ?)`).run(invoice.id, channel, req.body.recipient || null, sentAt, req.user.id);
    db.prepare(`UPDATE invoices SET send_status = 'SENT', is_shipped = 1,
      updated_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = ?`).run(invoice.id);
  }
  syncInvoiceAssets(invoice.id);
  return { success: true };
})()));

router.get('/:id/invoice/pdf', async (req, res) => {
  try {
    const asset = ensure(find('damaged_assets', req.params.id), 'پرونده');
    if (!asset.invoice_id) throw new InputError('فاکتور پرونده صادر نشده است');
    const invoice = ensure(find('invoices', asset.invoice_id), 'فاکتور');
    let buffer;
    if (invoice.delivery_list_id) {
      buffer = (await createInvoicePdfService(db).generate(invoice.delivery_list_id, invoice.id)).buffer;
    } else {
      const details = db.prepare(`SELECT i.*, c.name AS customer_name, c.phone AS customer_phone,
        p.invoice_number AS parent_invoice_number, COALESCE(s.collection_name, 'مجموعه من') AS collection_name
        FROM invoices i JOIN customers c ON c.id = i.customer_id
        LEFT JOIN invoices p ON p.id = i.parent_invoice_id LEFT JOIN app_settings s ON s.id = 1
        WHERE i.id = ?`).get(invoice.id);
      details._damage_only = invoice.invoice_type !== 'LEGACY';
      const adjustments = db.prepare(`SELECT adjustment_type, description, percent_basis_points, amount_toman
        FROM invoice_adjustments WHERE invoice_id = ? AND deleted_at IS NULL ORDER BY sort_order, id`).all(invoice.id);
      const lines = invoice.invoice_type === 'LEGACY' && Number(invoice.subtotal_toman) > 0
        ? [{ description: invoice.description || 'مبلغ فاکتور اصلی', quantity: 1, charged_days: 1,
          unit_price_toman: invoice.subtotal_toman, line_total_toman: invoice.subtotal_toman }]
        : [];
      buffer = await renderInvoicePdf({ invoice: details, lines, adjustments });
    }
    const filename = `invoice-${invoice.invoice_number || invoice.id}.pdf`;
    if (req.query.transport === 'base64') return res.json({ filename, content_type: 'application/pdf', data_base64: buffer.toString('base64') });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    if (error instanceof InputError) return res.status(error.status).json({ message: error.message });
    console.error('Damage invoice PDF:', error);
    return res.status(500).json({ message: 'خطا در ایجاد PDF فاکتور' });
  }
});

module.exports = router;
module.exports.syncInvoiceAssets = syncInvoiceAssets;
