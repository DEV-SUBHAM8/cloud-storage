import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Link2, X } from 'lucide-react'
import api, { errMsg } from '../services/api'
import { useToast } from '../hooks/useToast'
import { Modal } from './Modals'

export default function ShareModal({ item, type, onClose }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('viewer')
  const [pw, setPw] = useState('')
  const [exp, setExp] = useState('')
  const [link, setLink] = useState('')

  const shares = useQuery({
    queryKey: ['shares', item.id],
    queryFn: async () => (await api.get(`/shares/${type}/${item.id}`)).data,
  })

  const add = async (e) => {
    e.preventDefault()
    try {
      await api.post('/shares', { resource_type: type, resource_id: item.id, email, role })
      setEmail('')
      toast('Shared')
      shares.refetch()
    } catch (err) {
      toast(errMsg(err), 'err')
    }
  }

  const remove = async (id) => {
    try {
      await api.delete(`/shares/${id}`)
      shares.refetch()
    } catch (err) {
      toast(errMsg(err), 'err')
    }
  }

  const makeLink = async () => {
    try {
      const body = { resource_type: type, resource_id: item.id }
      if (pw) body.password = pw
      if (exp) body.expires_at = new Date(exp + 'T23:59:59').toISOString()
      const r = await api.post('/public-link', body)
      setLink(`${window.location.origin}/public/${r.data.token}`)
    } catch (err) {
      toast(errMsg(err), 'err')
    }
  }

  const copy = () => {
    navigator.clipboard.writeText(link)
    toast('Link copied')
  }

  return (
    <Modal title={`Share "${item.name}"`} onClose={onClose}>
      <form onSubmit={add} className="flex gap-2">
        <input
          type="email"
          required
          placeholder="Add people by email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-blue-300"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded-lg px-2 text-sm">
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
        <button className="px-4 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Share</button>
      </form>

      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase">People with access</p>
        {shares.data?.length === 0 && <p className="text-sm text-slate-400">Not shared with anyone yet.</p>}
        {shares.data?.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
            <span className="truncate">{s.email}</span>
            <span className="flex items-center gap-2">
              <span className="text-xs text-slate-500 capitalize">{s.role}</span>
              <button onClick={() => remove(s.id)} className="p-1 rounded hover:bg-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t pt-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
          <Link2 className="w-3.5 h-3.5" /> Public link
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Password (optional)"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            className="border rounded-lg px-2 text-sm"
            title="Expiry (optional)"
          />
        </div>
        <button onClick={makeLink} className="px-4 py-2 rounded-lg border text-sm hover:bg-slate-50">
          Create public link
        </button>
        {link && (
          <div className="flex gap-2">
            <input readOnly value={link} className="flex-1 border rounded-lg px-3 py-2 text-xs bg-slate-50" />
            <button onClick={copy} className="px-3 rounded-lg bg-slate-800 text-white">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}
