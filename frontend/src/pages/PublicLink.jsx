import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Download, Lock, HardDrive } from 'lucide-react'
import api from '../services/api'
import { fileKind, formatSize } from '../utils/format'

export default function PublicLink() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [pw, setPw] = useState('')
  const [needPw, setNeedPw] = useState(false)
  const [err, setErr] = useState('')

  const load = async (password) => {
    try {
      const r = await api.get(`/public/${token}`, { params: password ? { password } : {} })
      setData(r.data)
      setNeedPw(false)
      setErr('')
    } catch (e) {
      const s = e.response?.status
      if (s === 401) setNeedPw(true)
      else if (s === 403) {
        setNeedPw(true)
        setErr('Wrong password')
      } else if (s === 410) setErr('This link has expired.')
      else setErr('Link not found or no longer available.')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line
  }, [token])

  const dl = (url, name) => `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(name)}`

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-2 mb-5 text-slate-600">
          <HardDrive className="w-5 h-5 text-blue-600" /> <span className="font-semibold">Cloud Drive</span>
        </div>

        {needPw && !data && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              load(pw)
            }}
            className="space-y-3"
          >
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Lock className="w-4 h-4" /> This link is password protected
            </p>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter password"
              className="w-full border rounded-lg px-3 py-2"
            />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Open</button>
          </form>
        )}

        {!needPw && err && <p className="text-red-600">{err}</p>}

        {data?.type === 'file' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-lg break-all">{data.name}</h2>
            <p className="text-sm text-slate-500">{formatSize(data.size)}</p>
            {fileKind(data.mime_type, data.name).kind === 'image' && (
              <img src={data.url} alt={data.name} className="max-h-96 mx-auto rounded-lg" />
            )}
            {fileKind(data.mime_type, data.name).kind === 'pdf' && (
              <iframe src={data.url} title={data.name} className="w-full h-96 rounded-lg" />
            )}
            <a
              href={dl(data.url, data.name)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
            >
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        )}

        {data?.type === 'folder' && (
          <div>
            <h2 className="font-semibold text-lg mb-3">{data.name}</h2>
            {data.files.length === 0 && <p className="text-sm text-slate-400">This folder is empty.</p>}
            <div className="divide-y">
              {data.files.map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="truncate pr-3">{f.name}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500">{formatSize(f.size)}</span>
                    <a href={dl(f.url, f.name)} className="text-blue-600">
                      <Download className="w-4 h-4" />
                    </a>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
