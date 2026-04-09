import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Intercepteur de réponse : si le token est expiré ou invalide (401),
// on supprime le token local et on recharge la page pour retourner au login
client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && localStorage.getItem('admin_token')) {
      localStorage.removeItem('admin_token')
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

export default client
