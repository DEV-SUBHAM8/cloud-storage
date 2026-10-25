import axios from 'axios'
import { supabase } from './supabase'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' })

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export function errMsg(e) {
  const d = e?.response?.data?.detail
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ')
  if (typeof d === 'string') return d
  return e?.message || 'Something went wrong'
}

export default api
