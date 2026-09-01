const { columnExists } = require('./helpers');

function tableSqlContains(db, tableName, fragment) {
  const row = db.prepare(`
    SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?
  `).get(tableName);
  return String(row?.sql || '').includes(fragment);
}

function rebuildReturnEventItems(db) {
  if (!columnExists(db, 'return_event_items', 'lost_quantity')) return;

  db.exec(`
    DROP TRIGGER IF EXISTS trg_return_item_same_list_insert;
    DROP TRIGGER IF EXISTS trg_return_item_quantity_insert;
    DROP TRIGGER IF EXISTS trg_return_item_quantity_update;
    DROP TRIGGER IF EXISTS trg_return_item_same_list_update;

    CREATE TABLE return_event_items_without_loss (
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
      CHECK (damaged_quantity = 0 OR NULLIF(TRIM(damage_notes), '') IS NOT NULL),
      UNIQUE (return_event_id, delivery_list_item_id)
    );

    INSERT INTO return_event_items_without_loss (
      id, return_event_id, delivery_list_item_id, healthy_quantity,
      damaged_quantity, system_calculated_days, final_charged_days,
      day_override_reason, damage_notes, issue_resolved_at,
      issue_resolved_by_user_id, created_at, updated_at, deleted_at
    )
    SELECT id, return_event_id, delivery_list_item_id, healthy_quantity,
           damaged_quantity + lost_quantity, system_calculated_days,
           final_charged_days, day_override_reason, damage_notes,
           issue_resolved_at, issue_resolved_by_user_id, created_at,
           updated_at, deleted_at
    FROM return_event_items;

    DROP TABLE return_event_items;
    ALTER TABLE return_event_items_without_loss RENAME TO return_event_items;

    CREATE INDEX ix_return_event_items_list_item
      ON return_event_items(delivery_list_item_id, id);

    CREATE TRIGGER trg_return_item_same_list_insert
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

    CREATE TRIGGER trg_return_item_quantity_insert
    BEFORE INSERT ON return_event_items
    FOR EACH ROW
    WHEN (
      SELECT COALESCE(SUM(healthy_quantity + damaged_quantity), 0)
      FROM return_event_items
      WHERE delivery_list_item_id = NEW.delivery_list_item_id
        AND deleted_at IS NULL
    ) + NEW.healthy_quantity + NEW.damaged_quantity > (
      SELECT delivered_quantity FROM delivery_list_items
      WHERE id = NEW.delivery_list_item_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'returned quantity exceeds delivered quantity');
    END;

    CREATE TRIGGER trg_return_item_quantity_update
    BEFORE UPDATE OF healthy_quantity, damaged_quantity,
      delivery_list_item_id, deleted_at ON return_event_items
    FOR EACH ROW
    WHEN NEW.deleted_at IS NULL AND (
      SELECT COALESCE(SUM(healthy_quantity + damaged_quantity), 0)
      FROM return_event_items
      WHERE delivery_list_item_id = NEW.delivery_list_item_id
        AND id <> OLD.id
        AND deleted_at IS NULL
    ) + NEW.healthy_quantity + NEW.damaged_quantity > (
      SELECT delivered_quantity FROM delivery_list_items
      WHERE id = NEW.delivery_list_item_id
    )
    BEGIN
      SELECT RAISE(ABORT, 'returned quantity exceeds delivered quantity');
    END;

    CREATE TRIGGER trg_return_item_same_list_update
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

function rebuildInvoiceLines(db) {
  if (!tableSqlContains(db, 'invoice_lines', "'LOSS'")) return;
  db.exec(`
    CREATE TABLE invoice_lines_without_loss (
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
        line_type <> 'RENTAL' OR (
          delivery_list_item_id IS NOT NULL AND return_event_item_id IS NOT NULL
          AND billing_from_at IS NOT NULL AND billing_to_at IS NOT NULL
          AND charged_days IS NOT NULL
        )
      )
    );
    INSERT INTO invoice_lines_without_loss
    SELECT id, invoice_id, delivery_list_item_id, return_event_item_id,
           CASE WHEN line_type = 'LOSS' THEN 'DAMAGE' ELSE line_type END,
           description, quantity, billing_from_at, billing_to_at, charged_days,
           unit_price_toman, line_total_toman, sort_order, created_at, updated_at, deleted_at
    FROM invoice_lines;
    DROP TABLE invoice_lines;
    ALTER TABLE invoice_lines_without_loss RENAME TO invoice_lines;
    CREATE UNIQUE INDEX ux_invoice_lines_return_rental
      ON invoice_lines(return_event_item_id)
      WHERE line_type = 'RENTAL' AND return_event_item_id IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX ix_invoice_lines_invoice_sort ON invoice_lines(invoice_id, sort_order, id);
  `);
}

function rebuildInvoiceAdjustments(db) {
  if (!tableSqlContains(db, 'invoice_adjustments', "'LOSS'")) return;
  db.exec(`
    CREATE TABLE invoice_adjustments_without_loss (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      adjustment_type TEXT NOT NULL CHECK (adjustment_type IN (
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
    INSERT INTO invoice_adjustments_without_loss
    SELECT id, invoice_id,
           CASE WHEN adjustment_type = 'LOSS' THEN 'DAMAGE' ELSE adjustment_type END,
           description, percent_basis_points, amount_toman, sort_order,
           created_at, updated_at, deleted_at
    FROM invoice_adjustments;
    DROP TABLE invoice_adjustments;
    ALTER TABLE invoice_adjustments_without_loss RENAME TO invoice_adjustments;
    CREATE INDEX ix_invoice_adjustments_invoice
      ON invoice_adjustments(invoice_id, sort_order, id);
  `);
}

module.exports = {
  id: '20260902_007_remove_lost_item_concept',
  foreignKeysOff: true,
  up(db) {
    rebuildReturnEventItems(db);
    rebuildInvoiceLines(db);
    rebuildInvoiceAdjustments(db);
  }
};
