const db = require('../db/database');
const { validationResult } = require('express-validator');

function normalizeText(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function normalizeInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugifyCategoryName(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return normalized
    .replace(/[\u200c\u200f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function ensureLegacyCategoryMirrorTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_categories_legacy (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function syncLegacyCategoryMirror(categoryId, categoryName, createdAt = null) {
  ensureLegacyCategoryMirrorTable();
  const syntheticName = `${String(categoryName || 'category').trim()}__${categoryId}`;
  const existing = db.prepare('SELECT id FROM inventory_categories_legacy WHERE id = ?').get(categoryId);
  if (existing) {
    db.prepare('UPDATE inventory_categories_legacy SET name = ? WHERE id = ?').run(syntheticName, categoryId);
    return;
  }
  db.prepare(`
    INSERT INTO inventory_categories_legacy (id, name, created_at)
    VALUES (?, ?, COALESCE(?, CURRENT_TIMESTAMP))
  `).run(categoryId, syntheticName, createdAt);
}

function getTodayDate() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getRequestedRange(query = {}) {
  const fallback = getTodayDate();
  const startDate = String(query.startDate || fallback);
  const endDate = String(query.endDate || startDate);

  return startDate <= endDate
    ? { startDate, endDate }
    : { startDate: endDate, endDate: startDate };
}

function parseItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      product_id: normalizeInteger(item?.product_id),
      quantity: normalizeInteger(item?.quantity)
    }))
    .filter((item) => item.product_id && item.quantity && item.quantity > 0);
}

function buildCategoryTree(rows) {
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    parent_id: row.parent_id,
    children: []
  }));

  const byId = new Map(items.map((item) => [item.id, item]));
  const roots = [];

  items.forEach((item) => {
    if (item.parent_id && byId.has(item.parent_id)) {
      byId.get(item.parent_id).children.push(item);
      return;
    }
    roots.push(item);
  });

  return roots;
}

