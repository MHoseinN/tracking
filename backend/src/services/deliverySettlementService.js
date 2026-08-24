const { DeliveryListDraftError } = require('./deliveryListDraftService');

function nullableText(value) {
  const text = String(value || '').trim();
  return text || null;
}

function nullableId(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new DeliveryListDraftError('شناسه فاکتور نامعتبر است');
  return id;
}

function getFinancialState(db, listId) {
  const list = db.prepare(`
    SELECT id, list_number, customer_name_snapshot, status, invoice_status,
           settlement_status, delivered_at
    FROM delivery_lists
    WHERE id = ? AND archived_at IS NULL
  `).get(listId);
  if (!list) throw new DeliveryListDraftError('لیست پیدا نشد', 404);
  if (list.status === 'DRAFT') {
    throw new DeliveryListDraftError('برای پیش‌نویس امکان ثبت پرداخت وجود ندارد', 409);
  }
  const totals = db.prepare(`
    SELECT
      (SELECT COALESCE(SUM(final_amount_toman), 0)
         FROM invoices
        WHERE delivery_list_id = ? AND status = 'ISSUED' AND deleted_at IS NULL
      ) AS total_invoiced_toman,
      (SELECT COALESCE(SUM(amount_toman), 0)
         FROM payments
        WHERE delivery_list_id = ? AND voided_at IS NULL
      ) AS total_paid_toman
  `).get(list.id, list.id);
  return {
    list,
    totalInvoiced: Number(totals.total_invoiced_toman) || 0,
    totalPaid: Number(totals.total_paid_toman) || 0
  };
}

function recalculateSettlementStatus(db, listId) {
  const state = getFinancialState(db, listId);
  const status = state.totalPaid === 0
    ? 'UNPAID'
    : state.list.invoice_status === 'ISSUED'
      && state.totalInvoiced > 0
      && state.totalPaid >= state.totalInvoiced
      ? 'PAID'
      : 'PARTIAL';
  db.prepare(`
    UPDATE delivery_lists
    SET settlement_status = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1
    WHERE id = ?
  `).run(status, state.list.id);
  db.prepare(`
    UPDATE invoices
    SET settlement_status = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1
    WHERE delivery_list_id = ? AND status = 'ISSUED' AND deleted_at IS NULL
  `).run(status, state.list.id);
  return {
    settlement_status: status,
    total_invoiced_toman: state.totalInvoiced,
    total_paid_toman: state.totalPaid,
    balance_toman: Math.max(0, state.totalInvoiced - state.totalPaid),
    credit_toman: Math.max(0, state.totalPaid - state.totalInvoiced)
  };
}

