const { validationResult } = require('express-validator');
const db = require('../db/database');
const {
  DeliveryListDraftError,
  createDeliveryListDraftService
} = require('../services/deliveryListDraftService');

const draftService = createDeliveryListDraftService(db);

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
  finalizeDraft
};
