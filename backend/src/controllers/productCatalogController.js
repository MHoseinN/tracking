const { validationResult } = require('express-validator');
const db = require('../db/database');
const {
  ProductCatalogError,
  createProductCatalogService
} = require('../services/productCatalogService');
const { createProductPriceVersionPdfService } = require('../services/productPriceVersionPdfService');

const catalogService = createProductCatalogService(db);
const priceVersionPdfService = createProductPriceVersionPdfService(db, catalogService);

function hasValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ errors: errors.array() });
  return true;
}

function handleError(error, res) {
  if (error instanceof ProductCatalogError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error('Product catalog error:', error);
  return res.status(500).json({ message: 'Server error' });
}

function getCatalog(_req, res) {
  try {
    return res.json(catalogService.getCatalog());
  } catch (error) {
    return handleError(error, res);
  }
}

function createCategory(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.status(201).json(catalogService.createCategory(req.body));
  } catch (error) {
    return handleError(error, res);
  }
}

function updateCategory(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.json(catalogService.updateCategory(req.params.id, req.body));
  } catch (error) {
    return handleError(error, res);
  }
}

function deleteCategory(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.json(catalogService.deleteCategory(req.params.id));
  } catch (error) {
    return handleError(error, res);
  }
}

function createProduct(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.status(201).json(catalogService.createProduct(req.body, req.user.id));
  } catch (error) {
    return handleError(error, res);
  }
}

function updateProduct(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.json(catalogService.updateProduct(req.params.id, req.body, req.user.id));
  } catch (error) {
    return handleError(error, res);
  }
}

function deleteProduct(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.json(catalogService.deleteProduct(req.params.id));
  } catch (error) {
    return handleError(error, res);
  }
}

function getPriceHistory(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.json({ history: catalogService.getPriceHistory(req.params.id) });
  } catch (error) {
    return handleError(error, res);
  }
}

function listPriceVersions(_req, res) {
  try {
    return res.json({ versions: catalogService.listPriceVersions() });
  } catch (error) {
    return handleError(error, res);
  }
}

function getPriceVersion(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.json(catalogService.getPriceVersion(req.params.versionId));
  } catch (error) {
    return handleError(error, res);
  }
}

function createPriceVersion(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    return res.status(201).json(catalogService.createPriceVersion(req.body, req.user.id));
  } catch (error) {
    return handleError(error, res);
  }
}

async function downloadPriceVersionPdf(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const result = await priceVersionPdfService.generate(req.params.versionId);
    if (req.query.transport === 'base64') {
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        filename: result.filename,
        content_type: 'application/pdf',
        data_base64: result.buffer.toString('base64')
      });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    return res.send(result.buffer);
  } catch (error) {
    return handleError(error, res);
  }
}

module.exports = {
  getCatalog,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  getPriceHistory,
  listPriceVersions,
  getPriceVersion,
  createPriceVersion,
  downloadPriceVersionPdf
};