function createDeliverySettlementService(db) {
  function getSummary(listId) {
    const state = getFinancialState(db, listId);
    const invoices = db.prepare(`
      SELECT id, invoice_number, invoice_type, final_amount_toman, settlement_status,
             issued_at
      FROM invoices
      WHERE delivery_list_id = ? AND status = 'ISSUED' AND deleted_at IS NULL
      ORDER BY issued_at, id
    `).all(state.list.id);
    const payments = db.prepare(`
      SELECT payments.id, payments.invoice_id, payments.amount_toman,
             payments.payment_method, payments.reference_number, payments.paid_at,
             payments.notes, payments.created_at, payments.voided_at,
             invoices.invoice_number,
             COALESCE(receiver.display_name, receiver.username) AS received_by_name,
             COALESCE(voider.display_name, voider.username) AS voided_by_name
      FROM payments
      JOIN users receiver ON receiver.id = payments.received_by_user_id
      LEFT JOIN users voider ON voider.id = payments.voided_by_user_id
      LEFT JOIN invoices ON invoices.id = payments.invoice_id
      WHERE payments.delivery_list_id = ?
      ORDER BY payments.paid_at DESC, payments.id DESC
    `).all(state.list.id);
    return {
      list: state.list,
      invoices,
      payments,
      total_invoiced_toman: state.totalInvoiced,
      total_paid_toman: state.totalPaid,
      balance_toman: Math.max(0, state.totalInvoiced - state.totalPaid),
      credit_toman: Math.max(0, state.totalPaid - state.totalInvoiced)
    };
  }

  function recordPayment(listId, payload = {}, actorUserId) {
    const state = getFinancialState(db, listId);
    const amount = Number(payload.amount_toman);
    if (!Number.isInteger(amount) || amount < 1) {
      throw new DeliveryListDraftError('مبلغ پرداخت باید بیشتر از صفر باشد');
    }
    const method = String(payload.payment_method || 'OTHER').toUpperCase();
    if (!['CASH', 'POS', 'CARD_TRANSFER', 'OTHER'].includes(method)) {
      throw new DeliveryListDraftError('روش پرداخت نامعتبر است');
    }
    const paidAtDate = new Date(payload.paid_at);
    if (Number.isNaN(paidAtDate.getTime())) throw new DeliveryListDraftError('تاریخ و ساعت پرداخت نامعتبر است');
    const invoiceId = nullableId(payload.invoice_id);
    if (invoiceId) {
      const invoice = db.prepare(`
        SELECT id FROM invoices
        WHERE id = ? AND delivery_list_id = ? AND status = 'ISSUED' AND deleted_at IS NULL
      `).get(invoiceId, state.list.id);
      if (!invoice) throw new DeliveryListDraftError('فاکتور انتخاب‌شده متعلق به این لیست نیست', 404);
    }

    let paymentId;
    const save = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO payments (
          delivery_list_id, invoice_id, amount_toman, payment_method,
          reference_number, paid_at, received_by_user_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        state.list.id,
        invoiceId,
        amount,
        method,
        nullableText(payload.reference_number),
        paidAtDate.toISOString(),
        actorUserId,
        nullableText(payload.notes)
      );
      paymentId = Number(result.lastInsertRowid);
      const settlement = recalculateSettlementStatus(db, state.list.id);
      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action, after_json, metadata_json
        ) VALUES (?, 'PAYMENT', ?, 'RECORD_PAYMENT', ?, ?)
      `).run(
        actorUserId,
        String(paymentId),
        JSON.stringify({ amount_toman: amount, payment_method: method, paid_at: paidAtDate.toISOString() }),
        JSON.stringify({ delivery_list_id: state.list.id, invoice_id: invoiceId, settlement_status: settlement.settlement_status })
      );
    });
    save();
    return getSummary(state.list.id);
  }

  function voidPayment(listId, paymentId, actorUserId) {
    const state = getFinancialState(db, listId);
    const payment = db.prepare(`
      SELECT id, amount_toman, voided_at
      FROM payments WHERE id = ? AND delivery_list_id = ?
    `).get(paymentId, state.list.id);
    if (!payment) throw new DeliveryListDraftError('پرداخت پیدا نشد', 404);
    if (payment.voided_at) throw new DeliveryListDraftError('این پرداخت قبلاً باطل شده است', 409);

    const voidTransaction = db.transaction(() => {
      const result = db.prepare(`
        UPDATE payments
        SET voided_at = CURRENT_TIMESTAMP, voided_by_user_id = ?
        WHERE id = ? AND delivery_list_id = ? AND voided_at IS NULL
      `).run(actorUserId, payment.id, state.list.id);
      if (result.changes !== 1) throw new DeliveryListDraftError('ابطال پرداخت انجام نشد', 409);
      const settlement = recalculateSettlementStatus(db, state.list.id);
      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action, before_json, after_json, metadata_json
        ) VALUES (?, 'PAYMENT', ?, 'VOID_PAYMENT', ?, ?, ?)
      `).run(
        actorUserId,
        String(payment.id),
        JSON.stringify({ voided_at: null, amount_toman: payment.amount_toman }),
        JSON.stringify({ voided: true }),
        JSON.stringify({ delivery_list_id: state.list.id, settlement_status: settlement.settlement_status })
      );
    });
    voidTransaction();
    return getSummary(state.list.id);
  }

  return { getSummary, recordPayment, voidPayment };
}

module.exports = { createDeliverySettlementService, recalculateSettlementStatus };
