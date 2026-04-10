import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const api = axios.create({
  baseURL: '${process.env.NEXT_PUBLIC_API_URL}/api/v1',
  timeout: 30000,
})

export const useAuthStore = create<any>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/login', { email, password })
          const { user, accessToken, refreshToken } = res.data
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          localStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      register: async (data: any) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/register', data)
          const { user, accessToken, refreshToken } = res.data
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
          localStorage.setItem('refreshToken', refreshToken)
          set({ user, accessToken, isLoading: false })
        } catch (err) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: () => {
        delete api.defaults.headers.common['Authorization']
        localStorage.removeItem('refreshToken')
        set({ user: null, accessToken: null })
      },

      setUser: (user: any) => set({ user }),
    }),
    {
      name: 'recruito-auth',
      partialize: (state: any) => ({
        user: state.user,
        accessToken: state.accessToken
      })
    }
  )
)