const express = require('express');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const { backupDatabase } = require('../services/backupService');

const router = express.Router();

// All backup routes require authentication
router.use(authMiddleware);

// POST /api/backups/manual
router.post('/manual', async (req, res) => {
  try {
    const backupPath = await backupDatabase('manual-ui');
    res.status(201).json({
      message: 'Backup created successfully',
      fileName: path.basename(backupPath),
      backupPath
    });
  } catch (err) {
    console.error('Manual backup error:', err);
    res.status(500).json({ message: 'Backup failed' });
  }
});

module.exports = router;
