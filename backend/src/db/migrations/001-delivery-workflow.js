const { ensureColumn, tableExists } = require('./helpers');

const migration = {
  id: '20260823_001_delivery_workflow',
  up(db) {
    migrateUsers(db);
    migrateCustomers(db);
    createSettings(db);
    createProductCatalog(db);
    migrateLegacyProducts(db);
    createDeliveryWorkflow(db);
    extendInvoices(db);
    createInvoiceDetails(db);
    createAuditLog(db);
  }
};

function migrateUsers(db) {
  ensureColumn(db, 'users', 'display_name', 'TEXT');
  ensureColumn(
    db,
    'users',
    'role',
    "TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('MANAGER', 'ADMIN'))"
  );
  ensureColumn(
    db,
    'users',
    'is_active',
    'INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))'
  );
  ensureColumn(db, 'users', 'updated_at', 'TEXT');
  ensureColumn(db, 'users', 'deleted_at', 'TEXT');

  db.exec(`
    UPDATE users
    SET display_name = COALESCE(NULLIF(TRIM(display_name), ''), username),
        updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP),
        role = CASE WHEN role IN ('MANAGER', 'ADMIN') THEN role ELSE 'ADMIN' END;

    UPDATE users
    SET role = 'ADMIN'
    WHERE role = 'MANAGER'
      AND id <> (SELECT MIN(id) FROM users WHERE role = 'MANAGER');

    UPDATE users
    SET role = 'MANAGER'
    WHERE id = (SELECT MIN(id) FROM users)
      AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'MANAGER');

    CREATE UNIQUE INDEX IF NOT EXISTS ux_users_one_active_manager
      ON users(role)
      WHERE role = 'MANAGER' AND is_active = 1 AND deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS ix_users_active_role
      ON users(is_active, role, id);
  `);
}

function migrateCustomers(db) {
  ensureColumn(
    db,
    'customers',
    'is_active',
    'INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))'
  );
  ensureColumn(db, 'customers', 'updated_at', 'TEXT');
  ensureColumn(db, 'customers', 'deleted_at', 'TEXT');

  db.exec(`
    UPDATE customers
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP);

    CREATE INDEX IF NOT EXISTS ix_customers_active_name
      ON customers(is_active, name, id);
  `);
}

function createSettings(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      collection_name TEXT NOT NULL DEFAULT 'مجموعه من',
      timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
      billing_cutoff_minutes INTEGER NOT NULL DEFAULT 660
        CHECK (billing_cutoff_minutes BETWEEN 0 AND 1439),
      list_number_prefix TEXT NOT NULL DEFAULT 'LST',
      invoice_number_prefix TEXT NOT NULL DEFAULT 'INV',
      updated_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    INSERT OR IGNORE INTO app_settings (id) VALUES (1);
  `);
}

function createProductCatalog(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      parent_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS ix_product_categories_parent_slug
      ON product_categories(parent_id, slug, id);

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      daily_price_toman INTEGER NOT NULL DEFAULT 0 CHECK (daily_price_toman >= 0),
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS ix_products_active_category_name
      ON products(is_active, category_id, name);

    CREATE TABLE IF NOT EXISTS product_price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      daily_price_toman INTEGER NOT NULL CHECK (daily_price_toman >= 0),
      effective_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      changed_by_user_id INTEGER,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS ix_product_price_history_product_effective
      ON product_price_history(product_id, effective_from DESC, id DESC);
  `);
}

