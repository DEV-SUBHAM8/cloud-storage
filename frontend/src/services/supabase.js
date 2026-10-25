import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const BUCKET = import.meta.env.VITE_BUCKET || 'files'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
