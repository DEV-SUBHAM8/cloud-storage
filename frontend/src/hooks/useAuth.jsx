import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const Ctx = createContext({ session: null, user: null, loading: true })

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ session, user: session?.user, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
