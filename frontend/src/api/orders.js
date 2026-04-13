import client from './client'

export const createOrder = (body) => client.post('/orders', body).then(r => r.data)
export const getOrderByToken = (token) => client.get(`/orders/${token}`).then(r => r.data)
export const applyPromo = (promo_code, subtotal) =>
  client.post('/orders/apply-promo', { promo_code, subtotal }).then(r => r.data)
export const getActivePromos = () => client.get('/orders/active-promos').then(r => r.data)
