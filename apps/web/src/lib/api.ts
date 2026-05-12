import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
          localStorage.setItem('access_token', data.accessToken)
          localStorage.setItem('refresh_token', data.refreshToken)
          error.config.headers.Authorization = `Bearer ${data.accessToken}`
          return api(error.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
}

// ── Appels d'Offres ──────────────────────────────────────────────────────────
export const aoApi = {
  list: (params?: any) => api.get('/appels-offres', { params }),
  stats: () => api.get('/appels-offres/stats'),
  pipeline: () => api.get('/appels-offres/pipeline'),
  tendance: () => api.get('/appels-offres/tendance'),
  parSecteur: () => api.get('/appels-offres/par-secteur'),
  get: (id: string) => api.get(`/appels-offres/${id}`),
  create: (data: any) => api.post('/appels-offres', data),
  update: (id: string, data: any) => api.put(`/appels-offres/${id}`, data),
  updateStatus: (id: string, status: string, motif?: string) =>
    api.patch(`/appels-offres/${id}/status`, { status, motif }),
  delete: (id: string) => api.delete(`/appels-offres/${id}`),
}

// ── Contacts ─────────────────────────────────────────────────────────────────
export const contactsApi = {
  list: (params?: any) => api.get('/contacts', { params }),
  stats: () => api.get('/contacts/stats'),
  get: (id: string) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  addInteraction: (id: string, data: any) => api.post(`/contacts/${id}/interactions`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
}

export const entitesApi = {
  list: (search?: string) => api.get('/entites', { params: search ? { search } : undefined }),
  create: (data: any) => api.post('/entites', data),
}

// ── Dossiers ──────────────────────────────────────────────────────────────────
export const dossiersApi = {
  list: (params?: any) => api.get('/dossiers', { params }),
  get: (id: string) => api.get(`/dossiers/${id}`),
  create: (data: any) => api.post('/dossiers', data),
  update: (id: string, data: any) => api.put(`/dossiers/${id}`, data),
  genererIA: (id: string) => api.post(`/dossiers/${id}/generer-ia`),
  soumettre: (id: string, reference?: string) => api.post(`/dossiers/${id}/soumettre`, { reference }),
  soumettrePourValidation: (id: string) => api.post(`/dossiers/${id}/soumettre-validation`),
  valider: (id: string, data: any) => api.post(`/dossiers/${id}/valider`, data),
  rejeter: (id: string, data: any) => api.post(`/dossiers/${id}/rejeter`, data),
  historiqueValidations: (id: string) => api.get(`/dossiers/${id}/validations`),
  checklist: (id: string) => api.get(`/dossiers/${id}/checklist`),
  post: (path: string, data?: any) => api.post(`/dossiers${path}`, data),
}

// ── Solutions ─────────────────────────────────────────────────────────────────
export const solutionsApi = {
  list: (params?: any) => api.get('/solutions', { params }),
  get: (id: string) => api.get(`/solutions/${id}`),
  estimer: (id: string, config: any) => api.post(`/solutions/${id}/estimer`, config),
}

// ── Scoring ───────────────────────────────────────────────────────────────────
export const scoringApi = {
  calculer: (aoId: string) => api.post(`/scoring/${aoId}/calculer`),
  get: (aoId: string) => api.get(`/scoring/${aoId}`),
  post: (path: string, data?: any) => api.post(`/scoring${path}`, data),
}

// ── AI ─────────────────────────────────────────────────────────────────────────
export const aiApi = {
  resumer: (aoId: string) => api.post(`/ai/ao/${aoId}/resumer`),
  genererMemTechnique: (aoId: string, data?: any) => api.post(`/ai/ao/${aoId}/mem-technique`, data),
  genererOffreFinanciere: (aoId: string, data?: any) => api.post(`/ai/ao/${aoId}/offre-financiere`, data),
  getProviders: () => api.get('/ai/providers'),
  getConfig: () => api.get('/ai/config'),
  saveConfig: (data: any) => api.post('/ai/config', data),
  // Helpers pour les composants qui utilisent api.get/post directement
  get: (path: string) => api.get(`/ai${path}`),
  post: (path: string, data?: any) => api.post(`/ai${path}`, data),
}

// ── Organisation ──────────────────────────────────────────────────────────────
export const orgApi = {
  get: () => api.get('/organisation'),
  dashboard: () => api.get('/organisation/dashboard'),
  update: (data: any) => api.put('/organisation', data),
  references: () => api.get('/organisation/references'),
  createReference: (data: any) => api.post('/organisation/references', data),
  experts: () => api.get('/organisation/experts'),
  createExpert: (data: any) => api.post('/organisation/experts', data),
}

// ── Scraping / Veille ─────────────────────────────────────────────────────────
export const scrapingApi = {
  lancer: () => api.post('/scraping/lancer'),
  sources: () => api.get('/scraping/sources'),
}

// ── Utilisateurs ─────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get('/users'),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  toggleActive: (id: string) => api.patch(`/users/${id}/toggle-active`),
}

// ── Documents ─────────────────────────────────────────────────────────────────
export const documentsApi = {
  list: () => api.get('/documents'),
  alertes: () => api.get('/documents/alertes'),
  create: (data: any) => api.post('/documents', data),
  update: (id: string, data: any) => api.put(`/documents/${id}`, data),
  delete: (id: string) => api.delete(`/documents/${id}`),
}
