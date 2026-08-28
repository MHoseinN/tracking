import api from '../../../utils/api';

export const productService = {
  getCatalog() { return api.get('/products'); },
  createProduct(payload) { return api.post('/products', payload); },
  updateProduct(id, payload) { return api.put(`/products/${id}`, payload); },
  deleteProduct(id) { return api.delete(`/products/${id}`); },
  getPriceHistory(id) { return api.get(`/products/${id}/price-history`); },
  getPriceVersions() { return api.get('/products/price-versions'); },
  getPriceVersion(id) { return api.get(`/products/price-versions/${id}`); },
  createPriceVersion(payload) { return api.post('/products/price-versions', payload); },
  async downloadPriceVersionPdf(id) {
    const response = await api.get(`/products/price-versions/${id}/pdf`, {
      params: { transport: 'base64' }
    });
    const payload = response.data || {};
    if (!payload.data_base64) throw new Error('پاسخ PDF از سرور خالی است');
    let binary;
    try {
      binary = atob(payload.data_base64);
    } catch (_error) {
      throw new Error('داده PDF دریافت‌شده قابل خواندن نیست');
    }
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return {
      data: new Blob([bytes], { type: payload.content_type || 'application/pdf' }),
      filename: payload.filename || `price-version-${id}.pdf`
    };
  },
  createCategory(payload) { return api.post('/products/categories', payload); },
  updateCategory(id, payload) { return api.put(`/products/categories/${id}`, payload); },
  deleteCategory(id) { return api.delete(`/products/categories/${id}`); }
};
