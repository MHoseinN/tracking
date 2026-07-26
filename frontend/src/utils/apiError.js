const CUSTOMER_MESSAGES = {
  'Customer with this phone already exists': 'کاربری با این شماره تماس قبلا ثبت شده است',
  'Customer with this name already exists': 'کاربری با این نام قبلا ثبت شده است'
};

export function getApiErrorMessage(error, fallback = 'خطایی در ارتباط با سرور رخ داد') {
  const serverMessage = error?.response?.data?.message;
  return CUSTOMER_MESSAGES[serverMessage] || serverMessage || error?.message || fallback;
}

export function isAuthError(error) {
  return [401, 403].includes(error?.response?.status);
}
