const { nextDeliveryListNumber } = require('./workflowNumberingService');

class DeliveryListDraftError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'DeliveryListDraftError';
    this.statusCode = statusCode;
  }
}

function nullableText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function nullableId(value) {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new DeliveryListDraftError('شناسه نامعتبر است');
  }
  return id;
}

function serializeDraft(row) {
  return row ? { ...row, night_before: Boolean(row.night_before) } : row;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addCalendarDays(dateText, days) {
  const match = String(dateText || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new DeliveryListDraftError('تاریخ نامعتبر است');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function calculateChargedDays({ deliveredAt, returnedAt, cutoffMinutes = 660, nightBefore = false }) {
  const deliveredTime = Date.parse(deliveredAt);
  const returnedTime = Date.parse(returnedAt);
  if (!Number.isFinite(deliveredTime) || !Number.isFinite(returnedTime)) {
    throw new DeliveryListDraftError('زمان تحویل یا برگشت نامعتبر است');
  }
  if (returnedTime < deliveredTime) {
    throw new DeliveryListDraftError('زمان برگشت نمی‌تواند قبل از زمان تحویل باشد');
  }
  const cutoff = Number(cutoffMinutes);
  if (!Number.isInteger(cutoff) || cutoff < 0 || cutoff > 1439) {
    throw new DeliveryListDraftError('ساعت مرزی محاسبه نامعتبر است');
  }

  const deliveryDate = String(deliveredAt).slice(0, 10);
  const billingStartDate = addCalendarDays(deliveryDate, nightBefore ? 1 : 0);
  const firstBoundaryDate = addCalendarDays(billingStartDate, 1);
  const hours = String(Math.floor(cutoff / 60)).padStart(2, '0');
  const minutes = String(cutoff % 60).padStart(2, '0');
  const firstBoundary = Date.parse(`${firstBoundaryDate}T${hours}:${minutes}:00+03:30`);

  if (returnedTime <= firstBoundary) return 1;
  return 1 + Math.ceil((returnedTime - firstBoundary) / DAY_IN_MS);
}

function createDeliveryListDraftService(db) {
  const draftColumns = `
    SELECT delivery_lists.*,
           COALESCE(customers.name, delivery_lists.customer_name_snapshot) AS customer_name,
           COALESCE(users.display_name, users.username) AS created_by_name,
           COALESCE(delivery_user.display_name, delivery_user.username) AS delivered_by_name
    FROM delivery_lists
    LEFT JOIN customers ON customers.id = delivery_lists.customer_id
    JOIN users ON users.id = delivery_lists.created_by_user_id
    LEFT JOIN users delivery_user ON delivery_user.id = delivery_lists.delivered_by_user_id
  `;

  function getListRow(id) {
    const list = db.prepare(`
      ${draftColumns}
      WHERE delivery_lists.id = ? AND delivery_lists.archived_at IS NULL
    `).get(id);
    if (!list) throw new DeliveryListDraftError('لیست پیدا نشد', 404);
    return list;
  }

  function getDraftRow(id) {
    const draft = getListRow(id);
    if (draft.status !== 'DRAFT') {
      throw new DeliveryListDraftError('این لیست دیگر پیش‌نویس نیست', 409);
    }
    return draft;
  }

  function getList(id) {
    const list = serializeDraft(getListRow(id));
    const items = db.prepare(`
      SELECT delivery_list_items.id, delivery_list_items.delivery_list_id,
             delivery_list_items.product_id, delivery_list_items.product_name_snapshot,
             delivery_list_items.daily_price_toman, delivery_list_items.delivered_quantity,
             delivery_list_items.remaining_expected_return_at,
             delivery_list_items.notes, delivery_list_items.created_at, delivery_list_items.updated_at,
             COALESCE(SUM(return_event_items.healthy_quantity), 0) AS healthy_returned_quantity,
             COALESCE(SUM(return_event_items.damaged_quantity), 0) AS damaged_quantity,
             delivery_list_items.delivered_quantity - COALESCE(SUM(
               return_event_items.healthy_quantity + return_event_items.damaged_quantity
             ), 0) AS remaining_quantity,
             COALESCE(SUM(CASE
               WHEN return_event_items.issue_resolved_at IS NULL
                AND return_event_items.damaged_quantity > 0
               THEN return_event_items.damaged_quantity
               ELSE 0 END), 0) AS unresolved_issue_quantity
      FROM delivery_list_items
      LEFT JOIN return_event_items
        ON return_event_items.delivery_list_item_id = delivery_list_items.id
       AND return_event_items.deleted_at IS NULL
      WHERE delivery_list_items.delivery_list_id = ? AND delivery_list_items.deleted_at IS NULL
      GROUP BY delivery_list_items.id
      ORDER BY delivery_list_items.id
    `).all(id).map((item) => ({
      ...item,
      item_status: item.unresolved_issue_quantity > 0
        ? 'DAMAGE'
        : item.remaining_quantity === item.delivered_quantity
          ? 'DELIVERED'
          : item.remaining_quantity > 0
            ? 'REMAINING'
            : 'RETURNED'
    }));
    const returnRows = db.prepare(`
      SELECT return_events.id AS return_event_id, return_events.returned_at,
             return_events.notes AS event_notes, return_events.created_at,
             COALESCE(users.display_name, users.username) AS received_by_name,
             return_event_items.id AS return_item_id,
             return_event_items.delivery_list_item_id,
             delivery_list_items.product_name_snapshot,
             return_event_items.healthy_quantity,
             return_event_items.damaged_quantity,
             return_event_items.system_calculated_days,
             return_event_items.final_charged_days,
             return_event_items.day_override_reason,
             return_event_items.damage_notes,
             return_event_items.issue_resolved_at,
             (SELECT invoice_lines.invoice_id
                FROM invoice_lines
               WHERE invoice_lines.return_event_item_id = return_event_items.id
                 AND invoice_lines.line_type = 'RENTAL'
                 AND invoice_lines.deleted_at IS NULL
               LIMIT 1) AS rental_invoice_id
      FROM return_events
      JOIN users ON users.id = return_events.received_by_user_id
      JOIN return_event_items
        ON return_event_items.return_event_id = return_events.id
       AND return_event_items.deleted_at IS NULL
      JOIN delivery_list_items ON delivery_list_items.id = return_event_items.delivery_list_item_id
      WHERE return_events.delivery_list_id = ? AND return_events.deleted_at IS NULL
      ORDER BY return_events.returned_at DESC, return_events.id DESC, return_event_items.id
    `).all(id);
    const returnEventsById = new Map();
    returnRows.forEach((row) => {
      if (!returnEventsById.has(row.return_event_id)) {
        returnEventsById.set(row.return_event_id, {
          id: row.return_event_id,
          returned_at: row.returned_at,
          notes: row.event_notes,
          created_at: row.created_at,
          received_by_name: row.received_by_name,
          items: []
        });
      }
      returnEventsById.get(row.return_event_id).items.push({
        id: row.return_item_id,
        delivery_list_item_id: row.delivery_list_item_id,
        product_name_snapshot: row.product_name_snapshot,
        healthy_quantity: row.healthy_quantity,
        damaged_quantity: row.damaged_quantity,
        system_calculated_days: row.system_calculated_days,
        final_charged_days: row.final_charged_days,
        day_override_reason: row.day_override_reason,
        damage_notes: row.damage_notes,
        issue_resolved_at: row.issue_resolved_at,
        rental_invoice_id: row.rental_invoice_id
      });
    });
    const proforma = db.prepare(`
      SELECT id, invoice_number, invoice_type, status, settlement_status,
             send_status, subtotal_toman, final_amount_toman, created_at, updated_at
      FROM invoices
      WHERE delivery_list_id = ? AND status = 'PROFORMA' AND deleted_at IS NULL
      ORDER BY id DESC LIMIT 1
    `).get(id) || null;
    const invoices = db.prepare(`
      SELECT invoices.id, invoices.parent_invoice_id, invoices.invoice_number,
             invoices.invoice_type, invoices.status, invoices.settlement_status,
             invoices.send_status, invoices.subtotal_toman, invoices.extra_charges_toman,
             invoices.discount_percent_basis_points, invoices.discount_amount_toman,
             invoices.rounding_adjustment_toman, invoices.final_amount_toman,
             invoices.issued_at, invoices.created_at,
             COALESCE(users.display_name, users.username) AS issued_by_name,
             (SELECT invoice_send_logs.sent_at
                FROM invoice_send_logs
               WHERE invoice_send_logs.invoice_id = invoices.id
                 AND invoice_send_logs.status = 'SENT'
               ORDER BY invoice_send_logs.sent_at DESC, invoice_send_logs.id DESC
               LIMIT 1) AS last_sent_at,
             (SELECT COALESCE(send_user.display_name, send_user.username)
                FROM invoice_send_logs
                JOIN users send_user ON send_user.id = invoice_send_logs.sent_by_user_id
               WHERE invoice_send_logs.invoice_id = invoices.id
                 AND invoice_send_logs.status = 'SENT'
               ORDER BY invoice_send_logs.sent_at DESC, invoice_send_logs.id DESC
               LIMIT 1) AS last_sent_by_name
      FROM invoices
      LEFT JOIN users ON users.id = invoices.issued_by_user_id
      WHERE invoices.delivery_list_id = ? AND invoices.status = 'ISSUED'
        AND invoices.deleted_at IS NULL
      ORDER BY invoices.issued_at, invoices.id
    `).all(id);
    const lineStatement = db.prepare(`
      SELECT id, line_type, description, quantity, billing_from_at, billing_to_at,
             charged_days, unit_price_toman, line_total_toman
      FROM invoice_lines
      WHERE invoice_id = ? AND deleted_at IS NULL
      ORDER BY sort_order, id
    `);
    invoices.forEach((invoice) => { invoice.lines = lineStatement.all(invoice.id); });
    return { ...list, items, proforma, invoices, return_events: [...returnEventsById.values()] };
  }

  function getDraft(id) {
    getDraftRow(id);
    return getList(id);
  }

  function listDrafts() {
    return db.prepare(`
      SELECT delivery_lists.*,
             COALESCE(customers.name, delivery_lists.customer_name_snapshot) AS customer_name,
             COALESCE(users.display_name, users.username) AS created_by_name,
             COUNT(delivery_list_items.id) AS item_count,
             COALESCE(SUM(
               delivery_list_items.daily_price_toman * delivery_list_items.delivered_quantity
             ), 0) AS daily_total_toman
      FROM delivery_lists
      LEFT JOIN customers ON customers.id = delivery_lists.customer_id
      JOIN users ON users.id = delivery_lists.created_by_user_id
      LEFT JOIN delivery_list_items
        ON delivery_list_items.delivery_list_id = delivery_lists.id
       AND delivery_list_items.deleted_at IS NULL
      WHERE delivery_lists.status = 'DRAFT' AND delivery_lists.archived_at IS NULL
      GROUP BY delivery_lists.id
      ORDER BY delivery_lists.updated_at DESC, delivery_lists.id DESC
    `).all().map(serializeDraft);
  }

  function listDeliveryLists() {
    return db.prepare(`
      SELECT delivery_lists.*,
             COALESCE(customers.name, delivery_lists.customer_name_snapshot) AS customer_name,
             COALESCE(users.display_name, users.username) AS created_by_name,
             COALESCE(delivery_user.display_name, delivery_user.username) AS delivered_by_name,
             (SELECT COUNT(*)
                FROM delivery_list_items
               WHERE delivery_list_items.delivery_list_id = delivery_lists.id
                 AND delivery_list_items.deleted_at IS NULL) AS item_count,
             COALESCE((SELECT SUM(
                delivery_list_items.daily_price_toman * delivery_list_items.delivered_quantity
               ) FROM delivery_list_items
               WHERE delivery_list_items.delivery_list_id = delivery_lists.id
                 AND delivery_list_items.deleted_at IS NULL), 0) AS daily_total_toman,
             (SELECT invoices.id
                FROM invoices
               WHERE invoices.delivery_list_id = delivery_lists.id
                 AND invoices.status = 'PROFORMA'
                 AND invoices.deleted_at IS NULL
               ORDER BY invoices.id DESC LIMIT 1) AS proforma_invoice_id
             ,COALESCE((SELECT SUM(invoices.final_amount_toman)
                FROM invoices
               WHERE invoices.delivery_list_id = delivery_lists.id
                 AND invoices.status = 'ISSUED'
                 AND invoices.deleted_at IS NULL), 0) AS invoice_total_toman
             ,(SELECT COUNT(*)
                FROM invoices
               WHERE invoices.delivery_list_id = delivery_lists.id
                 AND invoices.status = 'ISSUED'
                 AND invoices.deleted_at IS NULL) AS issued_invoice_count
             ,(SELECT MAX(return_events.returned_at)
                FROM return_events
               WHERE return_events.delivery_list_id = delivery_lists.id
                 AND return_events.deleted_at IS NULL) AS last_returned_at
      FROM delivery_lists
      LEFT JOIN customers ON customers.id = delivery_lists.customer_id
      JOIN users ON users.id = delivery_lists.created_by_user_id
      LEFT JOIN users delivery_user ON delivery_user.id = delivery_lists.delivered_by_user_id
      WHERE delivery_lists.archived_at IS NULL
      ORDER BY COALESCE(delivery_lists.delivered_at, delivery_lists.updated_at) DESC,
               delivery_lists.id DESC
    `).all().map(serializeDraft);
  }

  function createDraft(userId) {
    const settings = db.prepare(`
      SELECT billing_cutoff_minutes FROM app_settings WHERE id = 1
    `).get();
    const result = db.prepare(`
      INSERT INTO delivery_lists (
        status, billing_cutoff_minutes_snapshot, created_by_user_id,
        last_autosaved_at, created_at, updated_at
      ) VALUES ('DRAFT', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(Number(settings?.billing_cutoff_minutes) || 660, userId);
    return getDraft(result.lastInsertRowid);
  }

  function resolveCustomer(customerId, customerName) {
    if (!customerId) return { customerId: null, customerName };
    const customer = db.prepare(`
      SELECT id, name
      FROM customers
      WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
    `).get(customerId);
    if (!customer) throw new DeliveryListDraftError('مشتری انتخاب‌شده پیدا نشد', 404);
    return { customerId: customer.id, customerName: customer.name };
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) {
      throw new DeliveryListDraftError('اقلام پیش‌نویس نامعتبر هستند');
    }
    const productIds = new Set();
    const itemIds = new Set();
    return items.map((item) => {
      const itemId = nullableId(item.id);
      if (itemId && itemIds.has(itemId)) {
        throw new DeliveryListDraftError('شناسه قلم تکراری است');
      }
      if (itemId) itemIds.add(itemId);
      const productId = nullableId(item.product_id);
      if (!productId) throw new DeliveryListDraftError('انتخاب محصول برای هر ردیف الزامی است');
      if (productIds.has(productId)) {
        throw new DeliveryListDraftError('هر محصول فقط یک بار می‌تواند در لیست باشد');
      }
      productIds.add(productId);

      const product = db.prepare(`
        SELECT id, name, daily_price_toman
        FROM products
        WHERE id = ? AND deleted_at IS NULL
      `).get(productId);
      if (!product) throw new DeliveryListDraftError('یکی از محصولات پیدا نشد', 404);

      const quantity = Number(item.delivered_quantity);
      const dailyPrice = item.daily_price_toman === null || item.daily_price_toman === undefined
        ? Number(product.daily_price_toman)
        : Number(item.daily_price_toman);
      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new DeliveryListDraftError('تعداد هر محصول باید حداقل یک باشد');
      }
      if (!Number.isInteger(dailyPrice) || dailyPrice < 0) {
        throw new DeliveryListDraftError('قیمت روزانه محصول نامعتبر است');
      }
      return {
        itemId,
        productId: product.id,
        productName: product.name,
        dailyPrice,
        quantity,
        remainingExpectedReturnAt: nullableText(item.remaining_expected_return_at),
        notes: nullableText(item.notes)
      };
    });
  }

  function saveDraft(id, payload = {}, actorUserId = null) {
    const draft = getListRow(id);
    const expectedVersion = payload.version === null || payload.version === undefined
      ? Number(draft.version)
      : Number(payload.version);
    if (!Number.isInteger(expectedVersion) || expectedVersion !== Number(draft.version)) {
      throw new DeliveryListDraftError('این لیست در جای دیگری تغییر کرده است؛ صفحه را دوباره بارگذاری کنید', 409);
    }

    const customerId = nullableId(payload.customer_id);
    const customerName = nullableText(payload.customer_name_snapshot);
    const customer = resolveCustomer(customerId, customerName);
    if (draft.status !== 'DRAFT' && !customer.customerId) {
      throw new DeliveryListDraftError('لیست ثبت‌شده باید مشتری معتبر داشته باشد');
    }
    const items = normalizeItems(payload.items || []);
    const deliveredAt = nullableText(payload.delivered_at);
    const expectedReturnAt = nullableText(payload.expected_return_at);
    const nightBefore = payload.night_before ? 1 : 0;
    const notes = nullableText(payload.notes);

    const save = db.transaction(() => {
      const update = db.prepare(`
        UPDATE delivery_lists
        SET customer_id = ?, customer_name_snapshot = ?, delivered_at = ?,
            expected_return_at = ?, night_before = ?, notes = ?,
            last_autosaved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = ? AND archived_at IS NULL AND version = ?
      `).run(
        customer.customerId,
        customer.customerName,
        deliveredAt,
        expectedReturnAt,
        nightBefore,
        notes,
        id,
        expectedVersion
      );
      if (update.changes !== 1) {
        throw new DeliveryListDraftError('ذخیره هم‌زمان انجام نشد؛ صفحه را دوباره بارگذاری کنید', 409);
      }

      const existingItems = db.prepare(`
        SELECT id, product_id
        FROM delivery_list_items
        WHERE delivery_list_id = ? AND deleted_at IS NULL
      `).all(id);
      const existingIds = new Set(existingItems.map((item) => Number(item.id)));
      const existingIdByProductId = new Map(existingItems.map((item) => [
        Number(item.product_id),
        Number(item.id)
      ]));
      const retainedIds = new Set();
      const updateItem = db.prepare(`
        UPDATE delivery_list_items
        SET product_id = ?, product_name_snapshot = ?, daily_price_toman = ?,
            delivered_quantity = ?, remaining_expected_return_at = ?, notes = ?, deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND delivery_list_id = ?
      `);
      const insertItem = db.prepare(`
        INSERT INTO delivery_list_items (
          delivery_list_id, product_id, product_name_snapshot,
          daily_price_toman, delivered_quantity, remaining_expected_return_at,
          notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      items.forEach((item) => {
        // A newly-added row may be autosaved again before the client has received
        // its database id. Reuse the active row with the same product instead of
        // trying to insert it twice and violating the active-product unique index.
        const existingItemId = item.itemId || existingIdByProductId.get(item.productId);
        if (existingItemId) {
          if (!existingIds.has(existingItemId)) {
            throw new DeliveryListDraftError('یکی از اقلام این لیست معتبر نیست', 409);
          }
          const returned = db.prepare(`
            SELECT COALESCE(SUM(healthy_quantity + damaged_quantity), 0) AS quantity
            FROM return_event_items
            WHERE delivery_list_item_id = ? AND deleted_at IS NULL
          `).get(existingItemId);
          if (item.quantity < Number(returned.quantity || 0)) {
            throw new DeliveryListDraftError(`تعداد «${item.productName}» نمی‌تواند کمتر از تعداد برگشت‌خورده باشد`);
          }
          updateItem.run(
            item.productId, item.productName, item.dailyPrice,
            item.quantity, item.remainingExpectedReturnAt, item.notes, existingItemId, id
          );
          retainedIds.add(existingItemId);
        } else {
          const result = insertItem.run(
            id, item.productId, item.productName,
            item.dailyPrice, item.quantity, item.remainingExpectedReturnAt, item.notes
          );
          retainedIds.add(Number(result.lastInsertRowid));
        }
      });

      existingItems.forEach((item) => {
        if (retainedIds.has(Number(item.id))) return;
        db.prepare(`
          UPDATE delivery_list_items
          SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND delivery_list_id = ? AND deleted_at IS NULL
        `).run(item.id, id);
      });

      if (draft.status !== 'DRAFT') {
        const state = db.prepare(`
          SELECT
            (SELECT COALESCE(SUM(delivered_quantity), 0)
               FROM delivery_list_items
              WHERE delivery_list_id = ? AND deleted_at IS NULL) AS total_delivered,
            (SELECT COALESCE(SUM(
               return_event_items.healthy_quantity + return_event_items.damaged_quantity
             ), 0)
               FROM return_event_items
               JOIN delivery_list_items ON delivery_list_items.id = return_event_items.delivery_list_item_id
              WHERE delivery_list_items.delivery_list_id = ?
                AND delivery_list_items.deleted_at IS NULL
                AND return_event_items.deleted_at IS NULL) AS total_returned,
            (SELECT COALESCE(SUM(
               return_event_items.damaged_quantity
             ), 0)
               FROM return_event_items
               JOIN delivery_list_items ON delivery_list_items.id = return_event_items.delivery_list_item_id
              WHERE delivery_list_items.delivery_list_id = ?
                AND delivery_list_items.deleted_at IS NULL
                AND return_event_items.deleted_at IS NULL
                AND return_event_items.issue_resolved_at IS NULL) AS unresolved_issues
        `).get(id, id, id);
        const nextStatus = Number(state.unresolved_issues) > 0
          ? 'NEEDS_FOLLOW_UP'
          : Number(state.total_returned) === 0
            ? 'DELIVERED'
            : Number(state.total_returned) < Number(state.total_delivered)
              ? 'REMAINING'
              : 'COMPLETED';
        db.prepare(`
          UPDATE delivery_lists
          SET status = ?,
              completed_at = CASE
                WHEN ? = 'COMPLETED' THEN COALESCE(completed_at, CURRENT_TIMESTAMP)
                ELSE NULL
              END,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(nextStatus, nextStatus, id);
      }

      if (draft.status !== 'DRAFT') {
        db.prepare(`
          INSERT INTO audit_logs (
            actor_user_id, entity_type, entity_id, action,
            before_json, after_json, metadata_json
          ) VALUES (?, 'DELIVERY_LIST', ?, 'UPDATE_DELIVERY_LIST', ?, ?, ?)
        `).run(
          actorUserId,
          String(id),
          JSON.stringify({ version: Number(draft.version), status: draft.status }),
          JSON.stringify({ version: expectedVersion + 1, customer_id: customer.customerId }),
          JSON.stringify({ item_count: items.length, edited_after_finalize: true })
        );
      }
    });

    save();
    return getList(id);
  }

  function deleteDraft(id) {
    getDraftRow(id);
    const result = db.prepare(`
      DELETE FROM delivery_lists
      WHERE id = ? AND status = 'DRAFT'
    `).run(id);
    if (result.changes !== 1) throw new DeliveryListDraftError('حذف پیش‌نویس انجام نشد', 409);
    return { id: Number(id), deleted: true };
  }

  function archiveList(id, actorUserId) {
    const list = getListRow(id);
    const archive = db.transaction(() => {
      const result = db.prepare(`
        UPDATE delivery_lists
        SET archived_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP,
            version = version + 1
        WHERE id = ? AND archived_at IS NULL
      `).run(id);
      if (result.changes !== 1) {
        throw new DeliveryListDraftError('حذف لیست انجام نشد', 409);
      }

      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action, before_json, after_json
        ) VALUES (?, 'DELIVERY_LIST', ?, 'ARCHIVE_DELIVERY_LIST', ?, ?)
      `).run(
        actorUserId,
        String(id),
        JSON.stringify({
          status: list.status,
          list_number: list.list_number,
          customer_name: list.customer_name
        }),
        JSON.stringify({ archived: true })
      );
    });

    archive();
    return { id: Number(id), deleted: true, archived: true };
  }

  function finalizeDraft(id, expectedVersion, actorUserId) {
    const draft = getDraftRow(id);
    const version = Number(expectedVersion);
    if (!Number.isInteger(version) || version !== Number(draft.version)) {
      throw new DeliveryListDraftError('نسخه پیش‌نویس تغییر کرده است؛ ابتدا صفحه را دوباره بارگذاری کنید', 409);
    }
    if (!draft.customer_id) {
      throw new DeliveryListDraftError('برای ثبت تحویل، مشتری را از فهرست انتخاب کنید');
    }
    if (!draft.delivered_at) {
      throw new DeliveryListDraftError('تاریخ و ساعت تحویل الزامی است');
    }
    if (!draft.expected_return_at) {
      throw new DeliveryListDraftError('تاریخ و ساعت تقریبی برگشت الزامی است');
    }
    const deliveredTime = Date.parse(draft.delivered_at);
    const expectedReturnTime = Date.parse(draft.expected_return_at);
    if (!Number.isFinite(deliveredTime) || !Number.isFinite(expectedReturnTime)) {
      throw new DeliveryListDraftError('تاریخ تحویل یا برگشت نامعتبر است');
    }
    if (expectedReturnTime < deliveredTime) {
      throw new DeliveryListDraftError('زمان تقریبی برگشت نمی‌تواند قبل از زمان تحویل باشد');
    }

    const items = db.prepare(`
      SELECT id, daily_price_toman, delivered_quantity
      FROM delivery_list_items
      WHERE delivery_list_id = ? AND deleted_at IS NULL
      ORDER BY id
    `).all(id);
    if (!items.length) {
      throw new DeliveryListDraftError('حداقل یک محصول باید در لیست وجود داشته باشد');
    }

    const customer = db.prepare(`
      SELECT id, name FROM customers
      WHERE id = ? AND is_active = 1 AND deleted_at IS NULL
    `).get(draft.customer_id);
    if (!customer) throw new DeliveryListDraftError('مشتری انتخاب‌شده فعال نیست', 409);

    const deliveryDate = String(draft.delivered_at).slice(0, 10);
    const dailyRateTotal = items.reduce((sum, item) => (
      sum + Number(item.daily_price_toman) * Number(item.delivered_quantity)
    ), 0);

    const finalize = db.transaction(() => {
      // Generate the number only after acquiring the write transaction. This
      // prevents two app processes from choosing the same next number.
      const listNumber = nextDeliveryListNumber(db, draft.delivered_at);
      const update = db.prepare(`
        UPDATE delivery_lists
        SET list_number = ?, customer_name_snapshot = ?, status = 'DELIVERED',
            invoice_status = 'PROFORMA', delivered_by_user_id = ?,
            updated_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE id = ? AND status = 'DRAFT' AND archived_at IS NULL AND version = ?
      `).run(listNumber, customer.name, actorUserId, id, version);
      if (update.changes !== 1) {
        throw new DeliveryListDraftError('ثبت تحویل هم‌زمان انجام نشد؛ صفحه را دوباره بارگذاری کنید', 409);
      }

      const invoiceResult = db.prepare(`
        INSERT INTO invoices (
          customer_id, date, price, description, notes,
          delivery_list_id, invoice_type, status, settlement_status, send_status,
          subtotal_toman, extra_charges_toman, discount_percent_basis_points,
          discount_amount_toman, rounding_adjustment_toman, final_amount_toman,
          issued_at, issued_by_user_id, updated_at, version
        ) VALUES (
          ?, ?, 0, ?, ?,
          ?, 'PRIMARY', 'PROFORMA', 'UNPAID', 'NOT_SENT',
          0, 0, 0, 0, 0, 0,
          NULL, NULL, CURRENT_TIMESTAMP, 1
        )
      `).run(
        customer.id,
        deliveryDate,
        `پیش‌فاکتور خودکار لیست ${listNumber}`,
        draft.notes || null,
        id
      );

      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action, after_json, metadata_json
        ) VALUES (?, 'DELIVERY_LIST', ?, 'FINALIZE_DELIVERY', ?, ?)
      `).run(
        actorUserId,
        String(id),
        JSON.stringify({ status: 'DELIVERED', list_number: listNumber }),
        JSON.stringify({ invoice_id: Number(invoiceResult.lastInsertRowid), daily_rate_total_toman: dailyRateTotal })
      );
    });

    finalize.immediate();
    return getList(id);
  }

  function recordReturn(id, payload = {}, actorUserId) {
    const list = getListRow(id);
    if (!['DELIVERED', 'REMAINING', 'NEEDS_FOLLOW_UP'].includes(list.status)) {
      throw new DeliveryListDraftError('برای این لیست امکان ثبت مرجوعی وجود ندارد', 409);
    }
    const returnedAt = nullableText(payload.returned_at);
    if (!returnedAt) throw new DeliveryListDraftError('تاریخ و ساعت برگشت الزامی است');
    const systemDays = calculateChargedDays({
      deliveredAt: list.delivered_at,
      returnedAt,
      cutoffMinutes: list.billing_cutoff_minutes_snapshot,
      nightBefore: Boolean(list.night_before)
    });
    if (!Array.isArray(payload.items) || !payload.items.length) {
      throw new DeliveryListDraftError('حداقل یک قلم برگشتی را مشخص کنید');
    }

    const seenItemIds = new Set();
    const normalizedItems = payload.items.map((item) => {
      const itemId = nullableId(item.delivery_list_item_id);
      if (!itemId || seenItemIds.has(itemId)) {
        throw new DeliveryListDraftError('اقلام برگشتی تکراری یا نامعتبر هستند');
      }
      seenItemIds.add(itemId);
      const listItem = db.prepare(`
        SELECT delivery_list_items.id, delivery_list_items.delivered_quantity,
               delivery_list_items.product_name_snapshot,
               delivery_list_items.delivered_quantity - COALESCE(SUM(
                 return_event_items.healthy_quantity + return_event_items.damaged_quantity
               ), 0) AS remaining_quantity
        FROM delivery_list_items
        LEFT JOIN return_event_items
          ON return_event_items.delivery_list_item_id = delivery_list_items.id
         AND return_event_items.deleted_at IS NULL
        WHERE delivery_list_items.id = ? AND delivery_list_items.delivery_list_id = ?
          AND delivery_list_items.deleted_at IS NULL
        GROUP BY delivery_list_items.id
      `).get(itemId, id);
      if (!listItem) throw new DeliveryListDraftError('یکی از اقلام متعلق به این لیست نیست', 404);

      const healthy = Number(item.healthy_quantity) || 0;
      const damaged = Number(item.damaged_quantity) || 0;
      if (![healthy, damaged].every((value) => Number.isInteger(value) && value >= 0)) {
        throw new DeliveryListDraftError('تعداد مرجوعی نامعتبر است');
      }
      const total = healthy + damaged;
      if (total < 1) throw new DeliveryListDraftError('تعداد برگشتی هر ردیف باید بیشتر از صفر باشد');
      if (total > Number(listItem.remaining_quantity)) {
        throw new DeliveryListDraftError(`تعداد برگشتی «${listItem.product_name_snapshot}» از مانده بیشتر است`);
      }
      const damageNotes = nullableText(item.damage_notes);
      if (damaged > 0 && !damageNotes) {
        throw new DeliveryListDraftError('برای خسارت توضیحات الزامی است');
      }
      const finalDays = item.final_charged_days === null || item.final_charged_days === undefined
        ? systemDays
        : Number(item.final_charged_days);
      if (!Number.isInteger(finalDays) || finalDays < 1) {
        throw new DeliveryListDraftError('تعداد روز نهایی باید حداقل یک باشد');
      }
      const overrideReason = nullableText(item.day_override_reason);
      if (finalDays !== systemDays && !overrideReason) {
        throw new DeliveryListDraftError('برای تغییر دستی تعداد روز، دلیل را وارد کنید');
      }
      const remainingAfterReturn = Number(listItem.remaining_quantity) - total;
      const remainingExpectedReturnAt = nullableText(item.remaining_expected_return_at);
      if (remainingAfterReturn > 0 && !remainingExpectedReturnAt) {
        throw new DeliveryListDraftError(`تاریخ پیگیری مانده «${listItem.product_name_snapshot}» الزامی است`);
      }
      if (remainingExpectedReturnAt) {
        const followUpTime = Date.parse(remainingExpectedReturnAt);
        if (!Number.isFinite(followUpTime) || followUpTime < Date.parse(returnedAt)) {
          throw new DeliveryListDraftError(`تاریخ پیگیری مانده «${listItem.product_name_snapshot}» نامعتبر است`);
        }
      }
      return {
        itemId,
        healthy,
        damaged,
        finalDays,
        overrideReason,
        damageNotes,
        remainingExpectedReturnAt: remainingAfterReturn > 0 ? remainingExpectedReturnAt : null
      };
    });

    const saveReturn = db.transaction(() => {
      const eventResult = db.prepare(`
        INSERT INTO return_events (
          delivery_list_id, returned_at, received_by_user_id, notes,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(id, returnedAt, actorUserId, nullableText(payload.notes));
      const insertItem = db.prepare(`
        INSERT INTO return_event_items (
          return_event_id, delivery_list_item_id,
          healthy_quantity, damaged_quantity,
          system_calculated_days, final_charged_days,
          day_override_reason, damage_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      normalizedItems.forEach((item) => {
        insertItem.run(
          eventResult.lastInsertRowid,
          item.itemId,
          item.healthy,
          item.damaged,
          systemDays,
          item.finalDays,
          item.overrideReason,
          item.damageNotes
        );
        db.prepare(`
          UPDATE delivery_list_items
          SET remaining_expected_return_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND delivery_list_id = ? AND deleted_at IS NULL
        `).run(item.remainingExpectedReturnAt, item.itemId, id);
      });

      const state = db.prepare(`
        SELECT
          (SELECT COALESCE(SUM(delivered_quantity), 0)
             FROM delivery_list_items
            WHERE delivery_list_id = ? AND deleted_at IS NULL) AS total_delivered,
          (SELECT COALESCE(SUM(
             return_event_items.healthy_quantity + return_event_items.damaged_quantity
           ), 0)
             FROM return_event_items
             JOIN delivery_list_items ON delivery_list_items.id = return_event_items.delivery_list_item_id
            WHERE delivery_list_items.delivery_list_id = ?
              AND delivery_list_items.deleted_at IS NULL
              AND return_event_items.deleted_at IS NULL) AS total_returned,
          (SELECT COALESCE(SUM(
             return_event_items.damaged_quantity
           ), 0)
             FROM return_event_items
             JOIN delivery_list_items ON delivery_list_items.id = return_event_items.delivery_list_item_id
            WHERE delivery_list_items.delivery_list_id = ?
              AND delivery_list_items.deleted_at IS NULL
              AND return_event_items.deleted_at IS NULL
              AND return_event_items.issue_resolved_at IS NULL) AS unresolved_issues
      `).get(id, id, id);
      const nextStatus = Number(state.unresolved_issues) > 0
        ? 'NEEDS_FOLLOW_UP'
        : Number(state.total_returned) < Number(state.total_delivered)
          ? 'REMAINING'
          : 'COMPLETED';
      db.prepare(`
        UPDATE delivery_lists
        SET status = ?, completed_at = CASE WHEN ? = 'COMPLETED' THEN ? ELSE NULL END,
            updated_at = CURRENT_TIMESTAMP, version = version + 1
        WHERE id = ?
      `).run(nextStatus, nextStatus, nextStatus === 'COMPLETED' ? returnedAt : null, id);
      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action, after_json, metadata_json
        ) VALUES (?, 'DELIVERY_LIST', ?, 'RECORD_RETURN', ?, ?)
      `).run(
        actorUserId,
        String(id),
        JSON.stringify({ status: nextStatus, returned_at: returnedAt }),
        JSON.stringify({ return_event_id: Number(eventResult.lastInsertRowid), system_calculated_days: systemDays })
      );
    });

    saveReturn();
    return getList(id);
  }

  return {
    listDrafts,
    listDeliveryLists,
    getList,
    getDraft,
    createDraft,
    saveDraft,
    deleteDraft,
    archiveList,
    finalizeDraft,
    recordReturn
  };
}

module.exports = {
  DeliveryListDraftError,
  createDeliveryListDraftService,
  calculateChargedDays
};
