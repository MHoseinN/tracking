const db = require('../db/database');
const { createReportService } = require('../services/reportService');

const reportService = createReportService(db);

function getOverview(req, res) {
  try {
    const rawYear = String(req.query.persian_year || '').trim();
    const persianYear = rawYear && rawYear !== 'all' ? Number(rawYear) : null;
    return res.json(reportService.getOverview({ persianYear }));
  } catch (error) {
    const isValidationError = String(error.message || '').includes('سال شمسی');
    console.error('Get report overview error:', error);
    return res.status(isValidationError ? 400 : 500).json({
      message: isValidationError ? error.message : 'خطا در دریافت گزارش‌ها'
    });
  }
}

module.exports = { getOverview };
