const { validationResult } = require('express-validator');
const db = require('../db/database');
const { SettingsError, createSettingsService } = require('../services/settingsService');

const settingsService = createSettingsService(db);

function handleError(error, res) {
  if (error instanceof SettingsError) return res.status(error.statusCode).json({ message: error.message });
  console.error('Settings error:', error);
  return res.status(500).json({ message: 'Server error' });
}

function getSettings(_req, res) {
  try { return res.json(settingsService.getSettings()); }
  catch (error) { return handleError(error, res); }
}

function updateBillingCutoff(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try { return res.json(settingsService.updateBillingCutoff(req.body.billing_cutoff_time, req.user.id)); }
  catch (error) { return handleError(error, res); }
}

function updateGeneralSettings(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try { return res.json(settingsService.updateGeneralSettings(req.body, req.user.id)); }
  catch (error) { return handleError(error, res); }
}

module.exports = { getSettings, updateBillingCutoff, updateGeneralSettings };