function migrateLegacyProducts(db) {
  if (tableExists(db, 'inventory_categories')) {
    db.exec(`
      INSERT OR IGNORE INTO product_categories (
        id, name, slug, parent_id, is_active, created_at, updated_at
      )
      SELECT
        id,
        name,
        COALESCE(NULLIF(slug, ''), 'legacy-' || id),
        NULL,
        1,
        COALESCE(created_at, CURRENT_TIMESTAMP),
        COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
      FROM inventory_categories;

      UPDATE product_categories
      SET parent_id = (
        SELECT legacy.parent_id
        FROM inventory_categories legacy
        WHERE legacy.id = product_categories.id
          AND EXISTS (
            SELECT 1 FROM product_categories parent
            WHERE parent.id = legacy.parent_id
          )
      )
      WHERE id IN (SELECT id FROM inventory_categories);
    `);
  }

  if (tableExists(db, 'inventory_products')) {
    db.exec(`
      INSERT OR IGNORE INTO products (
        id, name, category_id, daily_price_toman, notes,
        is_active, created_at, updated_at
      )
      SELECT
        legacy.id,
        legacy.name,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM product_categories category
            WHERE category.id = legacy.category_id
          ) THEN legacy.category_id
          ELSE NULL
        END,
        0,
        legacy.notes,
        1,
        COALESCE(legacy.created_at, CURRENT_TIMESTAMP),
        COALESCE(legacy.updated_at, legacy.created_at, CURRENT_TIMESTAMP)
      FROM inventory_products legacy;
    `);
  }
}

