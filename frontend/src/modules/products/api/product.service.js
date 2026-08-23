import api from '../../../utils/api';

export const productService = {
  getCatalog() { return api.get('/products'); },
  createProduct(payload) { return api.post('/products', payload); },
  updateProduct(id, payload) { return api.put(`/products/${id}`, payload); },
  deleteProduct(id) { return api.delete(`/products/${id}`); },
  getPriceHistory(id) { return api.get(`/products/${id}/price-history`); },
  createCategory(payload) { return api.post('/products/categories', payload); },
  updateCategory(id, payload) { return api.put(`/products/categories/${id}`, payload); },
  deleteCategory(id) { return api.delete(`/products/categories/${id}`); }
};
