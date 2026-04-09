import client from './client'

export const getCatalog = () => client.get('/products').then(r => r.data)
export const getFormulas = () => client.get('/formulas').then(r => r.data)
