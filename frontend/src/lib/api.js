import axios from 'axios'

// VITE_API_URL is the backend root (e.g. https://landreg-api.onrender.com).
// Append /api so every helper below can use short paths like /parcels/.
const _root = import.meta.env.VITE_API_URL || ''
const BASE_URL = _root ? `${_root.replace(/\/$/, '')}/api` : '/api'

const api = axios.create({ baseURL: BASE_URL })

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/token/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ── Convenience helpers ───────────────────────────────────────────────────────

export const users = {
  list: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.patch(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
  setPassword: (id, password) => api.post(`/users/${id}/set-password/`, { password }),
}

export const auth = {
  login: (username, password) =>
    axios.post(`${BASE_URL}/token/`, { username, password }),
  me: () => api.get('/me/'),
}

export const stats = {
  get: () => api.get('/stats/'),
}

export const owners = {
  list: (params) => api.get('/owners/', { params }),
  get: (id) => api.get(`/owners/${id}/`),
  create: (data) => api.post('/owners/', data),
  update: (id, data) => api.patch(`/owners/${id}/`, data),
  delete: (id) => api.delete(`/owners/${id}/`),
}

export const parcels = {
  list: (params) => api.get('/parcels/', { params }),
  get: (id) => api.get(`/parcels/${id}/`),
  create: (data) => api.post('/parcels/', data),
  update: (id, data) => api.patch(`/parcels/${id}/`, data),
  delete: (id) => api.delete(`/parcels/${id}/`),
}

export const deeds = {
  list: (params) => api.get('/deeds/', { params }),
  get: (id) => api.get(`/deeds/${id}/`),
  create: (data) => api.post('/deeds/', data),
  update: (id, data) => api.patch(`/deeds/${id}/`, data),
  delete: (id) => api.delete(`/deeds/${id}/`),
}

export const applications = {
  list: (params) => api.get('/applications/', { params }),
  get: (id) => api.get(`/applications/${id}/`),
  create: (data) => api.post('/applications/', data),
  update: (id, data) => api.patch(`/applications/${id}/`, data),
  submitStep1: (id, data) => api.patch(`/applications/${id}/submit-step1/`, data),
  submitStep2: (id, data) => api.patch(`/applications/${id}/submit-step2/`, data),
  submitStep3: (id, data) => api.patch(`/applications/${id}/submit-step3/`, data),
  delete: (id) => api.delete(`/applications/${id}/`),
}
