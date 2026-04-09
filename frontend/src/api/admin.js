import client from './client'

export const login = (email, password) =>
  client.post('/admin/login', { email, password }).then(r => r.data)

export const refreshToken = () =>
  client.post('/admin/refresh', {}, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const getServiceStatus = () =>
  client.get('/admin/service').then(r => r.data)

export const setServiceStatus = (open) =>
  client.patch('/admin/service', { open }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

// ── Catégories ───────────────────────────────────────────────────────────────
export const getAdminCategories = () =>
  client.get('/admin/categories', {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const createCategory = (data) =>
  client.post('/admin/categories', data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const updateCategory = (id, data) =>
  client.put(`/admin/categories/${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const deleteCategory = (id) =>
  client.delete(`/admin/categories/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

// ── Catalogue ────────────────────────────────────────────────────────────────
export const getAdminProducts = () =>
  client.get('/admin/products', {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const createProduct = (data) =>
  client.post('/admin/products', data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const updateProduct = (id, data) =>
  client.put(`/admin/products/${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const deleteProduct = (id) =>
  client.delete(`/admin/products/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const toggleProduct = (id, available) =>
  client.patch(`/admin/products/${id}/available`, { available }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const uploadProductImage = (id, file) => {
  const formData = new FormData()
  formData.append('image', file)
  return client.post(`/admin/products/${id}/image`, formData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
      'Content-Type': 'multipart/form-data',
    },
  }).then(r => r.data)
}

export const deleteProductImage = (id) =>
  client.delete(`/admin/products/${id}/image`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const createOption = (productId, data) =>
  client.post(`/admin/products/${productId}/options`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const updateOption = (productId, optionId, data) =>
  client.put(`/admin/products/${productId}/options/${optionId}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const deleteOption = (productId, optionId) =>
  client.delete(`/admin/products/${productId}/options/${optionId}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const getAdminFormulas = () =>
  client.get('/admin/formulas', {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const createFormula = (data) =>
  client.post('/admin/formulas', data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const updateFormula = (id, data) =>
  client.put(`/admin/formulas/${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const deleteFormula = (id) =>
  client.delete(`/admin/formulas/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const toggleFormula = (id, available) =>
  client.patch(`/admin/formulas/${id}/available`, { available }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const uploadFormulaImage = (id, file) => {
  const formData = new FormData()
  formData.append('image', file)
  return client.post(`/admin/formulas/${id}/image`, formData, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
      'Content-Type': 'multipart/form-data',
    },
  }).then(r => r.data)
}

export const deleteFormulaImage = (id) =>
  client.delete(`/admin/formulas/${id}/image`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const getStats = () =>
  client.get('/admin/stats', {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const getOrders = (params) =>
  client.get('/admin/orders', {
    params,
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const getOrderById = (id) =>
  client.get(`/admin/orders/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const updateOrderStatus = (id, status) =>
  client.patch(`/admin/orders/${id}/status`, { status }, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

// ── Codes promo ───────────────────────────────────────────────────────────────
export const getPromoCodes = () =>
  client.get('/admin/promo-codes', {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const createPromoCode = (data) =>
  client.post('/admin/promo-codes', data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const updatePromoCode = (id, data) =>
  client.put(`/admin/promo-codes/${id}`, data, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)

export const deletePromoCode = (id) =>
  client.delete(`/admin/promo-codes/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` },
  }).then(r => r.data)