function createDeliveryWorkflow(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS delivery_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_number TEXT,
      customer_id INTEGER,
      customer_name_snapshot TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
          'DRAFT', 'DELIVERED', 'REMAINING', 'NEEDS_FOLLOW_UP', 'COMPLETED'
        )),
      invoice_status TEXT NOT NULL DEFAULT 'NONE'
        CHECK (invoice_status IN ('NONE', 'PROFORMA', 'PARTIALLY_ISSUED', 'ISSUED')),
      invoice_send_status TEXT NOT NULL DEFAULT 'NOT_SENT'
        CHECK (invoice_send_status IN ('NOT_SENT', 'PARTIALLY_SENT', 'SENT')),
      settlement_status TEXT NOT NULL DEFAULT 'UNPAID'
        CHECK (settlement_status IN ('UNPAID', 'PARTIAL', 'PAID')),
      delivered_at TEXT,
      expected_return_at TEXT,
      night_before INTEGER NOT NULL DEFAULT 0 CHECK (night_before IN (0, 1)),
      billing_cutoff_minutes_snapshot INTEGER NOT NULL DEFAULT 660
        CHECK (billing_cutoff_minutes_snapshot BETWEEN 0 AND 1439),
      completed_at TEXT,
      notes TEXT,
      created_by_user_id INTEGER NOT NULL,
      delivered_by_user_id INTEGER,
      last_autosaved_at TEXT,
      version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (delivered_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
      CHECK (status = 'DRAFT' OR delivered_at IS NOT NULL)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_delivery_lists_number
      ON delivery_lists(list_number)
      WHERE list_number IS NOT NULL;
    CREATE INDEX IF NOT EXISTS ix_delivery_lists_status_delivered
      ON delivery_lists(status, delivered_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS ix_delivery_lists_financial_status
      ON delivery_lists(invoice_status, invoice_send_status, settlement_status, id DESC);
    CREATE INDEX IF NOT EXISTS ix_delivery_lists_customer
      ON delivery_lists(customer_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS ix_delivery_lists_creator_drafts
      ON delivery_lists(created_by_user_id, updated_at DESC)
      WHERE status = 'DRAFT' AND archived_at IS NULL;

    CREATE TABLE IF NOT EXISTS delivery_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_list_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name_snapshot TEXT NOT NULL,
      daily_price_toman INTEGER NOT NULL CHECK (daily_price_toman >= 0),
      delivered_quantity INTEGER NOT NULL CHECK (delivered_quantity > 0),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (delivery_list_id) REFERENCES delivery_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_delivery_list_items_active_product
      ON delivery_list_items(delivery_list_id, product_id)
      WHERE product_id IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS ix_delivery_list_items_list
      ON delivery_list_items(delivery_list_id, id);

    CREATE TABLE IF NOT EXISTS return_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_list_id INTEGER NOT NULL,
      returned_at TEXT NOT NULL,
      received_by_user_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (delivery_list_id) REFERENCES delivery_lists(id) ON DELETE RESTRICT,
      FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS ix_return_events_list_returned
      ON return_events(delivery_list_id, returned_at, id);

    CREATE TABLE IF NOT EXISTS return_event_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_event_id INTEGER NOT NULL,
      delivery_list_item_id INTEGER NOT NULL,
      healthy_quantity INTEGER NOT NULL DEFAULT 0 CHECK (healthy_quantity >= 0),
      damaged_quantity INTEGER NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
      system_calculated_days INTEGER NOT NULL CHECK (system_calculated_days >= 1),
      final_charged_days INTEGER NOT NULL CHECK (final_charged_days >= 1),
      day_override_reason TEXT,
      damage_notes TEXT,
      issue_resolved_at TEXT,
      issue_resolved_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (return_event_id) REFERENCES return_events(id) ON DELETE RESTRICT,
      FOREIGN KEY (delivery_list_item_id) REFERENCES delivery_list_items(id) ON DELETE RESTRICT,
      FOREIGN KEY (issue_resolved_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
      CHECK (healthy_quantity + damaged_quantity > 0),
      CHECK (
        (damaged_quantity = 0)
        OR NULLIF(TRIM(damage_notes), '') IS NOT NULL
      ),
      UNIQUE (return_event_id, delivery_list_item_id)
    );

    CREATE INDEX IF NOT EXISTS ix_return_event_items_list_item
      ON return_event_items(delivery_list_item_id, id);

    CREATE TRIGGER IF NOT EXISTS trg_return_item_same_list_insert
    BEFORE INSERT ON return_event_items
    FOR EACH ROW
    WHEN (
      SELECT delivery_list_id FROM return_events WHERE id = NEW.return_event_id
    ) <> (
      SELECT delivery_list_id FROM delivery_list_items WHERE id = NEW.delivery_list_item_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'return item must belong to the same delivery list');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_delivery_lists_preserve_finalized
    BEFORE DELETE ON delivery_lists
    FOR EACH ROW
    WHEN OLD.status <> 'DRAFT'
    BEGIN
      SELECT RAISE(ABORT, 'finalized delivery lists must be archived, not deleted');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_return_item_quantity_insert
    BEFORE INSERT ON return_event_items
    FOR EACH ROW
    WHEN (
      SELECT COALESCE(SUM(
        healthy_quantity + damaged_quantity
      ), 0)
      FROM return_event_items
      WHERE delivery_list_item_id = NEW.delivery_list_item_id
        AND deleted_at IS NULL
    ) + NEW.healthy_quantity + NEW.damaged_quantity
      > (
        SELECT delivered_quantity
        FROM delivery_list_items
        WHERE id = NEW.delivery_list_item_id
      )
    BEGIN
      SELECT RAISE(ABORT, 'returned quantity exceeds delivered quantity');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_return_item_quantity_update
    BEFORE UPDATE OF healthy_quantity, damaged_quantity,
      delivery_list_item_id, deleted_at ON return_event_items
    FOR EACH ROW
    WHEN NEW.deleted_at IS NULL AND (
      SELECT COALESCE(SUM(
        healthy_quantity + damaged_quantity
      ), 0)
      FROM return_event_items
      WHERE delivery_list_item_id = NEW.delivery_list_item_id
        AND id <> OLD.id
        AND deleted_at IS NULL
    ) + NEW.healthy_quantity + NEW.damaged_quantity
      > (
        SELECT delivered_quantity
        FROM delivery_list_items
        WHERE id = NEW.delivery_list_item_id
      )
    BEGIN
      SELECT RAISE(ABORT, 'returned quantity exceeds delivered quantity');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_return_item_same_list_update
    BEFORE UPDATE OF return_event_id, delivery_list_item_id ON return_event_items
    FOR EACH ROW
    WHEN (
      SELECT delivery_list_id FROM return_events WHERE id = NEW.return_event_id
    ) <> (
      SELECT delivery_list_id FROM delivery_list_items WHERE id = NEW.delivery_list_item_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'return item must belong to the same delivery list');
    END;
  `);
}

function extendInvoices(db) {
  ensureColumn(
    db,
    'invoices',
    'delivery_list_id',
    'INTEGER REFERENCES delivery_lists(id) ON DELETE RESTRICT'
  );
  ensureColumn(
    db,
    'invoices',
    'parent_invoice_id',
    'INTEGER REFERENCES invoices(id) ON DELETE RESTRICT'
  );
  ensureColumn(db, 'invoices', 'invoice_number', 'TEXT');
  ensureColumn(
    db,
    'invoices',
    'invoice_type',
    "TEXT NOT NULL DEFAULT 'LEGACY' CHECK (invoice_type IN ('LEGACY', 'PRIMARY', 'SUPPLEMENT'))"
  );
  ensureColumn(
    db,
    'invoices',
    'status',
    "TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('PROFORMA', 'ISSUED', 'VOID'))"
  );
  ensureColumn(
    db,
    'invoices',
    'settlement_status',
    "TEXT NOT NULL DEFAULT 'UNPAID' CHECK (settlement_status IN ('UNPAID', 'PARTIAL', 'PAID'))"
  );
  ensureColumn(
    db,
    'invoices',
    'send_status',
    "TEXT NOT NULL DEFAULT 'NOT_SENT' CHECK (send_status IN ('NOT_SENT', 'SENT'))"
  );
  ensureColumn(db, 'invoices', 'subtotal_toman', 'INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_toman >= 0)');
  ensureColumn(db, 'invoices', 'extra_charges_toman', 'INTEGER NOT NULL DEFAULT 0 CHECK (extra_charges_toman >= 0)');
  ensureColumn(db, 'invoices', 'discount_percent_basis_points', 'INTEGER NOT NULL DEFAULT 0 CHECK (discount_percent_basis_points BETWEEN 0 AND 10000)');
  ensureColumn(db, 'invoices', 'discount_amount_toman', 'INTEGER NOT NULL DEFAULT 0 CHECK (discount_amount_toman >= 0)');
  ensureColumn(db, 'invoices', 'rounding_adjustment_toman', 'INTEGER NOT NULL DEFAULT 0 CHECK (rounding_adjustment_toman <= 0)');
  ensureColumn(db, 'invoices', 'final_amount_toman', 'INTEGER NOT NULL DEFAULT 0 CHECK (final_amount_toman >= 0)');
  ensureColumn(db, 'invoices', 'issued_at', 'TEXT');
  ensureColumn(db, 'invoices', 'issued_by_user_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
  ensureColumn(db, 'invoices', 'updated_at', 'TEXT');
  ensureColumn(db, 'invoices', 'version', 'INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1)');
  ensureColumn(db, 'invoices', 'deleted_at', 'TEXT');

  db.exec(`
    UPDATE invoices
    SET subtotal_toman = CASE
          WHEN subtotal_toman = 0 THEN CAST(ROUND(price) AS INTEGER)
          ELSE subtotal_toman
        END,
        final_amount_toman = CASE
          WHEN final_amount_toman = 0 THEN CAST(ROUND(price) AS INTEGER)
          ELSE final_amount_toman
        END,
        settlement_status = CASE
          WHEN is_settled = 1 THEN 'PAID'
          WHEN settlement_status = 'PAID' THEN 'PAID'
          ELSE settlement_status
        END,
        send_status = CASE
          WHEN is_shipped = 1 THEN 'SENT'
          ELSE send_status
        END,
        issued_at = COALESCE(issued_at, date),
        updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE invoice_type = 'LEGACY';

    CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_number
      ON invoices(invoice_number)
      WHERE invoice_number IS NOT NULL AND deleted_at IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS ux_invoices_active_proforma
      ON invoices(delivery_list_id)
      WHERE delivery_list_id IS NOT NULL
        AND status = 'PROFORMA'
        AND deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS ix_invoices_delivery_status
      ON invoices(delivery_list_id, status, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS ix_invoices_settlement_send
      ON invoices(settlement_status, send_status, id DESC);

    CREATE TRIGGER IF NOT EXISTS trg_invoices_preserve_workflow_history
    BEFORE DELETE ON invoices
    FOR EACH ROW
    WHEN OLD.delivery_list_id IS NOT NULL
    BEGIN
      SELECT RAISE(ABORT, 'workflow invoices must be voided, not deleted');
    END;
  `);
}

function createInvoiceDetails(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      delivery_list_item_id INTEGER,
      return_event_item_id INTEGER,
      line_type TEXT NOT NULL DEFAULT 'RENTAL'
        CHECK (line_type IN ('RENTAL', 'DAMAGE', 'TRANSPORT', 'OTHER')),
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      billing_from_at TEXT,
      billing_to_at TEXT,
      charged_days INTEGER CHECK (charged_days IS NULL OR charged_days >= 1),
      unit_price_toman INTEGER NOT NULL CHECK (unit_price_toman >= 0),
      line_total_toman INTEGER NOT NULL CHECK (line_total_toman >= 0),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (delivery_list_item_id) REFERENCES delivery_list_items(id) ON DELETE RESTRICT,
      FOREIGN KEY (return_event_item_id) REFERENCES return_event_items(id) ON DELETE RESTRICT,
      CHECK (
        line_type <> 'RENTAL'
        OR (
          delivery_list_item_id IS NOT NULL
          AND return_event_item_id IS NOT NULL
          AND billing_from_at IS NOT NULL
          AND billing_to_at IS NOT NULL
          AND charged_days IS NOT NULL
        )
      )
    );

    CREATE UNIQUE INDEX IF NOT EXISTS ux_invoice_lines_return_rental
      ON invoice_lines(return_event_item_id)
      WHERE line_type = 'RENTAL'
        AND return_event_item_id IS NOT NULL
        AND deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS ix_invoice_lines_invoice_sort
      ON invoice_lines(invoice_id, sort_order, id);

    CREATE TABLE IF NOT EXISTS invoice_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      adjustment_type TEXT NOT NULL
        CHECK (adjustment_type IN (
          'DISCOUNT_PERCENT', 'DISCOUNT_AMOUNT', 'ROUNDING',
          'DAMAGE', 'TRANSPORT', 'OTHER'
        )),
      description TEXT NOT NULL,
      percent_basis_points INTEGER
        CHECK (percent_basis_points IS NULL OR percent_basis_points BETWEEN 0 AND 10000),
      amount_toman INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      CHECK (
        (adjustment_type = 'DISCOUNT_PERCENT' AND percent_basis_points IS NOT NULL)
        OR adjustment_type <> 'DISCOUNT_PERCENT'
      )
    );

    CREATE INDEX IF NOT EXISTS ix_invoice_adjustments_invoice
      ON invoice_adjustments(invoice_id, sort_order, id);

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_list_id INTEGER NOT NULL,
      invoice_id INTEGER,
      amount_toman INTEGER NOT NULL CHECK (amount_toman > 0),
      payment_method TEXT NOT NULL DEFAULT 'OTHER'
        CHECK (payment_method IN ('CASH', 'POS', 'CARD_TRANSFER', 'OTHER')),
      reference_number TEXT,
      paid_at TEXT NOT NULL,
      received_by_user_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      voided_at TEXT,
      voided_by_user_id INTEGER,
      FOREIGN KEY (delivery_list_id) REFERENCES delivery_lists(id) ON DELETE RESTRICT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
      FOREIGN KEY (received_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
      FOREIGN KEY (voided_by_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS ix_payments_list_paid
      ON payments(delivery_list_id, paid_at, id);
    CREATE INDEX IF NOT EXISTS ix_payments_invoice
      ON payments(invoice_id, paid_at, id);

    CREATE TRIGGER IF NOT EXISTS trg_payment_invoice_same_list
    BEFORE INSERT ON payments
    FOR EACH ROW
    WHEN NEW.invoice_id IS NOT NULL AND COALESCE((
      SELECT delivery_list_id FROM invoices WHERE id = NEW.invoice_id
    ), -1) <> NEW.delivery_list_id
    BEGIN
      SELECT RAISE(ABORT, 'payment invoice must belong to the same delivery list');
    END;

    CREATE TABLE IF NOT EXISTS invoice_send_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      channel TEXT NOT NULL DEFAULT 'MANUAL'
        CHECK (channel IN ('EITA', 'PRINT', 'MANUAL', 'OTHER')),
      recipient TEXT,
      status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED')),
      sent_at TEXT NOT NULL,
      sent_by_user_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
      FOREIGN KEY (sent_by_user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS ix_invoice_send_logs_invoice
      ON invoice_send_logs(invoice_id, sent_at DESC, id DESC);
  `);
}

function createAuditLog(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS ix_audit_logs_entity
      ON audit_logs(entity_type, entity_id, created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS ix_audit_logs_actor
      ON audit_logs(actor_user_id, created_at DESC, id DESC);
  `);
}

module.exports = migration;
