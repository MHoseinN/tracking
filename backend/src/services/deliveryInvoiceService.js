const { DeliveryListDraftError } = require('./deliveryListDraftService');
const { nextInvoiceNumber } = require('./workflowNumberingService');
const { recalculateSettlementStatus } = require('./deliverySettlementService');

function textOrNull(value) {
  const text = String(value || '').trim();
  return text || null;
}

function nonNegativeInteger(value, fieldName) {
  const number = Number(value || 0);
  if (!Number.isInteger(number) || number < 0) {
    throw new DeliveryListDraftError(`${fieldName} نامعتبر است`);
  }
  return number;
}

function invoiceDate(dateValue) {
  const parts = new Intl.DateTimeFormat('en', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tehran'
  }).formatToParts(new Date(dateValue));
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function recalculateInvoiceSendStatus(db, listId) {
  const counts = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN send_status = 'SENT' THEN 1 ELSE 0 END) AS sent
    FROM invoices
    WHERE delivery_list_id = ? AND status = 'ISSUED' AND deleted_at IS NULL
  `).get(listId);
  const total = Number(counts.total) || 0;
  const sent = Number(counts.sent) || 0;
  const status = total > 0 && sent === total
    ? 'SENT'
    : (sent > 0 ? 'PARTIALLY_SENT' : 'NOT_SENT');
  db.prepare(`
    UPDATE delivery_lists
    SET invoice_send_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, listId);
  return status;
}

