const { validationResult } = require('express-validator');
const crypto = require('crypto');
const db = require('../db/database');
const {
  DeliveryListDraftError,
  createDeliveryListDraftService
} = require('../services/deliveryListDraftService');
const { createDeliveryInvoiceService } = require('../services/deliveryInvoiceService');
const { createDeliverySettlementService } = require('../services/deliverySettlementService');
const { createInvoicePdfService } = require('../services/invoicePdfService');
const deliveryListEvents = require('../services/deliveryListEventService');

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

function listDeliveryLists(req, res) {
  try {
    const lists = draftService.listDeliveryLists();
    const etag = `"${crypto.createHash('sha1').update(JSON.stringify(lists)).digest('base64url')}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, no-cache');
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    return res.json({ lists });
  }
  catch (error) { return handleError(error, res); }
}

function subscribeDeliveryListEvents(req, res) {
  return deliveryListEvents.subscribe(req, res);
}

function getList(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(draftService.getList(req.params.id)); }
  catch (error) { return handleError(error, res); }
}

function finalizeDraft(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const result = draftService.finalizeDraft(req.params.id, req.body.version, req.user.id);
    deliveryListEvents.publish({ action: 'FINALIZED', list_id: Number(req.params.id) });
    return res.json(result);
  }
  catch (error) { return handleError(error, res); }
}

function recordReturn(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const result = draftService.recordReturn(req.params.id, req.body, req.user.id);
    deliveryListEvents.publish({ action: 'RETURN_RECORDED', list_id: Number(req.params.id) });
    return res.status(201).json(result);
  }
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
    deliveryListEvents.publish({ action: 'INVOICE_ISSUED', list_id: Number(req.params.id) });
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
    deliveryListEvents.publish({ action: 'INVOICE_UPDATED', list_id: Number(req.params.id) });
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
    deliveryListEvents.publish({ action: 'INVOICE_SEND_UPDATED', list_id: Number(req.params.id) });
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
  try {
    const result = settlementService.recordPayment(req.params.id, req.body, req.user.id);
    deliveryListEvents.publish({ action: 'PAYMENT_RECORDED', list_id: Number(req.params.id) });
    return res.status(201).json(result);
  }
  catch (error) { return handleError(error, res); }
}

function voidPayment(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const result = settlementService.voidPayment(req.params.id, req.params.paymentId, req.user.id);
    deliveryListEvents.publish({ action: 'PAYMENT_VOIDED', list_id: Number(req.params.id) });
    return res.json(result);
  }
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
  try {
    const result = draftService.createDraft(req.user.id);
    deliveryListEvents.publish({ action: 'DRAFT_CREATED', list_id: Number(result.id) });
    return res.status(201).json(result);
  }
  catch (error) { return handleError(error, res); }
}

function saveDraft(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const result = draftService.saveDraft(req.params.id, req.body);
    deliveryListEvents.publish({ action: 'DRAFT_UPDATED', list_id: Number(req.params.id) });
    return res.json(result);
  }
  catch (error) { return handleError(error, res); }
}

function deleteDraft(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try { return res.json(draftService.deleteDraft(req.params.id)); }
  catch (error) { return handleError(error, res); }
}

function archiveList(req, res) {
  if (hasValidationErrors(req, res)) return undefined;
  try {
    const result = draftService.archiveList(req.params.id, req.user.id);
    deliveryListEvents.publish({ action: 'LIST_ARCHIVED', list_id: Number(req.params.id) });
    return res.json(result);
  }
  catch (error) { return handleError(error, res); }
}

module.exports = {
  listDeliveryLists,
  subscribeDeliveryListEvents,
  listDrafts,
  getList,
  createDraft,
  saveDraft,
  deleteDraft,
  archiveList,
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
