import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Sidebar, MobileNav } from './Sidebar'

export default function Layout() {
  const { session, loading } = useAuth()

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  if (!session) return <Navigate to="/login" replace />

  return (
    <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <MobileNav />
        <Outlet />
      </main>
    </div>
  )
}
