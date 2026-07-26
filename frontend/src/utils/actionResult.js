import { getApiErrorMessage } from './apiError';

export async function withActionResult(action, fallback) {
  try {
    const response = await action();
    return { success: true, data: response?.data };
  } catch (error) {
    return { success: false, message: getApiErrorMessage(error, fallback) };
  }
}
