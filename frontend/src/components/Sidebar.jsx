import { NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { HardDrive, Users, Star, Trash2, LogOut } from 'lucide-react'
import { supabase } from '../services/supabase'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/', label: 'My Drive', icon: HardDrive, end: true },
  { to: '/shared', label: 'Shared with me', icon: Users },
  { to: '/starred', label: 'Starred', icon: Star },
  { to: '/trash', label: 'Trash', icon: Trash2 },
]

function useSignOut() {
  const qc = useQueryClient()
  return async () => {
    await supabase.auth.signOut()
    qc.clear()
  }
}

export function Sidebar() {
  const { user } = useAuth()
  const signOut = useSignOut()
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-white border-r p-3">
      <div className="flex items-center gap-2 px-3 py-3 mb-2">
        <HardDrive className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-semibold">Cloud Drive</span>
      </div>
      <nav className="space-y-1 flex-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-full text-sm ${
                isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-100'
              }`
            }
          >
            <Icon className="w-4 h-4" /> {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t pt-3">
        <p className="text-xs text-slate-500 truncate px-3 mb-2">{user?.email}</p>
        <button onClick={signOut} className="flex items-center gap-2 px-3 py-2 text-sm rounded-full hover:bg-slate-100 w-full">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </aside>
  )
}

export function MobileNav() {
  const signOut = useSignOut()
  return (
    <nav className="md:hidden flex items-center gap-1 overflow-x-auto bg-white border-b px-2 py-2">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
              isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100'
            }`
          }
        >
          <Icon className="w-3.5 h-3.5" /> {label}
        </NavLink>
      ))}
      <button onClick={signOut} className="ml-auto px-3 py-1.5 rounded-full text-xs bg-slate-100">
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </nav>
  )
}
