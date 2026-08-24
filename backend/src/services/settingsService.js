class SettingsError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'SettingsError';
    this.statusCode = statusCode;
  }
}

function minutesToTime(minutes) {
  const value = Number(minutes);
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function timeToMinutes(value) {
  const match = String(value || '').match(/^(\d{2}):(\d{2})$/);
  if (!match) throw new SettingsError('ساعت مرزی نامعتبر است');
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new SettingsError('ساعت مرزی نامعتبر است');
  return hours * 60 + minutes;
}

function createSettingsService(db) {
  function getSettings() {
    const row = db.prepare(`
      SELECT collection_name, timezone, billing_cutoff_minutes,
             list_number_prefix, invoice_number_prefix, updated_at
      FROM app_settings WHERE id = 1
    `).get();
    if (!row) throw new SettingsError('تنظیمات سیستم پیدا نشد', 404);
    return { ...row, billing_cutoff_time: minutesToTime(row.billing_cutoff_minutes) };
  }

  function updateBillingCutoff(time, actorUserId) {
    const before = getSettings();
    const cutoffMinutes = timeToMinutes(time);
    db.transaction(() => {
      db.prepare(`
        UPDATE app_settings
        SET billing_cutoff_minutes = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(cutoffMinutes, actorUserId);
      db.prepare(`
        INSERT INTO audit_logs (
          actor_user_id, entity_type, entity_id, action, before_json, after_json
        ) VALUES (?, 'APP_SETTINGS', '1', 'UPDATE_BILLING_CUTOFF', ?, ?)
      `).run(
        actorUserId,
        JSON.stringify({ billing_cutoff_minutes: before.billing_cutoff_minutes }),
        JSON.stringify({ billing_cutoff_minutes: cutoffMinutes })
      );
    })();
    return getSettings();
  }

  return { getSettings, updateBillingCutoff };
}

module.exports = { SettingsError, createSettingsService, timeToMinutes, minutesToTime };
