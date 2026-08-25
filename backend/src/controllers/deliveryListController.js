const { validationResult } = require('express-validator');
const db = require('../db/database');
const {
  DeliveryListDraftError,
  createDeliveryListDraftService
} = require('../services/deliveryListDraftService');
const { createDeliveryInvoiceService } = require('../services/deliveryInvoiceService');
const { createDeliverySettlementService } = require('../services/deliverySettlementService');
const { createInvoicePdfService } = require('../services/invoicePdfService');

const draftService = createDeliveryListDraftService(db);
const invoiceService = createDeliveryInvoiceService(db);
const settlementService = createDeliverySettlementService(db);
const invoicePdfService = createInvoicePdfService(db);

function hasValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ errors: errors.array() });
  return true;
}

function handleError(error, res) {
  if (error instanceof DeliveryListDraftError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  console.error('Delivery list draft error:', error);
  return res.status(500).json({ message: 'Server error' });
}

function listDrafts(_req, res) {
  try { return res.json({ drafts: draftService.listDrafts() }); }
  catch (error) { return handleError(error, res); }
}

function listDeliveryLists(_req, res) {
  try { return res.json({ lists: draftService.listDeliveryLists() }); }
  catch (error) { return handleError(error, res); }
}

function getList(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(draftService.getList(req.params.id)); }
  catch (error) { return handleError(error, res); }
}

function finalizeDraft(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(draftService.finalizeDraft(req.params.id, req.body.version, req.user.id)); }
  catch (error) { return handleError(error, res); }
}

function recordReturn(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.status(201).json(draftService.recordReturn(req.params.id, req.body, req.user.id)); }
  catch (error) { return handleError(error, res); }
}

function getInvoicePreview(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(invoiceService.getPreview(req.params.id)); }
  catch (error) { return handleError(error, res); }
}

function issueInvoice(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const invoice = invoiceService.issueInvoice(req.params.id, req.body, req.user.id);
    return res.status(201).json({ invoice, list: draftService.getList(req.params.id) });
  } catch (error) { return handleError(error, res); }
}

function getIssuedInvoice(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(invoiceService.getInvoice(req.params.id, req.params.invoiceId)); }
  catch (error) { return handleError(error, res); }
}

function updateIssuedInvoice(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const invoice = invoiceService.updateInvoice(
      req.params.id,
      req.params.invoiceId,
      req.body,
      req.user.id
    );
    return res.json({ invoice, list: draftService.getList(req.params.id) });
  } catch (error) { return handleError(error, res); }
}

function updateInvoiceSendStatus(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const invoice = invoiceService.updateSendStatus(
      req.params.id,
      req.params.invoiceId,
      req.body,
      req.user.id
    );
    return res.json({ invoice, list: draftService.getList(req.params.id) });
  } catch (error) { return handleError(error, res); }
}

function getSettlement(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(settlementService.getSummary(req.params.id)); }
  catch (error) { return handleError(error, res); }
}

function recordPayment(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.status(201).json(settlementService.recordPayment(req.params.id, req.body, req.user.id)); }
  catch (error) { return handleError(error, res); }
}

function voidPayment(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(settlementService.voidPayment(req.params.id, req.params.paymentId, req.user.id)); }
  catch (error) { return handleError(error, res); }
}

async function downloadInvoicePdf(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const result = await invoicePdfService.generate(req.params.id, req.params.invoiceId);

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
  } catch (error) { return handleError(error, res); }
}

function createDraft(req, res) {
  try { return res.status(201).json(draftService.createDraft(req.user.id)); }
  catch (error) { return handleError(error, res); }
}

function saveDraft(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(draftService.saveDraft(req.params.id, req.body)); }
  catch (error) { return handleError(error, res); }
}

function deleteDraft(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(draftService.deleteDraft(req.params.id)); }
  catch (error) { return handleError(error, res); }
}

module.exports = {
  listDeliveryLists,
  listDrafts,
  getList,
  createDraft,
  saveDraft,
  deleteDraft,
  finalizeDraft,
  recordReturn,
  getInvoicePreview,
  issueInvoice,
  getIssuedInvoice,
  updateIssuedInvoice,
  updateInvoiceSendStatus,
  getSettlement,
  recordPayment,
  voidPayment,
  downloadInvoicePdf
};
