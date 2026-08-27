const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const {
  DeliveryListDraftError,
  createDeliveryListDraftService,
  calculateChargedDays
} = require('../src/services/deliveryListDraftService');
const { createSettingsService } = require('../src/services/settingsService');
const { createDeliveryInvoiceService } = require('../src/services/deliveryInvoiceService');
const { createDeliverySettlementService } = require('../src/services/deliverySettlementService');
const { getPersianYear } = require('../src/services/workflowNumberingService');
const { createInvoicePdfService } = require('../src/services/invoicePdfService');
const { createReportService } = require('../src/services/reportService');

function createDatabase() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT
    );
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT
    );
    CREATE TABLE app_settings (
      id INTEGER PRIMARY KEY,
      collection_name TEXT NOT NULL DEFAULT 'مجموعه من',
      timezone TEXT NOT NULL DEFAULT 'Asia/Tehran',
      billing_cutoff_minutes INTEGER NOT NULL,
      list_number_prefix TEXT NOT NULL DEFAULT 'LST',
      invoice_number_prefix TEXT NOT NULL DEFAULT 'INV',
      updated_by_user_id INTEGER,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE product_categories (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      daily_price_toman INTEGER NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE delivery_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      list_number TEXT,
      customer_id INTEGER,
      customer_name_snapshot TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      invoice_status TEXT NOT NULL DEFAULT 'NONE',
      invoice_send_status TEXT NOT NULL DEFAULT 'NOT_SENT',
      settlement_status TEXT NOT NULL DEFAULT 'UNPAID',
      delivered_at TEXT,
      expected_return_at TEXT,
      night_before INTEGER NOT NULL DEFAULT 0,
      billing_cutoff_minutes_snapshot INTEGER NOT NULL DEFAULT 660,
      completed_at TEXT,
      notes TEXT,
      created_by_user_id INTEGER NOT NULL,
      delivered_by_user_id INTEGER,
      last_autosaved_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );
    CREATE TABLE delivery_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_list_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name_snapshot TEXT NOT NULL,
      daily_price_toman INTEGER NOT NULL,
      delivered_quantity INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (delivery_list_id) REFERENCES delivery_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      notes TEXT,
      delivery_list_id INTEGER,
      parent_invoice_id INTEGER,
      invoice_number TEXT,
      invoice_type TEXT NOT NULL DEFAULT 'LEGACY',
      status TEXT NOT NULL DEFAULT 'ISSUED',
      settlement_status TEXT NOT NULL DEFAULT 'UNPAID',
      send_status TEXT NOT NULL DEFAULT 'NOT_SENT',
      subtotal_toman INTEGER NOT NULL DEFAULT 0,
      extra_charges_toman INTEGER NOT NULL DEFAULT 0,
      discount_percent_basis_points INTEGER NOT NULL DEFAULT 0,
      discount_amount_toman INTEGER NOT NULL DEFAULT 0,
      rounding_adjustment_toman INTEGER NOT NULL DEFAULT 0,
      final_amount_toman INTEGER NOT NULL DEFAULT 0,
      issued_at TEXT,
      issued_by_user_id INTEGER,
      updated_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (delivery_list_id) REFERENCES delivery_lists(id)
    );

    CREATE TABLE return_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_list_id INTEGER NOT NULL,
      returned_at TEXT NOT NULL,
      received_by_user_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (delivery_list_id) REFERENCES delivery_lists(id),
      FOREIGN KEY (received_by_user_id) REFERENCES users(id)
    );
    CREATE TABLE return_event_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_event_id INTEGER NOT NULL,
      delivery_list_item_id INTEGER NOT NULL,
      healthy_quantity INTEGER NOT NULL DEFAULT 0,
      damaged_quantity INTEGER NOT NULL DEFAULT 0,
      lost_quantity INTEGER NOT NULL DEFAULT 0,
      system_calculated_days INTEGER NOT NULL,
      final_charged_days INTEGER NOT NULL,
      day_override_reason TEXT,
      damage_notes TEXT,
      issue_resolved_at TEXT,
      issue_resolved_by_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (return_event_id) REFERENCES return_events(id),
      FOREIGN KEY (delivery_list_item_id) REFERENCES delivery_list_items(id)
    );
    CREATE UNIQUE INDEX ux_invoices_active_proforma
      ON invoices(delivery_list_id)
      WHERE delivery_list_id IS NOT NULL AND status = 'PROFORMA' AND deleted_at IS NULL;
    CREATE UNIQUE INDEX ux_delivery_lists_number ON delivery_lists(list_number) WHERE list_number IS NOT NULL;
    CREATE UNIQUE INDEX ux_invoices_number ON invoices(invoice_number) WHERE invoice_number IS NOT NULL;

    CREATE TABLE invoice_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      delivery_list_item_id INTEGER,
      return_event_item_id INTEGER,
      line_type TEXT NOT NULL DEFAULT 'RENTAL',
      description TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      billing_from_at TEXT,
      billing_to_at TEXT,
      charged_days INTEGER,
      unit_price_toman INTEGER NOT NULL,
      line_total_toman INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (delivery_list_item_id) REFERENCES delivery_list_items(id),
      FOREIGN KEY (return_event_item_id) REFERENCES return_event_items(id)
    );
    CREATE UNIQUE INDEX ux_invoice_lines_return_rental
      ON invoice_lines(return_event_item_id)
      WHERE line_type = 'RENTAL' AND return_event_item_id IS NOT NULL AND deleted_at IS NULL;
    CREATE TABLE invoice_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      adjustment_type TEXT NOT NULL,
      description TEXT NOT NULL,
      percent_basis_points INTEGER,
      amount_toman INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );
    CREATE TABLE payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_list_id INTEGER NOT NULL,
      invoice_id INTEGER,
      amount_toman INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'OTHER',
      reference_number TEXT,
      paid_at TEXT NOT NULL,
      received_by_user_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      voided_at TEXT,
      voided_by_user_id INTEGER,
      FOREIGN KEY (delivery_list_id) REFERENCES delivery_lists(id),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (received_by_user_id) REFERENCES users(id),
      FOREIGN KEY (voided_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE invoice_send_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      channel TEXT NOT NULL DEFAULT 'MANUAL',
      recipient TEXT,
      status TEXT NOT NULL DEFAULT 'SENT',
      sent_at TEXT NOT NULL,
      sent_by_user_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (sent_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_user_id) REFERENCES users(id)
    );

    INSERT INTO users (id, username, display_name) VALUES (1, 'manager', 'مدیر');
    INSERT INTO customers (id, name) VALUES (1, 'علی حیدری');
    INSERT INTO app_settings (id, billing_cutoff_minutes) VALUES (1, 660);
    INSERT INTO products (id, name, daily_price_toman) VALUES (1, 'Sony A7 IV', 1500000);
    INSERT INTO products (id, name, daily_price_toman) VALUES (2, 'لنز 24-70', 800000);
  `);
  return db;
}

test('creates multiple drafts and autosaves customer, dates and items', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const first = service.createDraft(1);
    const second = service.createDraft(1);
    assert.equal(first.version, 1);
    assert.equal(service.listDrafts().length, 2);

    const saved = service.saveDraft(first.id, {
      version: first.version,
      customer_id: 1,
      customer_name_snapshot: 'نامی که نباید جایگزین مشتری شود',
      delivered_at: '2026-08-23T20:00:00+03:30',
      expected_return_at: '2026-08-25T11:00:00+03:30',
      night_before: true,
      notes: 'پیش‌نویس آزمایشی',
      items: [
        { product_id: 1, daily_price_toman: 1500000, delivered_quantity: 25 },
        { product_id: 2, daily_price_toman: 750000, delivered_quantity: 2, notes: 'قیمت توافقی' }
      ]
    });

    assert.equal(saved.version, 2);
    assert.equal(saved.customer_name, 'علی حیدری');
    assert.equal(saved.night_before, true);
    assert.equal(saved.items.length, 2);
    assert.equal(saved.items[0].delivered_quantity, 25);
    assert.equal(saved.items[1].daily_price_toman, 750000);
    assert.equal(service.listDrafts().find((draft) => draft.id === first.id).item_count, 2);

    service.deleteDraft(first.id);
    assert.equal(service.listDrafts().length, 1);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM delivery_list_items').get().count, 0);
    assert.equal(service.getDraft(second.id).id, second.id);
  } finally {
    db.close();
  }
});

test('archives a finalized list while preserving its invoices and audit history', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const draft = service.createDraft(1);
    const saved = service.saveDraft(draft.id, {
      version: draft.version,
      customer_id: 1,
      delivered_at: '2026-08-24T10:00:00+03:30',
      expected_return_at: '2026-08-25T11:00:00+03:30',
      items: [{ product_id: 1, daily_price_toman: 1500000, delivered_quantity: 1 }]
    });
    service.finalizeDraft(draft.id, saved.version, 1);

    const result = service.archiveList(draft.id, 1);
    assert.deepEqual(result, { id: draft.id, deleted: true, archived: true });
    assert.equal(service.listDeliveryLists().some((list) => list.id === draft.id), false);
    assert.ok(db.prepare('SELECT archived_at FROM delivery_lists WHERE id = ?').get(draft.id).archived_at);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM invoices WHERE delivery_list_id = ?').get(draft.id).count, 1);
    assert.equal(
      db.prepare('SELECT action FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY id DESC LIMIT 1')
        .get('DELIVERY_LIST', String(draft.id)).action,
      'ARCHIVE_DELIVERY_LIST'
    );
    assert.throws(() => service.getList(draft.id), /لیست پیدا نشد/);
  } finally {
    db.close();
  }
});

test('rejects stale autosaves and duplicate products', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const draft = service.createDraft(1);
    service.saveDraft(draft.id, { version: 1, items: [] });

    assert.throws(
      () => service.saveDraft(draft.id, { version: 1, items: [] }),
      (error) => error instanceof DeliveryListDraftError && error.statusCode === 409
    );

    assert.throws(
      () => service.saveDraft(draft.id, {
        version: 2,
        items: [
          { product_id: 1, daily_price_toman: 1, delivered_quantity: 1 },
          { product_id: 1, daily_price_toman: 1, delivered_quantity: 2 }
        ]
      }),
      /هر محصول فقط یک بار/
    );
  } finally {
    db.close();
  }
});

test('finalizes a complete draft and creates exactly one linked proforma', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const draft = service.createDraft(1);
    const saved = service.saveDraft(draft.id, {
      version: draft.version,
      customer_id: 1,
      delivered_at: '2026-08-24T18:00:00+03:30',
      expected_return_at: '2026-08-26T11:00:00+03:30',
      night_before: true,
      items: [
        { product_id: 1, daily_price_toman: 1500000, delivered_quantity: 2 }
      ]
    });

    const finalized = service.finalizeDraft(draft.id, saved.version, 1);
    assert.equal(finalized.status, 'DELIVERED');
    assert.equal(finalized.invoice_status, 'PROFORMA');
    assert.equal(finalized.list_number, '051000');
    assert.equal(finalized.delivered_by_user_id, 1);
    assert.equal(finalized.proforma.status, 'PROFORMA');
    assert.equal(finalized.proforma.invoice_type, 'PRIMARY');
    assert.equal(finalized.proforma.final_amount_toman, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM invoices').get().count, 1);
    assert.equal(db.prepare('SELECT action FROM audit_logs').get().action, 'FINALIZE_DELIVERY');

    assert.throws(
      () => service.finalizeDraft(draft.id, finalized.version, 1),
      (error) => error instanceof DeliveryListDraftError && error.statusCode === 409
    );
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM invoices').get().count, 1);
  } finally {
    db.close();
  }
});

test('does not finalize incomplete drafts or create orphan proformas', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const draft = service.createDraft(1);
    assert.throws(() => service.finalizeDraft(draft.id, draft.version, 1), /مشتری/);
    assert.equal(service.getDraft(draft.id).status, 'DRAFT');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM invoices').get().count, 0);
  } finally {
    db.close();
  }
});

test('calculates cutoff boundaries and night-before exactly', () => {
  const normal = {
    deliveredAt: '2026-11-21T20:00:00+03:30',
    cutoffMinutes: 660,
    nightBefore: false
  };
  assert.equal(calculateChargedDays({ ...normal, returnedAt: '2026-11-22T11:00:00+03:30' }), 1);
  assert.equal(calculateChargedDays({ ...normal, returnedAt: '2026-11-22T11:01:00+03:30' }), 2);
  assert.equal(calculateChargedDays({ ...normal, returnedAt: '2026-11-23T11:00:00+03:30' }), 2);
  assert.equal(calculateChargedDays({ ...normal, nightBefore: true, returnedAt: '2026-11-23T11:00:00+03:30' }), 1);
  assert.equal(calculateChargedDays({ ...normal, nightBefore: true, returnedAt: '2026-11-23T11:01:00+03:30' }), 2);
});

test('records partial and complete healthy returns with independent charged days', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const draft = service.createDraft(1);
    const saved = service.saveDraft(draft.id, {
      version: draft.version,
      customer_id: 1,
      delivered_at: '2026-08-24T18:00:00+03:30',
      expected_return_at: '2026-08-27T11:00:00+03:30',
      items: [{ product_id: 1, daily_price_toman: 1500000, delivered_quantity: 3 }]
    });
    const finalized = service.finalizeDraft(draft.id, saved.version, 1);
    const itemId = finalized.items[0].id;

    const partial = service.recordReturn(draft.id, {
      returned_at: '2026-08-25T11:00:00+03:30',
      items: [{ delivery_list_item_id: itemId, healthy_quantity: 1 }]
    }, 1);
    assert.equal(partial.status, 'REMAINING');
    assert.equal(partial.items[0].remaining_quantity, 2);
    assert.equal(partial.return_events[0].items[0].system_calculated_days, 1);

    const completed = service.recordReturn(draft.id, {
      returned_at: '2026-08-26T11:00:00+03:30',
      items: [{ delivery_list_item_id: itemId, healthy_quantity: 2 }]
    }, 1);
    assert.equal(completed.status, 'COMPLETED');
    assert.equal(completed.items[0].remaining_quantity, 0);
    assert.equal(completed.items[0].item_status, 'RETURNED');
    assert.equal(completed.return_events.length, 2);
    assert.equal(completed.return_events[0].items[0].final_charged_days, 2);
  } finally {
    db.close();
  }
});

test('marks damage for follow-up and requires reasons for issues and day overrides', () => {
  const db = createDatabase();
  try {
    const service = createDeliveryListDraftService(db);
    const draft = service.createDraft(1);
    const saved = service.saveDraft(draft.id, {
      version: draft.version,
      customer_id: 1,
      delivered_at: '2026-08-24T18:00:00+03:30',
      expected_return_at: '2026-08-26T11:00:00+03:30',
      items: [{ product_id: 1, daily_price_toman: 1500000, delivered_quantity: 2 }]
    });
    const finalized = service.finalizeDraft(draft.id, saved.version, 1);
    const itemId = finalized.items[0].id;

    assert.throws(() => service.recordReturn(draft.id, {
      returned_at: '2026-08-26T11:00:00+03:30',
      items: [{ delivery_list_item_id: itemId, damaged_quantity: 1 }]
    }, 1), /توضیحات/);
    assert.throws(() => service.recordReturn(draft.id, {
      returned_at: '2026-08-26T11:00:00+03:30',
      items: [{ delivery_list_item_id: itemId, healthy_quantity: 1, final_charged_days: 5 }]
    }, 1), /دلیل/);

    const result = service.recordReturn(draft.id, {
      returned_at: '2026-08-26T11:00:00+03:30',
      items: [{
        delivery_list_item_id: itemId,
        damaged_quantity: 1,
        final_charged_days: 3,
        day_override_reason: 'توافق با مشتری',
        damage_notes: 'خط روی بدنه'
      }]
    }, 1);
    assert.equal(result.status, 'NEEDS_FOLLOW_UP');
    assert.equal(result.items[0].item_status, 'DAMAGE');
    assert.equal(result.items[0].remaining_quantity, 1);
    assert.equal(result.return_events[0].items[0].final_charged_days, 3);
  } finally {
    db.close();
  }
});

test('manager can update collection identity and the cutoff used by new lists', () => {
  const db = createDatabase();
  try {
    const settingsService = createSettingsService(db);
    const updated = settingsService.updateGeneralSettings({
      collection_name: 'مجموعه تصویربرداری آلفا',
      billing_cutoff_time: '10:30'
    }, 1);
    assert.equal(updated.collection_name, 'مجموعه تصویربرداری آلفا');
    assert.equal(updated.billing_cutoff_minutes, 630);
    assert.equal(updated.billing_cutoff_time, '10:30');
    const draft = createDeliveryListDraftService(db).createDraft(1);
    assert.equal(draft.billing_cutoff_minutes_snapshot, 630);
  } finally {
    db.close();
  }
});

test('uses unique Jalali year prefixes for list and invoice numbers', () => {
  const db = createDatabase();
  try {
    assert.equal(getPersianYear('2026-08-24T18:00:00+03:30'), 1405);
    const service = createDeliveryListDraftService(db);
    for (let index = 0; index < 2; index += 1) {
      const draft = service.createDraft(1);
      const saved = service.saveDraft(draft.id, {
        version: draft.version,
        customer_id: 1,
        delivered_at: '2026-08-24T18:00:00+03:30',
        expected_return_at: '2026-08-26T11:00:00+03:30',
        items: [{ product_id: 1, daily_price_toman: 1500000, delivered_quantity: 1 }]
      });
      service.finalizeDraft(draft.id, saved.version, 1);
    }
    assert.deepEqual(
      db.prepare('SELECT list_number FROM delivery_lists ORDER BY id').all().map((row) => row.list_number),
      ['051000', '051001']
    );
  } finally {
    db.close();
  }
});

test('issues a primary invoice for returned items and a supplement after the remaining return', () => {
  const db = createDatabase();
  try {
    const listService = createDeliveryListDraftService(db);
    const invoiceService = createDeliveryInvoiceService(db);
    const draft = listService.createDraft(1);
    const saved = listService.saveDraft(draft.id, {
      version: draft.version,
      customer_id: 1,
      delivered_at: '2026-08-24T18:00:00+03:30',
      expected_return_at: '2026-08-27T11:00:00+03:30',
      items: [{ product_id: 1, daily_price_toman: 1500000, delivered_quantity: 3 }]
    });
    const delivered = listService.finalizeDraft(draft.id, saved.version, 1);
    const itemId = delivered.items[0].id;

    listService.recordReturn(draft.id, {
      returned_at: '2026-08-25T11:00:00+03:30',
      items: [{ delivery_list_item_id: itemId, healthy_quantity: 1 }]
    }, 1);
    const firstPreview = invoiceService.getPreview(draft.id);
    assert.equal(firstPreview.lines.length, 1);
    assert.equal(firstPreview.lines[0].line_total_toman, 1500000);
    const primary = invoiceService.issueInvoice(draft.id, {
      issued_at: '2026-08-25T12:00:00+03:30',
      lines: firstPreview.lines,
      discount_percent_basis_points: 1000,
      extras: [{ type: 'TRANSPORT', description: 'حمل', amount_toman: 100000 }]
    }, 1);
    assert.equal(primary.invoice_number, '4051000');
    assert.equal(primary.invoice_type, 'PRIMARY');
    assert.equal(primary.final_amount_toman, 1440000);
    assert.equal(listService.getList(draft.id).invoice_status, 'PARTIALLY_ISSUED');
    assert.equal(invoiceService.getPreview(draft.id).lines.length, 0);

    const primaryDetail = invoiceService.getInvoice(draft.id, primary.id);
    const editedPrimary = invoiceService.updateInvoice(draft.id, primary.id, {
      lines: primaryDetail.lines.map((line) => ({
        id: line.id,
        charged_days: 2,
        unit_price_toman: 1200000
      })),
      extras: [{ type: 'TRANSPORT', description: 'حمل و نقل ویرایش شده', amount_toman: 200000 }],
      discount_percent_basis_points: 0,
      discount_amount_toman: 100000,
      rounding_adjustment_toman: -50000,
      notes: 'نسخه ویرایش شده پیش از دانلود'
    }, 1);
    assert.equal(editedPrimary.subtotal_toman, 2400000);
    assert.equal(editedPrimary.final_amount_toman, 2450000);
    assert.equal(editedPrimary.lines[0].charged_days, 2);
    assert.equal(editedPrimary.extras[0].amount_toman, 200000);
    assert.equal(editedPrimary.fixed_discount_toman, 100000);
    assert.equal(editedPrimary.notes, 'نسخه ویرایش شده پیش از دانلود');
    assert.equal(editedPrimary.version, 5);
    const primaryListSummary = listService.listDeliveryLists().find((list) => list.id === draft.id);
    assert.equal(primaryListSummary.issued_invoice_count, 1);
    assert.equal(primaryListSummary.invoice_total_toman, 2450000);
    const sentPrimary = invoiceService.updateSendStatus(draft.id, primary.id, {
      send_status: 'SENT',
      channel: 'EITA',
      recipient: '09120000000',
      sent_at: '2026-08-25T13:00:00+03:30'
    }, 1);
    assert.equal(sentPrimary.send_status, 'SENT');
    assert.equal(sentPrimary.send_logs[0].channel, 'EITA');
    assert.equal(sentPrimary.send_logs[0].sent_by_name, 'مدیر');
    assert.equal(listService.getList(draft.id).invoice_send_status, 'SENT');

    listService.recordReturn(draft.id, {
      returned_at: '2026-08-26T11:00:00+03:30',
      items: [{ delivery_list_item_id: itemId, healthy_quantity: 2 }]
    }, 1);
    const secondPreview = invoiceService.getPreview(draft.id);
    assert.equal(secondPreview.lines[0].quantity, 2);
    assert.equal(secondPreview.lines[0].charged_days, 2);
    const supplement = invoiceService.issueInvoice(draft.id, {
      issued_at: '2026-08-27T14:00:00+03:30',
      lines: secondPreview.lines
    }, 1);
    assert.equal(supplement.invoice_number, '4051001');
    assert.equal(supplement.invoice_type, 'SUPPLEMENT');
    assert.equal(supplement.parent_invoice_id, primary.id);
    const completedListSummary = listService.listDeliveryLists().find((list) => list.id === draft.id);
    assert.equal(completedListSummary.issued_invoice_count, 2);
    assert.equal(completedListSummary.invoice_total_toman, 8450000);
    assert.equal(listService.getList(draft.id).invoice_send_status, 'PARTIALLY_SENT');
    invoiceService.updateSendStatus(draft.id, supplement.id, {
      send_status: 'SENT', channel: 'EITA'
    }, 1);
    assert.equal(listService.getList(draft.id).invoice_send_status, 'SENT');
    const resetPrimary = invoiceService.updateSendStatus(draft.id, primary.id, {
      send_status: 'NOT_SENT', notes: 'نیاز به ارسال مجدد'
    }, 1);
    assert.equal(resetPrimary.send_status, 'NOT_SENT');
    assert.equal(resetPrimary.send_logs[0].status, 'FAILED');
    assert.equal(listService.getList(draft.id).invoice_send_status, 'PARTIALLY_SENT');
    const supplementPdfData = createInvoicePdfService(db).getInvoicePdfData(draft.id, supplement.id);
    assert.equal(supplementPdfData.invoice.parent_invoice_number, primary.invoice_number);
    const finalList = listService.getList(draft.id);
    assert.equal(finalList.invoice_status, 'ISSUED');
    assert.equal(finalList.invoices.length, 2);
    assert.equal(finalList.invoices[1].lines[0].billing_to_at, '2026-08-26T11:00:00+03:30');
  } finally {
    db.close();
  }
});

test('records deposits, completes settlement after final invoice and recalculates after voiding', () => {
  const db = createDatabase();
  try {
    const listService = createDeliveryListDraftService(db);
    const invoiceService = createDeliveryInvoiceService(db);
    const settlementService = createDeliverySettlementService(db);
    const draft = listService.createDraft(1);
    const saved = listService.saveDraft(draft.id, {
      version: draft.version,
      customer_id: 1,
      delivered_at: '2026-08-24T18:00:00+03:30',
      expected_return_at: '2026-08-25T11:00:00+03:30',
      items: [{ product_id: 1, daily_price_toman: 1500000, delivered_quantity: 1 }]
    });
    const delivered = listService.finalizeDraft(draft.id, saved.version, 1);

    let summary = settlementService.recordPayment(draft.id, {
      amount_toman: 500000,
      payment_method: 'CARD_TRANSFER',
      reference_number: 'DEP-1',
      paid_at: '2026-08-24T18:30:00+03:30'
    }, 1);
    assert.equal(summary.list.settlement_status, 'PARTIAL');
    assert.equal(summary.total_invoiced_toman, 0);
    assert.equal(summary.credit_toman, 500000);

    listService.recordReturn(draft.id, {
      returned_at: '2026-08-25T11:00:00+03:30',
      items: [{ delivery_list_item_id: delivered.items[0].id, healthy_quantity: 1 }]
    }, 1);
    const invoice = invoiceService.issueInvoice(draft.id, {
      issued_at: '2026-08-25T12:00:00+03:30',
      lines: invoiceService.getPreview(draft.id).lines
    }, 1);
    summary = settlementService.getSummary(draft.id);
    assert.equal(summary.list.settlement_status, 'PARTIAL');
    assert.equal(summary.balance_toman, 1000000);

    summary = settlementService.recordPayment(draft.id, {
      invoice_id: invoice.id,
      amount_toman: 1000000,
      payment_method: 'POS',
      paid_at: '2026-08-25T12:30:00+03:30'
    }, 1);
    assert.equal(summary.list.settlement_status, 'PAID');
    assert.equal(summary.balance_toman, 0);
    assert.equal(summary.payments.length, 2);

    summary = settlementService.voidPayment(draft.id, summary.payments[0].id, 1);
    assert.equal(summary.list.settlement_status, 'PARTIAL');
    assert.equal(summary.total_paid_toman, 500000);
    assert.equal(summary.payments[0].voided_by_name, 'مدیر');
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM audit_logs WHERE action IN ('RECORD_PAYMENT', 'VOID_PAYMENT')").get().count, 3);
  } finally {
    db.close();
  }
});

test('generates a downloadable Persian PDF for an issued workflow invoice', async () => {
  const db = createDatabase();
  try {
    db.prepare("UPDATE customers SET phone = '09120000000' WHERE id = 1").run();
    const listService = createDeliveryListDraftService(db);
    const invoiceService = createDeliveryInvoiceService(db);
    const draft = listService.createDraft(1);
    const saved = listService.saveDraft(draft.id, {
      version: draft.version,
      customer_id: 1,
      delivered_at: '2026-08-24T18:00:00+03:30',
      expected_return_at: '2026-08-25T11:00:00+03:30',
      items: [{ product_id: 1, daily_price_toman: 1500000, delivered_quantity: 2 }]
    });
    const delivered = listService.finalizeDraft(draft.id, saved.version, 1);
    listService.recordReturn(draft.id, {
      returned_at: '2026-08-25T11:00:00+03:30',
      items: [{ delivery_list_item_id: delivered.items[0].id, healthy_quantity: 2 }]
    }, 1);
    const invoice = invoiceService.issueInvoice(draft.id, {
      issued_at: '2026-08-25T12:00:00+03:30',
      lines: invoiceService.getPreview(draft.id).lines,
      extras: [{ type: 'TRANSPORT', description: 'هزینه حمل تجهیزات', amount_toman: 200000 }],
      discount_percent_basis_points: 500,
      rounding_adjustment_toman: -10000,
      notes: 'با تشکر از مشتری گرامی'
    }, 1);

    const result = await createInvoicePdfService(db).generate(draft.id, invoice.id);
    assert.equal(result.filename, 'invoice-4051000.pdf');
    assert.equal(result.buffer.subarray(0, 5).toString(), '%PDF-');
    assert.ok(result.buffer.length > 10000);
    assert.equal(result.data.lines.length, 1);
    assert.equal(result.data.adjustments.length, 3);
    assert.equal(result.data.invoice.parent_invoice_number, null);
  } finally {
    db.close();
  }
});

test('builds reports from workflow lists, issued invoices and active payments', () => {
  const db = createDatabase();
  try {
    db.prepare("INSERT INTO customers (id, name) VALUES (2, 'مریم محمدی')").run();
    const insertList = db.prepare(`
      INSERT INTO delivery_lists (
        list_number, customer_id, customer_name_snapshot, status,
        invoice_status, invoice_send_status, settlement_status,
        delivered_at, completed_at, created_by_user_id, delivered_by_user_id
      ) VALUES (?, ?, ?, ?, 'ISSUED', ?, ?, ?, ?, 1, 1)
    `);
    const firstList = Number(insertList.run(
      '051000', 1, 'علی حیدری', 'COMPLETED', 'SENT', 'PARTIAL',
      '2026-08-01T10:00:00+03:30', '2026-08-02T10:00:00+03:30'
    ).lastInsertRowid);
    const secondList = Number(insertList.run(
      '051001', 2, 'مریم محمدی', 'REMAINING', 'NOT_SENT', 'PAID',
      '2026-08-03T10:00:00+03:30', null
    ).lastInsertRowid);
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        customer_id, date, price, delivery_list_id, invoice_number,
        invoice_type, status, settlement_status, send_status,
        subtotal_toman, final_amount_toman, issued_at, issued_by_user_id
      ) VALUES (?, ?, ?, ?, ?, 'PRIMARY', 'ISSUED', ?, ?, ?, ?, ?, 1)
    `);
    const firstInvoice = Number(insertInvoice.run(
      1, '2026-08-02', 1500000, firstList, '4051000', 'PARTIAL', 'SENT',
      1500000, 1500000, '2026-08-02T12:00:00+03:30'
    ).lastInsertRowid);
    const secondInvoice = Number(insertInvoice.run(
      2, '2026-08-04', 2000000, secondList, '4051001', 'PAID', 'NOT_SENT',
      2000000, 2000000, '2026-08-04T12:00:00+03:30'
    ).lastInsertRowid);
    const insertPayment = db.prepare(`
      INSERT INTO payments (
        delivery_list_id, invoice_id, amount_toman, payment_method,
        paid_at, received_by_user_id
      ) VALUES (?, ?, ?, 'OTHER', ?, 1)
    `);
    insertPayment.run(firstList, firstInvoice, 500000, '2026-08-02T13:00:00+03:30');
    insertPayment.run(secondList, secondInvoice, 2000000, '2026-08-04T13:00:00+03:30');

    const service = createReportService(db);
    const allYears = service.getOverview();
    const reportYear = getPersianYear('2026-08-02T12:00:00+03:30');
    const selectedYear = service.getOverview({ persianYear: reportYear });

    assert.equal(allYears.summary.total_invoiced_toman, 3500000);
    assert.equal(allYears.summary.total_paid_toman, 2500000);
    assert.equal(allYears.summary.outstanding_toman, 1000000);
    assert.equal(allYears.summary.invoice_count, 2);
    assert.equal(allYears.summary.list_count, 2);
    assert.equal(allYears.operational.invoice_send.SENT, 1);
    assert.equal(allYears.operational.invoice_send.NOT_SENT, 1);
    assert.equal(allYears.operational.settlement.PARTIAL, 1);
    assert.equal(allYears.operational.settlement.PAID, 1);
    assert.equal(allYears.operational.list_status.COMPLETED, 1);
    assert.equal(allYears.operational.list_status.REMAINING, 1);
    assert.equal(allYears.top_customers[0].customer_name, 'مریم محمدی');
    assert.equal(allYears.dashboard.customer_count, 2);
    assert.equal(allYears.dashboard.product_count, 2);
    assert.equal(allYears.dashboard.category_count, 0);
    assert.equal(allYears.dashboard.recent_lists.length, 2);
    assert.equal(allYears.dashboard.recent_lists[0].list_number, '051001');
    assert.equal(allYears.dashboard.recent_payments.length, 2);
    assert.equal(allYears.dashboard.recent_payments[0].delivery_list_id, secondList);
    assert.deepEqual(allYears.available_years, [reportYear]);
    assert.equal(selectedYear.period_rows.length, 1);
    assert.equal(selectedYear.period_rows[0].invoice_count, 2);
  } finally {
    db.close();
  }
});
