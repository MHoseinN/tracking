const { validationResult } = require('express-validator');
const db = require('../db/database');
const { AdminServiceError, createAdminService } = require('../services/adminService');

const adminService = createAdminService(db);

function sendValidationErrors(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ errors: errors.array() });
  return true;
}

function handleAdminError(error, res) {
  if (error instanceof AdminServiceError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error('Admin management error:', error);
  return res.status(500).json({ message: 'Server error' });
}

function listAdmins(_req, res) {
  try {
    return res.json({ users: adminService.listInternalUsers() });
  } catch (error) {
    return handleAdminError(error, res);
  }
}

function createAdmin(req, res) {
  if (sendValidationErrors(req, res)) return undefined;
  try {
    return res.status(201).json({ user: adminService.createAdmin(req.body) });
  } catch (error) {
    return handleAdminError(error, res);
  }
}

function updateAdmin(req, res) {
  if (sendValidationErrors(req, res)) return undefined;
  try {
    return res.json({ user: adminService.updateAdmin(req.params.id, req.body) });
  } catch (error) {
    return handleAdminError(error, res);
  }
}

function updateAdminStatus(req, res) {
  if (sendValidationErrors(req, res)) return undefined;
  try {
    return res.json({
      user: adminService.setAdminStatus(req.params.id, req.body.is_active)
    });
  } catch (error) {
    return handleAdminError(error, res);
  }
}

function deleteAdmin(req, res) {
  if (sendValidationErrors(req, res)) return undefined;
  try {
    return res.json({
      deleted: adminService.deleteAdmin(req.params.id),
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    return handleAdminError(error, res);
  }
}

module.exports = {
  listAdmins,
  createAdmin,
  updateAdmin,
  updateAdminStatus,
  deleteAdmin
};
