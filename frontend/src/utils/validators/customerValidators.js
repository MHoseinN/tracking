export function normalizePhone(value) {
  return String(value || '')
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[^\d+]/g, '');
}

export function getDuplicatePhoneError(phone, customers = [], currentCustomerId = null) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return '';

  const duplicate = customers.find((customer) => {
    if (String(customer.id) === String(currentCustomerId || '')) return false;
    return normalizePhone(customer.phone) === normalizedPhone;
  });

  return duplicate ? 'کاربری با این شماره تماس قبلا ثبت شده است' : '';
}

export function validateCustomerIdentity(form, options = {}) {
  const errors = { first_name: '', last_name: '', phone: '' };
  if (!String(form.first_name || '').trim()) errors.first_name = 'نام الزامی است';
  if (!String(form.last_name || '').trim()) errors.last_name = 'نام خانوادگی الزامی است';
  errors.phone = getDuplicatePhoneError(form.phone, options.existingCustomers, options.currentCustomerId);
  return errors;
}
