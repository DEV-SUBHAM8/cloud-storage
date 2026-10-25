import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { HardDrive } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function Login() {
  const { session } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        })
        if (error) throw error
        if (!data.session) toast('Account created. Check your email to confirm, then log in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setBusy(false)
    }
  }

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) toast(error.message, 'err')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <HardDrive className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-semibold">Cloud Drive</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-300"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-300"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-300"
          />
          <button
            disabled={busy}
            className="w-full py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        <button onClick={google} className="w-full mt-3 py-2 rounded-lg border text-sm hover:bg-slate-50">
          Continue with Google
        </button>
        <p className="text-sm text-center mt-5 text-slate-600">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button className="text-blue-600 font-medium" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