function getCategoryTreeRows() {
  return db.prepare(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.parent_id,
      (
        SELECT COUNT(*)
        FROM inventory_products p
        WHERE p.category_id = c.id
      ) AS direct_product_count
    FROM inventory_categories c
    ORDER BY c.parent_id ASC, c.name COLLATE NOCASE ASC
  `).all().map((row) => ({
    ...row,
    direct_product_count: Number(row.direct_product_count) || 0
  }));
}

function mapCategoryRow(row) {
  if (!row) return row;
  return {
    ...row,
    direct_product_count: Number(row.direct_product_count) || 0
  };
}

function mapProductRow(row) {
  if (!row) return row;

  const totalQuantity = Number(row.total_quantity) || 0;
  const reservedQuantity = Number(row.reserved_quantity) || 0;
  const availableQuantity = Math.max(0, totalQuantity - reservedQuantity);

  return {
    ...row,
    total_quantity: totalQuantity,
    reserved_quantity: reservedQuantity,
    available_quantity: availableQuantity,
    availability_status: availableQuantity <= 0 ? 'fully_booked' : reservedQuantity > 0 ? 'partially_booked' : 'available'
  };
}

function mapUnitRow(row) {
  if (!row) return row;

  const totalDays = row.start_date && row.end_date
    ? Math.max(1, Math.round((new Date(`${row.end_date}T00:00:00`).getTime() - new Date(`${row.start_date}T00:00:00`).getTime()) / 86400000) + 1)
    : 0;

  return {
    ...row,
    unit_number: Number(row.unit_number) || 0,
    total_days: totalDays,
    status: row.reservation_item_id ? 'reserved' : 'available'
  };
}

function resolveCategoryById(categoryId) {
  if (!categoryId) return null;
  return db.prepare(`
    SELECT id, name, slug, parent_id
    FROM inventory_categories
    WHERE id = ?
  `).get(categoryId);
}

function resolveCategory(categoryId, categoryName, parentId = null) {
  const normalizedCategoryId = normalizeInteger(categoryId);
  const normalizedParentId = normalizeInteger(parentId);

  if (normalizedCategoryId) {
    const category = resolveCategoryById(normalizedCategoryId);
    if (!category) {
      const error = new Error('دسته‌بندی انتخاب‌شده پیدا نشد');
      error.statusCode = 400;
      throw error;
    }
    return category;
  }

  const normalizedName = normalizeText(categoryName);
  if (!normalizedName) {
    const error = new Error('نام دسته‌بندی الزامی است');
    error.statusCode = 400;
    throw error;
  }

  const slug = slugifyCategoryName(normalizedName);
  const existing = db.prepare(`
    SELECT id, name, slug, parent_id
    FROM inventory_categories
    WHERE slug = ? AND ${normalizedParentId ? 'parent_id = ?' : 'parent_id IS NULL'}
  `).get(...(normalizedParentId ? [slug, normalizedParentId] : [slug]));

  if (existing) return existing;

  const result = db.prepare(`
    INSERT INTO inventory_categories (name, slug, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(normalizedName, slug, normalizedParentId);
  const created = resolveCategoryById(result.lastInsertRowid);
  syncLegacyCategoryMirror(created.id, created.name);
  return created;
}

function getDescendantCategoryIds(categoryId) {
  const rows = db.prepare(`
    WITH RECURSIVE category_tree AS (
      SELECT id, parent_id
      FROM inventory_categories
      WHERE id = ?
      UNION ALL
      SELECT c.id, c.parent_id
      FROM inventory_categories c
      INNER JOIN category_tree ct ON ct.id = c.parent_id
    )
    SELECT id FROM category_tree
  `).all(categoryId);

  return rows.map((row) => row.id);
}

function getActiveUnitsCount(productId) {
  return Number(db.prepare(`
    SELECT COUNT(*) AS count
    FROM inventory_units
    WHERE product_id = ? AND is_active = 1
  `).get(productId)?.count) || 0;
}

function syncProductUnits(productId, targetQuantity) {
  const activeCount = getActiveUnitsCount(productId);

  if (activeCount === targetQuantity) return;

  if (activeCount < targetQuantity) {
    let required = targetQuantity - activeCount;
    const inactiveUnits = db.prepare(`
      SELECT id
      FROM inventory_units
      WHERE product_id = ? AND is_active = 0
      ORDER BY unit_number ASC, id ASC
    `).all(productId);

    inactiveUnits.forEach((unit) => {
      if (required <= 0) return;
      db.prepare('UPDATE inventory_units SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(unit.id);
      required -= 1;
    });

    if (required > 0) {
      let nextUnitNumber = Number(db.prepare(`
        SELECT COALESCE(MAX(unit_number), 0) AS max_number
        FROM inventory_units
        WHERE product_id = ?
      `).get(productId)?.max_number) || 0;

      for (let index = 0; index < required; index += 1) {
        nextUnitNumber += 1;
        db.prepare(`
          INSERT INTO inventory_units (product_id, unit_number, is_active)
          VALUES (?, ?, 1)
        `).run(productId, nextUnitNumber);
      }
    }

    return;
  }

  const removableCount = activeCount - targetQuantity;
  const removableUnits = db.prepare(`
    SELECT u.id
    FROM inventory_units u
    WHERE u.product_id = ?
      AND u.is_active = 1
      AND NOT EXISTS (
        SELECT 1
        FROM inventory_reservation_items ri
        WHERE ri.unit_id = u.id
          AND ri.released_at IS NULL
      )
    ORDER BY u.unit_number DESC, u.id DESC
    LIMIT ?
  `).all(productId, removableCount);

  if (removableUnits.length < removableCount) {
    const error = new Error('برای کاهش تعداد محصول، ابتدا رزروهای فعال یا آینده آن را آزاد کن');
    error.statusCode = 400;
    throw error;
  }

  removableUnits.forEach((unit) => {
    db.prepare('UPDATE inventory_units SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(unit.id);
  });
}

function getProductSummaryRows(startDate, endDate, categoryId = null) {
  const descendantIds = categoryId ? getDescendantCategoryIds(categoryId) : [];
  const categoryFilter = descendantIds.length > 0
    ? `WHERE p.category_id IN (${descendantIds.map(() => '?').join(',')})`
    : '';

  return db.prepare(`
    SELECT
      p.id,
      p.name,
      p.category_id,
      c.name AS category_name,
      c.parent_id AS category_parent_id,
      p.notes,
      COUNT(CASE WHEN u.is_active = 1 THEN 1 END) AS total_quantity,
      COUNT(CASE WHEN active_res.unit_id IS NOT NULL THEN 1 END) AS reserved_quantity
    FROM inventory_products p
    LEFT JOIN inventory_categories c ON c.id = p.category_id
    LEFT JOIN inventory_units u ON u.product_id = p.id AND u.is_active = 1
    LEFT JOIN (
      SELECT DISTINCT ri.unit_id
      FROM inventory_reservation_items ri
      WHERE ri.released_at IS NULL
    ) active_res ON active_res.unit_id = u.id
    ${categoryFilter}
    GROUP BY p.id
    ORDER BY c.name COLLATE NOCASE ASC, p.name COLLATE NOCASE ASC, p.id ASC
  `).all(...descendantIds).map(mapProductRow);
}

function getUnitRows(startDate, endDate, categoryId = null) {
  const descendantIds = categoryId ? getDescendantCategoryIds(categoryId) : [];
  const categoryFilter = descendantIds.length > 0
    ? `AND c.id IN (${descendantIds.map(() => '?').join(',')})`
    : '';

  return db.prepare(`
    SELECT
      u.id AS unit_id,
      u.unit_number,
      p.id AS product_id,
      p.name AS product_name,
      p.notes AS product_notes,
      c.id AS category_id,
      c.parent_id AS category_parent_id,
      c.name AS category_name,
      active_res.reservation_item_id,
      active_res.reservation_order_id,
      active_res.customer_id,
      active_res.customer_name,
      active_res.start_date,
      active_res.end_date,
      active_res.notes AS reservation_notes
    FROM inventory_units u
    INNER JOIN inventory_products p ON p.id = u.product_id
    LEFT JOIN inventory_categories c ON c.id = p.category_id
    LEFT JOIN (
      SELECT
        ri.id AS reservation_item_id,
        ri.unit_id,
        ro.id AS reservation_order_id,
        ro.customer_id,
        COALESCE(cu.name, ro.customer_name) AS customer_name,
        ro.start_date,
        ro.end_date,
        ro.notes
      FROM inventory_reservation_items ri
      INNER JOIN inventory_reservation_orders ro ON ro.id = ri.reservation_order_id
      LEFT JOIN customers cu ON cu.id = ro.customer_id
      WHERE ri.released_at IS NULL
    ) active_res ON active_res.unit_id = u.id
    WHERE u.is_active = 1
      ${categoryFilter}
    ORDER BY c.name COLLATE NOCASE ASC, p.name COLLATE NOCASE ASC, u.unit_number ASC, u.id ASC
  `).all(...descendantIds).map(mapUnitRow);
}

function getActiveReservationOrders(_req, res) {
  try {
    const rows = db.prepare(`
      SELECT
        ro.id AS reservation_order_id,
        ro.customer_id,
        COALESCE(cu.name, ro.customer_name) AS customer_name,
        ro.start_date,
        ro.end_date,
        ro.notes,
        ro.created_at,
        ri.id AS reservation_item_id,
        ri.unit_id,
        u.unit_number,
        p.id AS product_id,
        p.name AS product_name,
        c.id AS category_id,
        c.name AS category_name
      FROM inventory_reservation_orders ro
      INNER JOIN inventory_reservation_items ri ON ri.reservation_order_id = ro.id
      INNER JOIN inventory_units u ON u.id = ri.unit_id
      INNER JOIN inventory_products p ON p.id = u.product_id
      LEFT JOIN inventory_categories c ON c.id = p.category_id
      LEFT JOIN customers cu ON cu.id = ro.customer_id
      WHERE ri.released_at IS NULL
      ORDER BY ro.created_at DESC, ro.id DESC, p.name COLLATE NOCASE ASC, u.unit_number ASC
    `).all();

    const grouped = new Map();
    rows.forEach((row) => {
      if (!grouped.has(row.reservation_order_id)) {
        grouped.set(row.reservation_order_id, {
          reservation_order_id: row.reservation_order_id,
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          start_date: row.start_date,
          end_date: row.end_date,
          notes: row.notes,
          created_at: row.created_at,
          items: []
        });
      }

      grouped.get(row.reservation_order_id).items.push({
        reservation_item_id: row.reservation_item_id,
        unit_id: row.unit_id,
        unit_number: Number(row.unit_number) || 0,
        product_id: row.product_id,
        product_name: row.product_name,
        category_id: row.category_id,
        category_name: row.category_name
      });
    });

    const orders = Array.from(grouped.values()).map((order) => ({
      ...order,
      items_count: order.items.length,
      reservation_type: order.items.length > 1 ? 'bulk' : 'direct'
    }));

    res.json({ orders });
  } catch (err) {
    console.error('Get active reservations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function findOrCreateCustomer(customerId, customerName) {
  const normalizedCustomerId = normalizeInteger(customerId);
  const normalizedCustomerName = normalizeText(customerName);

  if (normalizedCustomerId) {
    const existing = db.prepare('SELECT id, name FROM customers WHERE id = ?').get(normalizedCustomerId);
    if (!existing) {
      const error = new Error('مشتری پیدا نشد');
      error.statusCode = 404;
      throw error;
    }
    return existing;
  }

  if (!normalizedCustomerName) {
    const error = new Error('نام مشتری الزامی است');
    error.statusCode = 400;
    throw error;
  }

  const existingByName = db.prepare(`
    SELECT id, name
    FROM customers
    WHERE LOWER(TRIM(name)) = LOWER(?)
  `).get(normalizedCustomerName);

  if (existingByName) return existingByName;

  const result = db.prepare(`
    INSERT INTO customers (name, first_name, last_name, created_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `).run(normalizedCustomerName, normalizedCustomerName, '');

  return db.prepare('SELECT id, name FROM customers WHERE id = ?').get(result.lastInsertRowid);
}

function getCategoryTree(_req, res) {
  try {
    const rows = getCategoryTreeRows();
    res.json(buildCategoryTree(rows));
  } catch (err) {
    console.error('Get category tree error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function createCategory(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const name = normalizeText(req.body?.name);
    const parentId = normalizeInteger(req.body?.parent_id);

    if (!name) {
      return res.status(400).json({ message: 'نام دسته‌بندی الزامی است' });
    }

    if (parentId) {
      const parent = resolveCategoryById(parentId);
      if (!parent) {
        return res.status(400).json({ message: 'دسته‌بندی والد پیدا نشد' });
      }
    }

    const slug = slugifyCategoryName(name);
    const duplicate = db.prepare(`
      SELECT id
      FROM inventory_categories
      WHERE slug = ? AND ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
    `).get(...(parentId ? [slug, parentId] : [slug]));

    if (duplicate) {
      return res.status(400).json({ message: 'در این شاخه، دسته‌بندی‌ای با همین نام وجود دارد' });
    }

    const result = db.prepare(`
      INSERT INTO inventory_categories (name, slug, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(name, slug, parentId);
    const created = resolveCategoryById(result.lastInsertRowid);
    syncLegacyCategoryMirror(created.id, created.name);
    res.status(201).json(created);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
}

function updateCategory(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const categoryId = normalizeInteger(req.params?.id);

  try {
    const category = resolveCategoryById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'دسته‌بندی پیدا نشد' });
    }

    const name = normalizeText(req.body?.name);
    const parentId = normalizeInteger(req.body?.parent_id);

    if (!name) {
      return res.status(400).json({ message: 'نام دسته‌بندی الزامی است' });
    }

    if (parentId && parentId === categoryId) {
      return res.status(400).json({ message: 'یک دسته‌بندی نمی‌تواند والد خودش باشد' });
    }

    if (parentId) {
      const parent = resolveCategoryById(parentId);
      if (!parent) {
        return res.status(400).json({ message: 'دسته‌بندی والد پیدا نشد' });
      }

      const descendants = getDescendantCategoryIds(categoryId);
      if (descendants.includes(parentId)) {
        return res.status(400).json({ message: 'والد انتخاب‌شده معتبر نیست' });
      }
    }

    const slug = slugifyCategoryName(name);
    const duplicate = db.prepare(`
      SELECT id
      FROM inventory_categories
      WHERE id <> ?
        AND slug = ?
        AND ${parentId ? 'parent_id = ?' : 'parent_id IS NULL'}
    `).get(...(parentId ? [categoryId, slug, parentId] : [categoryId, slug]));

    if (duplicate) {
      return res.status(400).json({ message: 'در این شاخه، دسته‌بندی‌ای با همین نام وجود دارد' });
    }

    db.prepare(`
      UPDATE inventory_categories
      SET name = ?, slug = ?, parent_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, slug, parentId, categoryId);
    const updated = resolveCategoryById(categoryId);
    syncLegacyCategoryMirror(updated.id, updated.name);
    res.json(updated);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
}

function deleteCategory(req, res) {
  const categoryId = normalizeInteger(req.params?.id);

  try {
    const category = resolveCategoryById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'دسته‌بندی پیدا نشد' });
    }

    const childCount = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM inventory_categories
      WHERE parent_id = ?
    `).get(categoryId)?.count) || 0;
    if (childCount > 0) {
      return res.status(400).json({ message: 'اول زیرشاخه‌های این دسته‌بندی را حذف یا جابه‌جا کن' });
    }

    const productCount = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM inventory_products
      WHERE category_id = ?
    `).get(categoryId)?.count) || 0;
    if (productCount > 0) {
      return res.status(400).json({ message: 'این دسته‌بندی محصول دارد و قابل حذف نیست' });
    }

    db.prepare('DELETE FROM inventory_categories WHERE id = ?').run(categoryId);
    db.prepare('DELETE FROM inventory_categories_legacy WHERE id = ?').run(categoryId);
    res.json({ message: 'دسته‌بندی حذف شد' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function getAvailabilityDashboard(req, res) {
  try {
    const { startDate, endDate } = getRequestedRange(req.query);
    const categoryId = normalizeInteger(req.query?.categoryId);
    const categoryRows = getCategoryTreeRows();
    const products = getProductSummaryRows(startDate, endDate, categoryId);
    const units = getUnitRows(startDate, endDate, categoryId);

    const summary = products.reduce((acc, product) => {
      acc.total_products += 1;
      acc.total_quantity += product.total_quantity;
      acc.total_reserved += product.reserved_quantity;
      acc.total_available += product.available_quantity;
      if (product.availability_status === 'fully_booked') acc.fully_booked_products += 1;
      return acc;
    }, {
      total_products: 0,
      total_quantity: 0,
      total_reserved: 0,
      total_available: 0,
      fully_booked_products: 0
    });

    res.json({
      range: { start_date: startDate, end_date: endDate },
      summary: {
        ...summary,
        categories_count: categoryRows.length,
        reserved_units_count: units.filter((unit) => unit.status === 'reserved').length
      },
      categories: categoryRows.map(mapCategoryRow),
      category_tree: buildCategoryTree(categoryRows),
      products,
      units
    });
  } catch (err) {
    console.error('Get inventory dashboard error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
}

function getInventoryLookups(req, res) {
  try {
    const { startDate, endDate } = getRequestedRange(req.query);
    const categoryId = normalizeInteger(req.query?.categoryId);
    const categories = getCategoryTreeRows().map(mapCategoryRow);
    const customers = db.prepare('SELECT id, name FROM customers ORDER BY name COLLATE NOCASE ASC').all();
    const products = getProductSummaryRows(startDate, endDate, categoryId);

    res.json({
      categories,
      category_tree: buildCategoryTree(categories),
      customers,
      products
    });
  } catch (err) {
    console.error('Get inventory lookups error:', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
}

function createProduct(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const name = normalizeText(req.body?.name);
    const totalQuantity = normalizeInteger(req.body?.total_quantity);
    const notes = normalizeText(req.body?.notes);
    const category = resolveCategory(req.body?.category_id, req.body?.category_name, req.body?.parent_category_id);

    if (!name) {
      return res.status(400).json({ message: 'نام محصول الزامی است' });
    }

    if (totalQuantity === null || totalQuantity < 1) {
      return res.status(400).json({ message: 'تعداد محصول باید حداقل 1 باشد' });
    }

    const duplicate = db.prepare(`
      SELECT id
      FROM inventory_products
      WHERE category_id = ? AND LOWER(TRIM(name)) = LOWER(?)
    `).get(category.id, name);
    if (duplicate) {
      return res.status(400).json({ message: 'در این دسته‌بندی محصولی با همین نام وجود دارد' });
    }

    const result = db.prepare(`
      INSERT INTO inventory_products (name, category_id, total_quantity, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(name, category.id, totalQuantity, notes);

    syncProductUnits(result.lastInsertRowid, totalQuantity);

    const created = db.prepare(`
      SELECT p.*, c.name AS category_name, c.parent_id AS category_parent_id
      FROM inventory_products p
      LEFT JOIN inventory_categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      ...created,
      total_quantity: getActiveUnitsCount(result.lastInsertRowid)
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
}

function updateProduct(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const productId = normalizeInteger(req.params?.id);

  try {
    const product = db.prepare('SELECT * FROM inventory_products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ message: 'محصول پیدا نشد' });
    }

    const name = normalizeText(req.body?.name);
    const totalQuantity = normalizeInteger(req.body?.total_quantity);
    const notes = normalizeText(req.body?.notes);
    const category = resolveCategory(req.body?.category_id, req.body?.category_name, req.body?.parent_category_id);

    if (!name) {
      return res.status(400).json({ message: 'نام محصول الزامی است' });
    }

    if (totalQuantity === null || totalQuantity < 1) {
      return res.status(400).json({ message: 'تعداد محصول باید حداقل 1 باشد' });
    }

    const duplicate = db.prepare(`
      SELECT id
      FROM inventory_products
      WHERE id <> ? AND category_id = ? AND LOWER(TRIM(name)) = LOWER(?)
    `).get(productId, category.id, name);
    if (duplicate) {
      return res.status(400).json({ message: 'در این دسته‌بندی محصولی با همین نام وجود دارد' });
    }

    db.prepare(`
      UPDATE inventory_products
      SET name = ?, category_id = ?, total_quantity = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, category.id, totalQuantity, notes, productId);

    syncProductUnits(productId, totalQuantity);

    const updated = db.prepare(`
      SELECT p.*, c.name AS category_name, c.parent_id AS category_parent_id
      FROM inventory_products p
      LEFT JOIN inventory_categories c ON c.id = p.category_id
      WHERE p.id = ?
    `).get(productId);

    res.json({
      ...updated,
      total_quantity: getActiveUnitsCount(productId)
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
}

function deleteProduct(req, res) {
  const productId = normalizeInteger(req.params?.id);

  try {
    const product = db.prepare('SELECT * FROM inventory_products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ message: 'محصول پیدا نشد' });
    }

    const reservationCount = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM inventory_reservation_items ri
      INNER JOIN inventory_units u ON u.id = ri.unit_id
      WHERE u.product_id = ?
        AND ri.released_at IS NULL
    `).get(productId)?.count) || 0;

    if (reservationCount > 0) {
      return res.status(400).json({ message: 'برای این محصول سابقه رزرو ثبت شده و حذف آن مجاز نیست' });
    }

    db.prepare('DELETE FROM inventory_products WHERE id = ?').run(productId);
    res.json({ message: 'محصول حذف شد' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function createReservation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const customer = findOrCreateCustomer(req.body?.customer_id, req.body?.customer_name);
    const startDate = normalizeText(req.body?.start_date);
    const endDate = normalizeText(req.body?.end_date);
    const notes = normalizeText(req.body?.notes);
    const items = parseItems(req.body?.items);

    if (!startDate || !endDate || items.length === 0) {
      return res.status(400).json({ message: 'اطلاعات رزرو کامل نیست' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ message: 'تاریخ شروع باید قبل از تاریخ پایان باشد' });
    }

    const allocation = items.map((item) => {
      const product = db.prepare('SELECT id, name FROM inventory_products WHERE id = ?').get(item.product_id);
      if (!product) {
        const error = new Error('یکی از محصولات انتخاب‌شده پیدا نشد');
        error.statusCode = 404;
        throw error;
      }

      const availableUnits = db.prepare(`
        SELECT u.id
        FROM inventory_units u
        WHERE u.product_id = ?
          AND u.is_active = 1
          AND NOT EXISTS (
            SELECT 1
            FROM inventory_reservation_items ri
            WHERE ri.unit_id = u.id
              AND ri.released_at IS NULL
          )
        ORDER BY u.unit_number ASC, u.id ASC
      `).all(item.product_id);

      if (availableUnits.length < item.quantity) {
        const error = new Error(`موجودی آزاد برای محصول «${product.name}» کافی نیست`);
        error.statusCode = 400;
        throw error;
      }

      return availableUnits.slice(0, item.quantity).map((unit) => unit.id);
    });

    const orderResult = db.prepare(`
      INSERT INTO inventory_reservation_orders (customer_id, customer_name, start_date, end_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(customer.id, customer.name, startDate, endDate, notes);

    const insertItem = db.prepare(`
      INSERT INTO inventory_reservation_items (reservation_order_id, unit_id, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    allocation.forEach((unitIds) => {
      unitIds.forEach((unitId) => {
        insertItem.run(orderResult.lastInsertRowid, unitId);
      });
    });

    res.status(201).json({ reservation_order_id: orderResult.lastInsertRowid });
  } catch (err) {
    console.error('Create reservation error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
}

function updateReservationOrder(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const reservationOrderId = normalizeInteger(req.params?.reservationOrderId);

  try {
    if (!reservationOrderId) {
      return res.status(400).json({ message: 'شناسه رزرو معتبر نیست' });
    }

    const existingOrder = db.prepare(`
      SELECT id
      FROM inventory_reservation_orders
      WHERE id = ?
    `).get(reservationOrderId);

    if (!existingOrder) {
      return res.status(404).json({ message: 'رزرو پیدا نشد' });
    }

    const activeItems = db.prepare(`
      SELECT
        ri.id AS reservation_item_id,
        ri.unit_id,
        u.product_id,
        u.unit_number
      FROM inventory_reservation_items ri
      INNER JOIN inventory_units u ON u.id = ri.unit_id
      WHERE ri.reservation_order_id = ?
        AND ri.released_at IS NULL
      ORDER BY u.product_id ASC, u.unit_number ASC, ri.id ASC
    `).all(reservationOrderId);

    if (activeItems.length === 0) {
      return res.status(404).json({ message: 'رزرو فعالی برای ویرایش پیدا نشد' });
    }

    const customer = findOrCreateCustomer(req.body?.customer_id, req.body?.customer_name);
    const startDate = normalizeText(req.body?.start_date);
    const endDate = normalizeText(req.body?.end_date);
    const notes = normalizeText(req.body?.notes);
    const items = parseItems(req.body?.items);

    if (!startDate || !endDate || items.length === 0) {
      return res.status(400).json({ message: 'اطلاعات رزرو کامل نیست' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ message: 'تاریخ شروع باید قبل از تاریخ پایان باشد' });
    }

    const currentByProduct = new Map();
    activeItems.forEach((item) => {
      if (!currentByProduct.has(item.product_id)) {
        currentByProduct.set(item.product_id, []);
      }
      currentByProduct.get(item.product_id).push(item);
    });

    const requestedByProduct = new Map();
    items.forEach((item) => {
      const current = requestedByProduct.get(item.product_id) || 0;
      requestedByProduct.set(item.product_id, current + item.quantity);
    });

    const productIds = Array.from(new Set([
      ...currentByProduct.keys(),
      ...requestedByProduct.keys()
    ]));

    const allocationPlan = [];

    productIds.forEach((productId) => {
      const requestedQuantity = requestedByProduct.get(productId) || 0;
      const currentItemsForProduct = currentByProduct.get(productId) || [];

      const product = db.prepare(`
        SELECT id, name
        FROM inventory_products
        WHERE id = ?
      `).get(productId);

      if (!product) {
        const error = new Error('یکی از محصولات انتخاب‌شده پیدا نشد');
        error.statusCode = 404;
        throw error;
      }

      const availableUnits = db.prepare(`
        SELECT u.id, u.unit_number
        FROM inventory_units u
        WHERE u.product_id = ?
          AND u.is_active = 1
          AND NOT EXISTS (
            SELECT 1
            FROM inventory_reservation_items ri
            WHERE ri.unit_id = u.id
              AND ri.released_at IS NULL
              AND ri.reservation_order_id <> ?
          )
        ORDER BY u.unit_number ASC, u.id ASC
      `).all(productId, reservationOrderId);

      if (availableUnits.length < requestedQuantity) {
        const error = new Error(`موجودی آزاد برای محصول «${product.name}» کافی نیست`);
        error.statusCode = 400;
        throw error;
      }

      const selectedUnitIds = [];
      const selectedSet = new Set();

      currentItemsForProduct.forEach((item) => {
        if (selectedUnitIds.length >= requestedQuantity) return;
        if (!availableUnits.some((unit) => unit.id === item.unit_id)) return;
        selectedUnitIds.push(item.unit_id);
        selectedSet.add(item.unit_id);
      });

      availableUnits.forEach((unit) => {
        if (selectedUnitIds.length >= requestedQuantity) return;
        if (selectedSet.has(unit.id)) return;
        selectedUnitIds.push(unit.id);
        selectedSet.add(unit.id);
      });

      const keepItems = currentItemsForProduct.filter((item) => selectedSet.has(item.unit_id));
      const releaseItems = currentItemsForProduct.filter((item) => !selectedSet.has(item.unit_id));
      const addUnitIds = selectedUnitIds.filter((unitId) => !currentItemsForProduct.some((item) => item.unit_id === unitId));

      allocationPlan.push({
        keepItems,
        releaseItems,
        addUnitIds
      });
    });

    db.prepare(`
      UPDATE inventory_reservation_orders
      SET customer_id = ?, customer_name = ?, start_date = ?, end_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(customer.id, customer.name, startDate, endDate, notes, reservationOrderId);

    const releaseItemStatement = db.prepare(`
      UPDATE inventory_reservation_items
      SET released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    const insertItemStatement = db.prepare(`
      INSERT INTO inventory_reservation_items (reservation_order_id, unit_id, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    allocationPlan.forEach((plan) => {
      plan.releaseItems.forEach((item) => {
        releaseItemStatement.run(item.reservation_item_id);
      });

      plan.addUnitIds.forEach((unitId) => {
        insertItemStatement.run(reservationOrderId, unitId);
      });
    });

    res.json({ message: 'رزرو ویرایش شد' });
  } catch (err) {
    console.error('Update reservation order error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
}

function updateUnitAssignment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const unitId = normalizeInteger(req.params?.unitId);

  try {
    const customer = findOrCreateCustomer(req.body?.customer_id, req.body?.customer_name);
    const startDate = normalizeText(req.body?.start_date);
    const endDate = normalizeText(req.body?.end_date);
    const notes = normalizeText(req.body?.notes);
    const reservationItemId = normalizeInteger(req.body?.reservation_item_id);

    if (!unitId || !startDate || !endDate) {
      return res.status(400).json({ message: 'اطلاعات رزرو کامل نیست' });
    }

    if (startDate > endDate) {
      return res.status(400).json({ message: 'تاریخ شروع باید قبل از تاریخ پایان باشد' });
    }

    const unit = db.prepare(`
      SELECT u.id
      FROM inventory_units u
      WHERE u.id = ? AND u.is_active = 1
    `).get(unitId);
    if (!unit) {
      return res.status(404).json({ message: 'واحد محصول پیدا نشد' });
    }

    const conflict = db.prepare(`
      SELECT ri.id
      FROM inventory_reservation_items ri
      WHERE ri.unit_id = ?
        AND ri.released_at IS NULL
        ${reservationItemId ? 'AND ri.id <> ?' : ''}
    `).get(...(reservationItemId ? [unitId, reservationItemId] : [unitId]));

    if (conflict) {
      return res.status(400).json({ message: 'این واحد در بازه انتخابی قبلا رزرو شده است' });
    }

    if (!reservationItemId) {
      const orderResult = db.prepare(`
        INSERT INTO inventory_reservation_orders (customer_id, customer_name, start_date, end_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(customer.id, customer.name, startDate, endDate, notes);

      db.prepare(`
        INSERT INTO inventory_reservation_items (reservation_order_id, unit_id, created_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(orderResult.lastInsertRowid, unitId);

      return res.json({ message: 'رزرو واحد ثبت شد' });
    }

    const item = db.prepare(`
      SELECT id, reservation_order_id
      FROM inventory_reservation_items
      WHERE id = ? AND unit_id = ?
    `).get(reservationItemId, unitId);
    if (!item) {
      return res.status(404).json({ message: 'رکورد رزرو پیدا نشد' });
    }

    const siblingCount = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM inventory_reservation_items
      WHERE reservation_order_id = ?
    `).get(item.reservation_order_id)?.count) || 0;

    if (siblingCount <= 1) {
      db.prepare(`
        UPDATE inventory_reservation_orders
        SET customer_id = ?, customer_name = ?, start_date = ?, end_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(customer.id, customer.name, startDate, endDate, notes, item.reservation_order_id);
      return res.json({ message: 'رزرو واحد ویرایش شد' });
    }

    const orderResult = db.prepare(`
      INSERT INTO inventory_reservation_orders (customer_id, customer_name, start_date, end_date, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(customer.id, customer.name, startDate, endDate, notes);

    db.prepare(`
      UPDATE inventory_reservation_items
      SET reservation_order_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(orderResult.lastInsertRowid, reservationItemId);

    res.json({ message: 'رزرو واحد ویرایش شد' });
  } catch (err) {
    console.error('Update unit assignment error:', err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
}

function deleteUnitAssignment(req, res) {
  const unitId = normalizeInteger(req.params?.unitId);
  const reservationItemId = normalizeInteger(req.query?.reservationItemId);

  try {
    if (!unitId || !reservationItemId) {
      return res.status(400).json({ message: 'اطلاعات حذف رزرو کامل نیست' });
    }

    const item = db.prepare(`
      SELECT id, reservation_order_id
      FROM inventory_reservation_items
      WHERE id = ? AND unit_id = ?
    `).get(reservationItemId, unitId);

    if (!item) {
      return res.status(404).json({ message: 'رکورد رزرو پیدا نشد' });
    }

    db.prepare(`
      UPDATE inventory_reservation_items
      SET released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reservationItemId);

    res.json({ message: 'محصول آزاد شد' });
  } catch (err) {
    console.error('Delete unit assignment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function restoreUnitAssignment(req, res) {
  const unitId = normalizeInteger(req.params?.unitId);
  const reservationItemId = normalizeInteger(req.query?.reservationItemId);

  try {
    if (!unitId || !reservationItemId) {
      return res.status(400).json({ message: 'اطلاعات بازگردانی کامل نیست' });
    }

    const item = db.prepare(`
      SELECT id, reservation_order_id
      FROM inventory_reservation_items
      WHERE id = ? AND unit_id = ?
    `).get(reservationItemId, unitId);

    if (!item) {
      return res.status(404).json({ message: 'رکورد رزرو پیدا نشد' });
    }

    db.prepare(`
      UPDATE inventory_reservation_items
      SET released_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(reservationItemId);

    res.json({ message: 'محصول بازگردانی شد' });
  } catch (err) {
    console.error('Restore unit assignment error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function releaseReservationOrder(req, res) {
  const reservationOrderId = normalizeInteger(req.params?.reservationOrderId);

  try {
    if (!reservationOrderId) {
      return res.status(400).json({ message: 'شناسه رزرو معتبر نیست' });
    }

    const activeCount = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM inventory_reservation_items
      WHERE reservation_order_id = ? AND released_at IS NULL
    `).get(reservationOrderId)?.count) || 0;

    if (activeCount === 0) {
      return res.status(404).json({ message: 'رزرو فعالی برای آزادسازی پیدا نشد' });
    }

    db.prepare(`
      UPDATE inventory_reservation_items
      SET released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE reservation_order_id = ? AND released_at IS NULL
    `).run(reservationOrderId);

    res.json({ message: 'رزرو به‌طور کامل آزاد شد' });
  } catch (err) {
    console.error('Release reservation order error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function restoreReservationOrder(req, res) {
  const reservationOrderId = normalizeInteger(req.params?.reservationOrderId);

  try {
    if (!reservationOrderId) {
      return res.status(400).json({ message: 'شناسه رزرو معتبر نیست' });
    }

    const activeCount = Number(db.prepare(`
      SELECT COUNT(*) AS count
      FROM inventory_reservation_items
      WHERE reservation_order_id = ? AND released_at IS NULL
    `).get(reservationOrderId)?.count) || 0;

    if (activeCount > 0) {
      return res.status(400).json({ message: 'این رزرو از قبل فعال است' });
    }

    db.prepare(`
      UPDATE inventory_reservation_items
      SET released_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE reservation_order_id = ?
    `).run(reservationOrderId);

    res.json({ message: 'رزرو بازگردانی شد' });
  } catch (err) {
    console.error('Restore reservation order error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function releaseAllReservations(_req, res) {
  try {
    db.prepare(`
      UPDATE inventory_reservation_items
      SET released_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE released_at IS NULL
    `).run();

    res.json({ message: 'همه محصولات رزروشده آزاد شدند' });
  } catch (err) {
    console.error('Release all reservations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

function restoreAllReservations(_req, res) {
  try {
    db.prepare(`
      UPDATE inventory_reservation_items
      SET released_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE released_at IS NOT NULL
    `).run();

    res.json({ message: 'همه رزروها بازگردانی شدند' });
  } catch (err) {
    console.error('Restore all reservations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  getAvailabilityDashboard,
  getInventoryLookups,
  getActiveReservationOrders,
  getCategoryTree,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  createReservation,
  updateReservationOrder,
  updateUnitAssignment,
  deleteUnitAssignment,
  restoreUnitAssignment,
  releaseReservationOrder,
  restoreReservationOrder,
  releaseAllReservations,
  restoreAllReservations
};
