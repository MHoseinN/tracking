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
      SELECT id, delivery_list_id, product_id, product_name_snapshot,
             daily_price_toman, delivered_quantity, notes, created_at, updated_at
      FROM delivery_list_items
      WHERE delivery_list_id = ? AND deleted_at IS NULL
      ORDER BY id
    `).all(id);
    const proforma = db.prepare(`
      SELECT id, invoice_number, invoice_type, status, settlement_status,
             send_status, subtotal_toman, final_amount_toman, created_at, updated_at
      FROM invoices
      WHERE delivery_list_id = ? AND status = 'PROFORMA' AND deleted_at IS NULL
      ORDER BY id DESC LIMIT 1
    `).get(id) || null;
    return { ...list, items, proforma };
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
    return items.map((item) => {
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
        productId: product.id,
        productName: product.name,
        dailyPrice,
        quantity,
        notes: nullableText(item.notes)
      };
    });
  }

  function saveDraft(id, payload = {}) {
    const draft = getDraftRow(id);
    const expectedVersion = payload.version === null || payload.version === undefined
      ? Number(draft.version)
      : Number(payload.version);
    if (!Number.isInteger(expectedVersion) || expectedVersion !== Number(draft.version)) {
      throw new DeliveryListDraftError('این پیش‌نویس در جای دیگری تغییر کرده است؛ صفحه را دوباره بارگذاری کنید', 409);
    }

    const customerId = nullableId(payload.customer_id);
    const customerName = nullableText(payload.customer_name_snapshot);
    const customer = resolveCustomer(customerId, customerName);
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
        WHERE id = ? AND status = 'DRAFT' AND archived_at IS NULL AND version = ?
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

      db.prepare('DELETE FROM delivery_list_items WHERE delivery_list_id = ?').run(id);
      const insertItem = db.prepare(`
        INSERT INTO delivery_list_items (
          delivery_list_id, product_id, product_name_snapshot,
          daily_price_toman, delivered_quantity, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      items.forEach((item) => {
        insertItem.run(
          id,
          item.productId,
          item.productName,
          item.dailyPrice,
          item.quantity,
          item.notes
        );
      });
    });

    save();
    return getDraft(id);
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

    const settings = db.prepare(`
      SELECT list_number_prefix FROM app_settings WHERE id = 1
    `).get();
    const prefix = String(settings?.list_number_prefix || 'LST').trim() || 'LST';
    const listNumber = `${prefix}-${String(id).padStart(6, '0')}`;
    const deliveryDate = String(draft.delivered_at).slice(0, 10);
    const dailyRateTotal = items.reduce((sum, item) => (
      sum + Number(item.daily_price_toman) * Number(item.delivered_quantity)
    ), 0);

    const finalize = db.transaction(() => {
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

    finalize();
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
    finalizeDraft
  };
}

module.exports = {
  DeliveryListDraftError,
  createDeliveryListDraftService
};