function createDeliveryInvoiceService(db) {
  function getList(listId) {
    const list = db.prepare(`
      SELECT id, list_number, customer_id, customer_name_snapshot, status,
             invoice_status, settlement_status, delivered_at
      FROM delivery_lists
      WHERE id = ? AND archived_at IS NULL
    `).get(listId);
    if (!list) throw new DeliveryListDraftError('لیست پیدا نشد', 404);
    if (list.status === 'DRAFT') {
      throw new DeliveryListDraftError('برای پیش‌نویس امکان صدور فاکتور وجود ندارد', 409);
    }
    return list;
  }

  function unbilledReturnLines(listId) {
    return db.prepare(`
      SELECT return_event_items.id AS return_event_item_id,
             delivery_list_items.id AS delivery_list_item_id,
             delivery_list_items.product_name_snapshot AS description,
             return_event_items.healthy_quantity + return_event_items.damaged_quantity
               + return_event_items.lost_quantity AS quantity,
             delivery_lists.delivered_at AS billing_from_at,
             return_events.returned_at AS billing_to_at,
             return_event_items.final_charged_days AS charged_days,
             delivery_list_items.daily_price_toman AS unit_price_toman,
             (return_event_items.healthy_quantity + return_event_items.damaged_quantity
               + return_event_items.lost_quantity)
               * return_event_items.final_charged_days
               * delivery_list_items.daily_price_toman AS line_total_toman
      FROM return_event_items
      JOIN return_events
        ON return_events.id = return_event_items.return_event_id
       AND return_events.deleted_at IS NULL
      JOIN delivery_list_items
        ON delivery_list_items.id = return_event_items.delivery_list_item_id
       AND delivery_list_items.deleted_at IS NULL
      JOIN delivery_lists ON delivery_lists.id = delivery_list_items.delivery_list_id
      LEFT JOIN invoice_lines
        ON invoice_lines.return_event_item_id = return_event_items.id
       AND invoice_lines.line_type = 'RENTAL'
       AND invoice_lines.deleted_at IS NULL
      WHERE delivery_lists.id = ?
        AND return_event_items.deleted_at IS NULL
        AND invoice_lines.id IS NULL
      ORDER BY return_events.returned_at, return_event_items.id
    `).all(listId);
  }

  function getPreview(listId) {
    const list = getList(listId);
    const lines = unbilledReturnLines(listId);
    const subtotal = lines.reduce((sum, line) => sum + Number(line.line_total_toman), 0);
    return { list, lines, subtotal_toman: subtotal };
  }

  function normalizeLines(listId, payloadLines) {
    const available = unbilledReturnLines(listId);
    if (!available.length) {
      throw new DeliveryListDraftError('مرجوعی جدیدی برای صدور فاکتور وجود ندارد', 409);
    }
    const availableById = new Map(available.map((line) => [Number(line.return_event_item_id), line]));
    const input = Array.isArray(payloadLines) && payloadLines.length ? payloadLines : available;
    const seen = new Set();
    const normalized = input.map((line) => {
      const id = Number(line.return_event_item_id);
      const source = availableById.get(id);
      if (!source || seen.has(id)) throw new DeliveryListDraftError('ردیف فاکتور نامعتبر یا تکراری است');
      seen.add(id);
      const chargedDays = Number(line.charged_days ?? source.charged_days);
      const unitPrice = Number(line.unit_price_toman ?? source.unit_price_toman);
      if (!Number.isInteger(chargedDays) || chargedDays < 1) {
        throw new DeliveryListDraftError('تعداد روز هر ردیف باید حداقل یک باشد');
      }
      if (!Number.isInteger(unitPrice) || unitPrice < 0) {
        throw new DeliveryListDraftError('قیمت واحد هر ردیف نامعتبر است');
      }
      return {
        ...source,
        charged_days: chargedDays,
        unit_price_toman: unitPrice,
        line_total_toman: Number(source.quantity) * chargedDays * unitPrice
      };
    });
    if (normalized.length !== available.length) {
      throw new DeliveryListDraftError('تمام اقلام برگشتیِ فاکتورنشده باید در این مرحله بررسی شوند');
    }
    return normalized;
  }

  function normalizeExtras(extras) {
    if (!Array.isArray(extras)) return [];
    const allowedTypes = new Set(['DAMAGE', 'LOSS', 'TRANSPORT', 'OTHER']);
    return extras.map((extra) => {
      const type = String(extra.type || '').toUpperCase();
      if (!allowedTypes.has(type)) throw new DeliveryListDraftError('نوع هزینه اضافی نامعتبر است');
      const description = textOrNull(extra.description);
      if (!description) throw new DeliveryListDraftError('شرح هزینه اضافی الزامی است');
      const amount = nonNegativeInteger(extra.amount_toman, 'مبلغ هزینه اضافی');
      if (amount < 1) throw new DeliveryListDraftError('مبلغ هزینه اضافی باید بیشتر از صفر باشد');
      return { type, description, amount };
    });
  }

  function getInvoice(listId, invoiceId) {
    getList(listId);
    const invoice = db.prepare(`
      SELECT id, delivery_list_id, parent_invoice_id, invoice_number, invoice_type,
             status, settlement_status, send_status, notes, subtotal_toman,
             extra_charges_toman, discount_percent_basis_points,
             discount_amount_toman, rounding_adjustment_toman, final_amount_toman,
             issued_at, issued_by_user_id, version
      FROM invoices
      WHERE id = ? AND delivery_list_id = ? AND status = 'ISSUED'
        AND deleted_at IS NULL
    `).get(invoiceId, listId);
    if (!invoice) throw new DeliveryListDraftError('فاکتور صادرشده پیدا نشد', 404);
    invoice.lines = db.prepare(`
      SELECT id, return_event_item_id, delivery_list_item_id, description, quantity,
             billing_from_at, billing_to_at, charged_days, unit_price_toman,
             line_total_toman, sort_order
      FROM invoice_lines
      WHERE invoice_id = ? AND line_type = 'RENTAL' AND deleted_at IS NULL
      ORDER BY sort_order, id
    `).all(invoice.id);
    const adjustments = db.prepare(`
      SELECT id, adjustment_type, description, percent_basis_points,
             amount_toman, sort_order
      FROM invoice_adjustments
      WHERE invoice_id = ? AND deleted_at IS NULL
      ORDER BY sort_order, id
    `).all(invoice.id);
    invoice.extras = adjustments
      .filter((item) => ['DAMAGE', 'LOSS', 'TRANSPORT', 'OTHER'].includes(item.adjustment_type))
      .map((item) => ({
        id: item.id,
        type: item.adjustment_type,
        description: item.description,
        amount_toman: Number(item.amount_toman)
      }));
    invoice.fixed_discount_toman = Math.abs(adjustments
      .filter((item) => item.adjustment_type === 'DISCOUNT_AMOUNT')
      .reduce((sum, item) => sum + Number(item.amount_toman), 0));
    invoice.send_logs = db.prepare(`
      SELECT invoice_send_logs.id, invoice_send_logs.channel,
             invoice_send_logs.recipient, invoice_send_logs.status,
             invoice_send_logs.sent_at, invoice_send_logs.notes,
             COALESCE(users.display_name, users.username) AS sent_by_name
      FROM invoice_send_logs
      JOIN users ON users.id = invoice_send_logs.sent_by_user_id
      WHERE invoice_send_logs.invoice_id = ?
      ORDER BY invoice_send_logs.sent_at DESC, invoice_send_logs.id DESC
    `).all(invoice.id);
    return invoice;
  }

  function updateSendStatus(listId, invoiceId, payload = {}, actorUserId) {
    const existing = getInvoice(listId, invoiceId);
    const nextStatus = String(payload.send_status || '').toUpperCase();
    if (!['SENT', 'NOT_SENT'].includes(nextStatus)) {
      throw new DeliveryListDraftError('وضعیت ارسال فاکتور نامعتبر است');
    }
    const allowedChannels = new Set(['EITA', 'PRINT', 'MANUAL', 'OTHER']);
    const channel = String(payload.channel || (nextStatus === 'SENT' ? 'EITA' : 'MANUAL')).toUpperCase();
    if (!allowedChannels.has(channel)) throw new DeliveryListDraftError('روش ارسال فاکتور نامعتبر است');
    const sentDate = payload.sent_at ? new Date(payload.sent_at) : new Date();
    if (Number.isNaN(sentDate.getTime())) throw new DeliveryListDraftError('زمان ارسال فاکتور نامعتبر است');
    const sentAt = sentDate.toISOString();
    const recipient = textOrNull(payload.recipient);
    const notes = textOrNull(payload.notes);

    db.transaction(() => {
      db.prepare(`
        INSERT INTO invoice_send_logs (
          invoice_id, channel, recipient, status, sent_at, sent_by_user_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(existing.id, channel, recipient,
        nextStatus === 'SENT' ? 'SENT' : 'FAILED', sentAt, actorUserId, notes);
      db.prepare(`
        UPDATE invoices
        SET send_status = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE id = ?
      `).run(nextStatus, existing.id);
      const listSendStatus = recalculateInvoiceSendStatus(db, Number(listId));
      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action,
          before_json, after_json, metadata_json
        ) VALUES (?, 'INVOICE', ?, ?, ?, ?, ?)
      `).run(
        actorUserId,
        String(existing.id),
        nextStatus === 'SENT' ? 'MARK_INVOICE_SENT' : 'MARK_INVOICE_NOT_SENT',
        JSON.stringify({ send_status: existing.send_status }),
        JSON.stringify({ send_status: nextStatus }),
        JSON.stringify({
          delivery_list_id: Number(listId),
          list_send_status: listSendStatus,
          channel,
          recipient
        })
      );
    })();

    return getInvoice(listId, invoiceId);
  }

  function updateInvoice(listId, invoiceId, payload = {}, actorUserId) {
    const existing = getInvoice(listId, invoiceId);
    const inputLines = Array.isArray(payload.lines) ? payload.lines : [];
    if (inputLines.length !== existing.lines.length) {
      throw new DeliveryListDraftError('تمام ردیف‌های فاکتور باید برای ویرایش ارسال شوند');
    }
    const existingById = new Map(existing.lines.map((line) => [Number(line.id), line]));
    const seen = new Set();
    const lines = inputLines.map((line) => {
      const id = Number(line.id);
      const source = existingById.get(id);
      if (!source || seen.has(id)) throw new DeliveryListDraftError('ردیف فاکتور نامعتبر یا تکراری است');
      seen.add(id);
      const chargedDays = Number(line.charged_days);
      const unitPrice = Number(line.unit_price_toman);
      if (!Number.isInteger(chargedDays) || chargedDays < 1) {
        throw new DeliveryListDraftError('تعداد روز هر ردیف باید حداقل یک باشد');
      }
      if (!Number.isInteger(unitPrice) || unitPrice < 0) {
        throw new DeliveryListDraftError('قیمت واحد هر ردیف نامعتبر است');
      }
      return {
        ...source,
        charged_days: chargedDays,
        unit_price_toman: unitPrice,
        line_total_toman: Number(source.quantity) * chargedDays * unitPrice
      };
    });

    const extras = normalizeExtras(payload.extras);
    const discountBasisPoints = nonNegativeInteger(
      payload.discount_percent_basis_points,
      'درصد تخفیف'
    );
    if (discountBasisPoints > 10000) {
      throw new DeliveryListDraftError('درصد تخفیف نمی‌تواند بیشتر از صد درصد باشد');
    }
    const fixedDiscount = nonNegativeInteger(payload.discount_amount_toman, 'تخفیف ثابت');
    const rounding = Number(payload.rounding_adjustment_toman || 0);
    if (!Number.isInteger(rounding) || rounding > 0) {
      throw new DeliveryListDraftError('مبلغ رند کردن باید صفر یا منفی باشد');
    }
    const subtotal = lines.reduce((sum, line) => sum + line.line_total_toman, 0);
    const extraCharges = extras.reduce((sum, extra) => sum + extra.amount, 0);
    const gross = subtotal + extraCharges;
    const percentDiscount = Math.floor(gross * discountBasisPoints / 10000);
    const totalDiscount = percentDiscount + fixedDiscount;
    if (totalDiscount > gross) throw new DeliveryListDraftError('مجموع تخفیف از مبلغ فاکتور بیشتر است');
    const finalAmount = gross - totalDiscount + rounding;
    if (finalAmount < 0) throw new DeliveryListDraftError('مبلغ نهایی فاکتور نمی‌تواند منفی باشد');

    db.transaction(() => {
      db.prepare(`
        UPDATE invoices
        SET price = ?, notes = ?, subtotal_toman = ?, extra_charges_toman = ?,
            discount_percent_basis_points = ?, discount_amount_toman = ?,
            rounding_adjustment_toman = ?, final_amount_toman = ?,
            send_status = 'NOT_SENT', updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = ?
      `).run(finalAmount, textOrNull(payload.notes), subtotal, extraCharges,
        discountBasisPoints, totalDiscount, rounding, finalAmount, existing.id);

      const updateLine = db.prepare(`
        UPDATE invoice_lines
        SET charged_days = ?, unit_price_toman = ?, line_total_toman = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND invoice_id = ? AND deleted_at IS NULL
      `);
      lines.forEach((line) => updateLine.run(
        line.charged_days, line.unit_price_toman, line.line_total_toman,
        line.id, existing.id
      ));

      db.prepare(`
        UPDATE invoice_adjustments
        SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE invoice_id = ? AND deleted_at IS NULL
      `).run(existing.id);
      const insertAdjustment = db.prepare(`
        INSERT INTO invoice_adjustments (
          invoice_id, adjustment_type, description, percent_basis_points,
          amount_toman, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      let adjustmentOrder = 0;
      extras.forEach((extra) => insertAdjustment.run(
        existing.id, extra.type, extra.description, null, extra.amount, adjustmentOrder++
      ));
      if (discountBasisPoints > 0) insertAdjustment.run(
        existing.id, 'DISCOUNT_PERCENT', 'تخفیف درصدی', discountBasisPoints,
        -percentDiscount, adjustmentOrder++
      );
      if (fixedDiscount > 0) insertAdjustment.run(
        existing.id, 'DISCOUNT_AMOUNT', 'تخفیف مبلغی', null,
        -fixedDiscount, adjustmentOrder++
      );
      if (rounding < 0) insertAdjustment.run(
        existing.id, 'ROUNDING', 'رند کردن مبلغ به پایین', null,
        rounding, adjustmentOrder++
      );

      recalculateSettlementStatus(db, Number(listId));
      recalculateInvoiceSendStatus(db, Number(listId));
      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action,
          before_json, after_json, metadata_json
        ) VALUES (?, 'INVOICE', ?, 'UPDATE_INVOICE', ?, ?, ?)
      `).run(
        actorUserId,
        String(existing.id),
        JSON.stringify({
          subtotal_toman: existing.subtotal_toman,
          final_amount_toman: existing.final_amount_toman,
          version: existing.version
        }),
        JSON.stringify({ subtotal_toman: subtotal, final_amount_toman: finalAmount }),
        JSON.stringify({ delivery_list_id: Number(listId), line_count: lines.length })
      );
    })();
    return getInvoice(listId, invoiceId);
  }

  function issueInvoice(listId, payload = {}, actorUserId) {
    const list = getList(listId);
    const lines = normalizeLines(list.id, payload.lines);
    const extras = normalizeExtras(payload.extras);
    const discountBasisPoints = nonNegativeInteger(payload.discount_percent_basis_points, 'درصد تخفیف');
    if (discountBasisPoints > 10000) throw new DeliveryListDraftError('درصد تخفیف نمی‌تواند بیشتر از صد درصد باشد');
    const fixedDiscount = nonNegativeInteger(payload.discount_amount_toman, 'تخفیف ثابت');
    const rounding = Number(payload.rounding_adjustment_toman || 0);
    if (!Number.isInteger(rounding) || rounding > 0) {
      throw new DeliveryListDraftError('مبلغ رند کردن باید صفر یا منفی باشد');
    }

    const subtotal = lines.reduce((sum, line) => sum + line.line_total_toman, 0);
    const extraCharges = extras.reduce((sum, extra) => sum + extra.amount, 0);
    const gross = subtotal + extraCharges;
    const percentDiscount = Math.floor(gross * discountBasisPoints / 10000);
    const totalDiscount = percentDiscount + fixedDiscount;
    if (totalDiscount > gross) throw new DeliveryListDraftError('مجموع تخفیف از مبلغ فاکتور بیشتر است');
    const finalAmount = gross - totalDiscount + rounding;
    if (finalAmount < 0) throw new DeliveryListDraftError('مبلغ نهایی فاکتور نمی‌تواند منفی باشد');
    const issueDate = payload.issued_at ? new Date(payload.issued_at) : new Date();
    if (Number.isNaN(issueDate.getTime())) throw new DeliveryListDraftError('زمان صدور فاکتور نامعتبر است');
    const issuedAt = issueDate.toISOString();

    let invoiceId;
    let number;
    const issue = db.transaction(() => {
      number = nextInvoiceNumber(db, issuedAt);
      const proforma = db.prepare(`
        SELECT id FROM invoices
        WHERE delivery_list_id = ? AND status = 'PROFORMA' AND deleted_at IS NULL
        ORDER BY id DESC LIMIT 1
      `).get(list.id);
      const primary = db.prepare(`
        SELECT id FROM invoices
        WHERE delivery_list_id = ? AND invoice_type = 'PRIMARY'
          AND status = 'ISSUED' AND deleted_at IS NULL
        ORDER BY id LIMIT 1
      `).get(list.id);

      if (proforma) {
        invoiceId = Number(proforma.id);
        db.prepare(`
          UPDATE invoices
          SET invoice_number = ?, status = 'ISSUED', date = ?, price = ?,
              description = ?, notes = ?, subtotal_toman = ?, extra_charges_toman = ?,
              discount_percent_basis_points = ?, discount_amount_toman = ?,
              rounding_adjustment_toman = ?, final_amount_toman = ?,
              issued_at = ?, issued_by_user_id = ?, updated_at = CURRENT_TIMESTAMP,
              version = version + 1
          WHERE id = ?
        `).run(number, invoiceDate(issuedAt), finalAmount,
          `فاکتور اصلی لیست ${list.list_number}`, textOrNull(payload.notes), subtotal,
          extraCharges, discountBasisPoints, totalDiscount, rounding, finalAmount,
          issuedAt, actorUserId, invoiceId);
      } else {
        if (!primary) throw new DeliveryListDraftError('فاکتور اصلی این لیست پیدا نشد', 409);
        const result = db.prepare(`
          INSERT INTO invoices (
            customer_id, date, price, description, notes, delivery_list_id,
            parent_invoice_id, invoice_number, invoice_type, status,
            settlement_status, send_status, subtotal_toman, extra_charges_toman,
            discount_percent_basis_points, discount_amount_toman,
            rounding_adjustment_toman, final_amount_toman, issued_at,
            issued_by_user_id, updated_at, version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUPPLEMENT', 'ISSUED',
            'UNPAID', 'NOT_SENT', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
        `).run(list.customer_id, invoiceDate(issuedAt), finalAmount,
          `فاکتور تکمیلی لیست ${list.list_number}`, textOrNull(payload.notes), list.id,
          primary.id, number, subtotal, extraCharges, discountBasisPoints,
          totalDiscount, rounding, finalAmount, issuedAt, actorUserId);
        invoiceId = Number(result.lastInsertRowid);
      }

      const insertLine = db.prepare(`
        INSERT INTO invoice_lines (
          invoice_id, delivery_list_item_id, return_event_item_id, line_type,
          description, quantity, billing_from_at, billing_to_at, charged_days,
          unit_price_toman, line_total_toman, sort_order
        ) VALUES (?, ?, ?, 'RENTAL', ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      lines.forEach((line, index) => insertLine.run(
        invoiceId, line.delivery_list_item_id, line.return_event_item_id,
        line.description, line.quantity, line.billing_from_at, line.billing_to_at,
        line.charged_days, line.unit_price_toman, line.line_total_toman, index
      ));

      const insertAdjustment = db.prepare(`
        INSERT INTO invoice_adjustments (
          invoice_id, adjustment_type, description, percent_basis_points,
          amount_toman, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      let adjustmentOrder = 0;
      extras.forEach((extra) => insertAdjustment.run(
        invoiceId, extra.type, extra.description, null, extra.amount, adjustmentOrder++
      ));
      if (discountBasisPoints > 0) insertAdjustment.run(
        invoiceId, 'DISCOUNT_PERCENT', 'تخفیف درصدی', discountBasisPoints,
        -percentDiscount, adjustmentOrder++
      );
      if (fixedDiscount > 0) insertAdjustment.run(
        invoiceId, 'DISCOUNT_AMOUNT', 'تخفیف مبلغی', null, -fixedDiscount, adjustmentOrder++
      );
      if (rounding < 0) insertAdjustment.run(
        invoiceId, 'ROUNDING', 'رند کردن مبلغ به پایین', null, rounding, adjustmentOrder++
      );

      const remaining = db.prepare(`
        SELECT COALESCE(SUM(delivery_list_items.delivered_quantity), 0) -
          COALESCE(SUM((SELECT SUM(return_event_items.healthy_quantity
            + return_event_items.damaged_quantity + return_event_items.lost_quantity)
            FROM return_event_items
            WHERE return_event_items.delivery_list_item_id = delivery_list_items.id
              AND return_event_items.deleted_at IS NULL)), 0) AS quantity
        FROM delivery_list_items
        WHERE delivery_list_items.delivery_list_id = ?
          AND delivery_list_items.deleted_at IS NULL
      `).get(list.id);
      const nextStatus = Number(remaining.quantity) > 0 ? 'PARTIALLY_ISSUED' : 'ISSUED';
      db.prepare(`
        UPDATE delivery_lists
        SET invoice_status = ?, updated_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE id = ?
      `).run(nextStatus, list.id);
      recalculateSettlementStatus(db, list.id);
      recalculateInvoiceSendStatus(db, list.id);
      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action, after_json, metadata_json
        ) VALUES (?, 'INVOICE', ?, 'ISSUE_INVOICE', ?, ?)
      `).run(actorUserId, String(invoiceId),
        JSON.stringify({ invoice_number: number, final_amount_toman: finalAmount }),
        JSON.stringify({ delivery_list_id: list.id, line_count: lines.length }));
    });
    issue();

    return db.prepare(`
      SELECT id, parent_invoice_id, invoice_number, invoice_type, status,
             subtotal_toman, extra_charges_toman, discount_percent_basis_points,
             discount_amount_toman, rounding_adjustment_toman, final_amount_toman,
             issued_at
      FROM invoices WHERE id = ?
    `).get(invoiceId);
  }

  return { getPreview, issueInvoice, getInvoice, updateInvoice, updateSendStatus };
}

module.exports = { createDeliveryInvoiceService, recalculateInvoiceSendStatus };
