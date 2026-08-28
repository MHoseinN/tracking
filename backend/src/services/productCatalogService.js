class ProductCatalogError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ProductCatalogError';
    this.statusCode = statusCode;
  }
}

function normalizeNullableId(value) {
  return value === null || value === undefined || value === '' ? null : Number(value);
}

function serializeProduct(product) {
  return {
    ...product,
    is_active: Boolean(product.is_active)
  };
}

function serializeCategory(category) {
  return {
    ...category,
    is_active: Boolean(category.is_active)
  };
}

function serializePriceVersion(version) {
  return {
    ...version,
    version_number: Number(version.version_number),
    product_count: Number(version.product_count || 0),
    changed_product_count: Number(version.changed_product_count || 0)
  };
}

function buildCategoryTree(categories) {
  const nodes = new Map(categories.map((category) => [category.id, { ...category, children: [] }]));
  const roots = [];

  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function createProductCatalogService(db) {
  const productColumns = `
    SELECT products.id, products.name, products.category_id,
           products.daily_price_toman, products.notes, products.is_active,
           products.created_at, products.updated_at,
           product_categories.name AS category_name
    FROM products
    LEFT JOIN product_categories ON product_categories.id = products.category_id
  `;

  function listCategories() {
    return db.prepare(`
      SELECT id, name, slug, parent_id, is_active, created_at, updated_at
      FROM product_categories
      WHERE deleted_at IS NULL
      ORDER BY name COLLATE NOCASE, id
    `).all().map(serializeCategory);
  }

  function listProducts() {
    return db.prepare(`
      ${productColumns}
      WHERE products.deleted_at IS NULL
      ORDER BY products.name COLLATE NOCASE, products.id
    `).all().map(serializeProduct);
  }

  function getCatalog() {
    const categories = listCategories();
    return {
      products: listProducts(),
      categories,
      category_tree: buildCategoryTree(categories)
    };
  }

  function getProduct(id) {
    const product = db.prepare(`
      ${productColumns}
      WHERE products.id = ? AND products.deleted_at IS NULL
    `).get(id);
    if (!product) throw new ProductCatalogError('Product not found', 404);
    return product;
  }

  function getCategory(id) {
    const category = db.prepare(`
      SELECT id, name, slug, parent_id, is_active, created_at, updated_at
      FROM product_categories
      WHERE id = ? AND deleted_at IS NULL
    `).get(id);
    if (!category) throw new ProductCatalogError('Category not found', 404);
    return category;
  }

  function slugify(value) {
    const slug = String(value || '').trim().toLowerCase()
      .replace(/[\u200c\u200f]/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-');
    return slug || `category-${Date.now()}`;
  }

  function ensureUniqueCategoryName(name, parentId, excludeId = null) {
    const duplicate = db.prepare(`
      SELECT id
      FROM product_categories
      WHERE deleted_at IS NULL
        AND LOWER(TRIM(name)) = LOWER(TRIM(?))
        AND COALESCE(parent_id, 0) = COALESCE(?, 0)
        AND (? IS NULL OR id <> ?)
    `).get(name, parentId, excludeId, excludeId);
    if (duplicate) throw new ProductCatalogError('Category name already exists in this branch', 409);
  }

  function ensureValidParent(categoryId, parentId) {
    if (!parentId) return;
    getCategory(parentId);
    if (Number(categoryId) === Number(parentId)) {
      throw new ProductCatalogError('Category cannot be its own parent');
    }

    if (categoryId) {
      const cycle = db.prepare(`
        WITH RECURSIVE ancestors(id, parent_id) AS (
          SELECT id, parent_id FROM product_categories WHERE id = ? AND deleted_at IS NULL
          UNION ALL
          SELECT parent.id, parent.parent_id
          FROM product_categories parent
          JOIN ancestors child ON parent.id = child.parent_id
          WHERE parent.deleted_at IS NULL
        )
        SELECT id FROM ancestors WHERE id = ? LIMIT 1
      `).get(parentId, categoryId);
      if (cycle) throw new ProductCatalogError('Category hierarchy cannot contain a cycle');
    }
  }

  function createCategory({ name, parent_id }) {
    const parentId = normalizeNullableId(parent_id);
    ensureValidParent(null, parentId);
    ensureUniqueCategoryName(name, parentId);
    const result = db.prepare(`
      INSERT INTO product_categories (name, slug, parent_id, is_active, updated_at)
      VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP)
    `).run(String(name).trim(), slugify(name), parentId);
    return serializeCategory(getCategory(result.lastInsertRowid));
  }

  function updateCategory(id, { name, parent_id, is_active }) {
    const current = getCategory(id);
    const parentId = parent_id === undefined ? current.parent_id : normalizeNullableId(parent_id);
    const normalizedName = name === undefined ? current.name : String(name).trim();
    const isActive = is_active === undefined ? current.is_active : Number(Boolean(is_active));
    ensureValidParent(id, parentId);
    ensureUniqueCategoryName(normalizedName, parentId, Number(id));
    db.prepare(`
      UPDATE product_categories
      SET name = ?, slug = ?, parent_id = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(normalizedName, slugify(normalizedName), parentId, isActive, id);
    return serializeCategory(getCategory(id));
  }

  function deleteCategory(id) {
    getCategory(id);
    const child = db.prepare(`
      SELECT id FROM product_categories
      WHERE parent_id = ? AND deleted_at IS NULL LIMIT 1
    `).get(id);
    if (child) throw new ProductCatalogError('Category has child categories', 409);

    const product = db.prepare(`
      SELECT id FROM products
      WHERE category_id = ? AND deleted_at IS NULL LIMIT 1
    `).get(id);
    if (product) throw new ProductCatalogError('Category has products', 409);

    db.prepare(`
      UPDATE product_categories
      SET is_active = 0, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    return { id: Number(id) };
  }

  const insertProduct = db.transaction((payload, changedByUserId) => {
    const categoryId = normalizeNullableId(payload.category_id);
    if (categoryId) getCategory(categoryId);
    const result = db.prepare(`
      INSERT INTO products (
        name, category_id, daily_price_toman, notes, is_active, updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      String(payload.name).trim(),
      categoryId,
      Number(payload.daily_price_toman),
      payload.notes || null,
      payload.is_active === false ? 0 : 1
    );

    db.prepare(`
      INSERT INTO product_price_history (
        product_id, daily_price_toman, changed_by_user_id, reason
      ) VALUES (?, ?, ?, ?)
    `).run(
      result.lastInsertRowid,
      Number(payload.daily_price_toman),
      changedByUserId,
      payload.price_change_reason || 'قیمت اولیه محصول'
    );

    return result.lastInsertRowid;
  });

  function createProduct(payload, changedByUserId) {
    const id = insertProduct(payload, changedByUserId);
    return serializeProduct(getProduct(id));
  }

  const updateProductTransaction = db.transaction((id, payload, changedByUserId) => {
    const current = getProduct(id);
    const categoryId = payload.category_id === undefined
      ? current.category_id
      : normalizeNullableId(payload.category_id);
    if (categoryId) getCategory(categoryId);

    const nextPrice = payload.daily_price_toman === undefined
      ? current.daily_price_toman
      : Number(payload.daily_price_toman);
    db.prepare(`
      UPDATE products
      SET name = ?, category_id = ?, daily_price_toman = ?, notes = ?,
          is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      payload.name === undefined ? current.name : String(payload.name).trim(),
      categoryId,
      nextPrice,
      payload.notes === undefined ? current.notes : (payload.notes || null),
      payload.is_active === undefined ? Number(current.is_active) : Number(Boolean(payload.is_active)),
      id
    );

    if (nextPrice !== Number(current.daily_price_toman)) {
      db.prepare(`
        INSERT INTO product_price_history (
          product_id, daily_price_toman, changed_by_user_id, reason
        ) VALUES (?, ?, ?, ?)
      `).run(id, nextPrice, changedByUserId, payload.price_change_reason || null);
    }
  });

  function updateProduct(id, payload, changedByUserId) {
    updateProductTransaction(id, payload, changedByUserId);
    return serializeProduct(getProduct(id));
  }

  function deleteProduct(id) {
    getProduct(id);
    db.prepare(`
      UPDATE products
      SET is_active = 0, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
    return { id: Number(id) };
  }

  function getPriceHistory(productId) {
    getProduct(productId);
    return db.prepare(`
      SELECT history.id, history.product_id, history.daily_price_toman,
             history.effective_from, history.reason, history.changed_by_user_id,
             history.price_version_id,
             users.display_name AS changed_by_name
      FROM product_price_history history
      LEFT JOIN users ON users.id = history.changed_by_user_id
      WHERE history.product_id = ?
      ORDER BY history.effective_from DESC, history.id DESC
    `).all(productId);
  }

  function listPriceVersions() {
    return db.prepare(`
      SELECT versions.id, versions.version_number, versions.name,
             versions.effective_from, versions.notes, versions.created_at,
             versions.created_by_user_id,
             COALESCE(users.display_name, users.username) AS created_by_name,
             COUNT(items.id) AS product_count,
             COALESCE(SUM(CASE WHEN items.previous_price_toman <> items.new_price_toman THEN 1 ELSE 0 END), 0)
               AS changed_product_count
      FROM product_price_versions versions
      LEFT JOIN product_price_version_items items ON items.price_version_id = versions.id
      LEFT JOIN users ON users.id = versions.created_by_user_id
      GROUP BY versions.id
      ORDER BY versions.version_number DESC
    `).all().map(serializePriceVersion);
  }

  function getPriceVersion(id) {
    const version = db.prepare(`
      SELECT versions.id, versions.version_number, versions.name,
             versions.effective_from, versions.notes, versions.created_at,
             versions.created_by_user_id,
             COALESCE(users.display_name, users.username) AS created_by_name,
             COUNT(items.id) AS product_count,
             COALESCE(SUM(CASE WHEN items.previous_price_toman <> items.new_price_toman THEN 1 ELSE 0 END), 0)
               AS changed_product_count
      FROM product_price_versions versions
      LEFT JOIN product_price_version_items items ON items.price_version_id = versions.id
      LEFT JOIN users ON users.id = versions.created_by_user_id
      WHERE versions.id = ?
      GROUP BY versions.id
    `).get(id);
    if (!version) throw new ProductCatalogError('نسخه قیمت پیدا نشد', 404);

    const items = db.prepare(`
      SELECT id, price_version_id, product_id, product_name_snapshot,
             category_name_snapshot, previous_price_toman, new_price_toman,
             CASE WHEN previous_price_toman <> new_price_toman THEN 1 ELSE 0 END AS price_changed
      FROM product_price_version_items
      WHERE price_version_id = ?
      ORDER BY product_name_snapshot COLLATE NOCASE, id
    `).all(id).map((item) => ({ ...item, price_changed: Boolean(item.price_changed) }));

    return { ...serializePriceVersion(version), items };
  }

  const createPriceVersionTransaction = db.transaction((payload, changedByUserId) => {
    const products = listProducts();
    if (!products.length) throw new ProductCatalogError('برای ساخت نسخه قیمت حداقل یک محصول لازم است');

    const requestedItems = Array.isArray(payload.items) ? payload.items : [];
    const priceByProductId = new Map();
    requestedItems.forEach((item) => {
      const productId = Number(item.product_id);
      const newPrice = Number(item.new_price_toman);
      if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(newPrice) || newPrice < 0) {
        throw new ProductCatalogError('اطلاعات قیمت محصولات معتبر نیست');
      }
      if (priceByProductId.has(productId)) throw new ProductCatalogError('هر محصول فقط یک بار باید در نسخه قیمت باشد');
      priceByProductId.set(productId, newPrice);
    });

    const validProductIds = new Set(products.map((product) => Number(product.id)));
    for (const productId of priceByProductId.keys()) {
      if (!validProductIds.has(productId)) throw new ProductCatalogError('یکی از محصولات نسخه قیمت پیدا نشد', 404);
    }

    const nextVersionNumber = Number(db.prepare(`
      SELECT COALESCE(MAX(version_number), 0) + 1 AS value
      FROM product_price_versions
    `).get().value);
    const effectiveFrom = payload.effective_from || new Date().toISOString();
    const versionResult = db.prepare(`
      INSERT INTO product_price_versions (
        version_number, name, effective_from, notes, created_by_user_id
      ) VALUES (?, ?, ?, ?, ?)
    `).run(
      nextVersionNumber,
      String(payload.name || `نسخه ${nextVersionNumber}`).trim(),
      effectiveFrom,
      payload.notes ? String(payload.notes).trim() : null,
      changedByUserId
    );
    const versionId = Number(versionResult.lastInsertRowid);
    const insertItem = db.prepare(`
      INSERT INTO product_price_version_items (
        price_version_id, product_id, product_name_snapshot, category_name_snapshot,
        previous_price_toman, new_price_toman
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    const updateProductPrice = db.prepare(`
      UPDATE products
      SET daily_price_toman = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `);
    const insertHistory = db.prepare(`
      INSERT INTO product_price_history (
        product_id, daily_price_toman, changed_by_user_id, reason, price_version_id
      ) VALUES (?, ?, ?, ?, ?)
    `);

    products.forEach((product) => {
      const previousPrice = Number(product.daily_price_toman || 0);
      const newPrice = priceByProductId.has(Number(product.id))
        ? priceByProductId.get(Number(product.id))
        : previousPrice;
      insertItem.run(
        versionId, product.id, product.name, product.category_name || null,
        previousPrice, newPrice
      );
      if (newPrice !== previousPrice) {
        updateProductPrice.run(newPrice, product.id);
        insertHistory.run(product.id, newPrice, changedByUserId, String(payload.name).trim(), versionId);
      }
    });

    return versionId;
  });

  function createPriceVersion(payload, changedByUserId) {
    return getPriceVersion(createPriceVersionTransaction(payload, changedByUserId));
  }

  return {
    getCatalog,
    listProducts,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    getPriceHistory,
    listPriceVersions,
    getPriceVersion,
    createPriceVersion
  };
}

module.exports = {
  ProductCatalogError,
  buildCategoryTree,
  createProductCatalogService
};
