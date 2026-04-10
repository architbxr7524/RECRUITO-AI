import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
console.log("API URL:", BASE_URL)

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// Always attach token from localStorage before every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Try direct accessToken first
    let token = localStorage.getItem('accessToken')
    
    // Fallback: try zustand persisted store
    if (!token) {
      const stored = localStorage.getItem('recruito-auth')
      if (stored) {
        try {
          const { state } = JSON.parse(stored)
          token = state?.accessToken
        } catch {}
      }
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
  }
  return config
})

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const res = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken })
          const { accessToken } = res.data
          localStorage.setItem('accessToken', accessToken)
          
          // Update zustand store too
          const stored = localStorage.getItem('recruito-auth')
          if (stored) {
            try {
              const parsed = JSON.parse(stored)
              parsed.state.accessToken = accessToken
              localStorage.setItem('recruito-auth', JSON.stringify(parsed))
            } catch {}
          }

          original.headers['Authorization'] = `Bearer ${accessToken}`
          return api(original)
        } catch {
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('accessToken')
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const jobsApi = {
  list: (params?: any) => api.get('/jobs', { params }),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: any) => api.post('/jobs', data),
  update: (id: string, data: any) => api.patch(`/jobs/${id}`, data),
  publish: (id: string) => api.post(`/jobs/${id}/publish`),
  delete: (id: string) => api.delete(`/jobs/${id}`),
}

export const resumesApi = {
  upload: (file: File, jobId: string) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/resumes/upload?jobId=${jobId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadBulk: (files: File[], jobId: string) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    return api.post(`/resumes/bulk?jobId=${jobId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadZip: (file: File, jobId: string) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/resumes/zip?jobId=${jobId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getFileUrl: (resumeId: string) => api.get(`/resumes/${resumeId}/file`),
}

export const candidatesApi = {
  list: (params?: any) => api.get('/candidates', { params }),
  get: (id: string) => api.get(`/candidates/${id}`),
  update: (id: string, data: any) => api.patch(`/candidates/${id}`, data),
  addNote: (id: string, data: any) => api.post(`/candidates/${id}/notes`, data),
}

export const pipelineApi = {
  getKanban: (jobId: string) => api.get(`/pipeline/${jobId}`),
  move: (data: any) => api.post('/pipeline/move', data),
  getStages: () => api.get('/pipeline/stages/list'),
}

export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  funnel: (days?: number) => api.get('/analytics/funnel', { params: { days } }),
  scoreDistribution: (jobId?: string) => api.get('/analytics/score-distribution', { params: { jobId } }),
  timeToHire: () => api.get('/analytics/time-to-hire'),
}
