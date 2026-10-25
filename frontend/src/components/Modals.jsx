import { useEffect, useState } from 'react'
import { X, Download, Loader2 } from 'lucide-react'
import api from '../services/api'
import { fileKind } from '../utils/format'

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${wide ? 'max-w-4xl' : 'max-w-md'} max-h-[90vh] overflow-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold truncate pr-4">{title}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function PromptModal({ title, label, initial = '', cta = 'Save', onSubmit, onClose }) {
  const [value, setValue] = useState(initial)
  const submit = (e) => {
    e.preventDefault()
    if (value.trim()) onSubmit(value.trim())
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-600">{label}</label>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ring-blue-300"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg hover:bg-slate-100">
            Cancel
          </button>
          <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">{cta}</button>
        </div>
      </form>
    </Modal>
  )
}

export function PreviewModal({ file, onClose }) {
  const [info, setInfo] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    api
      .get(`/files/${file.id}/download`)
      .then((r) => setInfo(r.data))
      .catch(() => setErr('Could not load file'))
  }, [file.id])

  const { kind } = fileKind(file.mime_type, file.name)
  const dl = info ? `${info.url}${info.url.includes('?') ? '&' : '?'}download=${encodeURIComponent(file.name)}` : '#'

  return (
    <Modal title={file.name} onClose={onClose} wide>
      {err && <p className="text-red-600 text-sm">{err}</p>}
      {!info && !err && (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      )}
      {info && (
        <div className="space-y-4">
          <div className="flex justify-center bg-slate-50 rounded-lg overflow-hidden min-h-[200px]">
            {kind === 'image' && <img src={info.url} alt={file.name} className="max-h-[65vh] object-contain" />}
            {kind === 'pdf' && <iframe src={info.url} title={file.name} className="w-full h-[65vh]" />}
            {kind === 'video' && <video src={info.url} controls className="max-h-[65vh] w-full" />}
            {kind === 'audio' && <audio src={info.url} controls className="my-16" />}
            {!['image', 'pdf', 'video', 'audio'].includes(kind) && (
              <p className="py-16 text-slate-500 text-sm">No preview available for this file type.</p>
            )}
          </div>
          <a
            href={dl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            <Download className="w-4 h-4" /> Download
          </a>
        </div>
      )}
    </Modal>
  )
}
