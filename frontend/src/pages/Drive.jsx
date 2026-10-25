import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import {
  Search, Upload, FolderPlus, LayoutGrid, List, ChevronRight, Loader2, CheckCircle2, AlertCircle, X,
} from 'lucide-react'
import api, { errMsg } from '../services/api'
import { uploadFile } from '../services/upload'
import { useToast } from '../hooks/useToast'
import ItemCard from '../components/ItemCard'
import ShareModal from '../components/ShareModal'
import { PromptModal, PreviewModal } from '../components/Modals'

const TITLES = { shared: 'Shared with me', starred: 'Starred', trash: 'Trash', search: 'Search results' }

async function load(mode, id, q, type) {
  if (mode === 'drive') return (await api.get(id ? `/folders/${id}` : '/folders/root')).data
  if (mode === 'shared') {
    const items = (await api.get('/shares/with-me')).data
    return {
      folders: items.filter((i) => i.resource_type === 'folder'),
      files: items.filter((i) => i.resource_type === 'file'),
    }
  }
  if (mode === 'starred') return (await api.get('/stars')).data
  if (mode === 'trash') return (await api.get('/trash')).data
  return (await api.get('/search', { params: { q, type: type || undefined } })).data
}

export default function Drive({ mode }) {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const q = sp.get('q') || ''
  const type = sp.get('type') || ''
  const folderId = mode === 'drive' ? id : undefined

  const [text, setText] = useState(q)
  const [view, setView] = useState('grid')
  const [sort, setSort] = useState('name')
  const [limit, setLimit] = useState(40)
  const [modal, setModal] = useState(null)
  const [uploads, setUploads] = useState([])

  useEffect(() => setText(q), [q])
  useEffect(() => setLimit(40), [mode, id, q, type, sort])

  const { data, isLoading, error } = useQuery({
    queryKey: ['items', mode, id, q, type],
    queryFn: () => load(mode, id, q, type),
  })

  const starsQ = useQuery({
    queryKey: ['stars'],
    queryFn: async () => {
      const d = (await api.get('/stars')).data
      return new Set([...d.files, ...d.folders].map((i) => i.id))
    },
  })
  const starred = starsQ.data || new Set()

  const canWrite = mode === 'drive' && data?.role !== 'viewer'

  // ---------- uploads ----------
  const onDrop = useCallback(
    (accepted) => {
      accepted.forEach((file) => {
        const uid = Math.random().toString(36).slice(2)
        setUploads((u) => [...u, { uid, name: file.name, progress: 0, status: 'uploading' }])
        const upd = (patch) => setUploads((u) => u.map((x) => (x.uid === uid ? { ...x, ...patch } : x)))
        uploadFile(file, folderId, (p) => upd({ progress: p }))
          .then(() => {
            upd({ progress: 100, status: 'done' })
            qc.invalidateQueries({ queryKey: ['items'] })
          })
          .catch((e) => upd({ status: 'error', error: errMsg(e) }))
      })
    },
    [folderId, qc]
  )

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: !canWrite,
  })

  // ---------- actions ----------
  const run = async (fn, okMsg) => {
    try {
      await fn()
      if (okMsg) toast(okMsg)
      qc.invalidateQueries({ queryKey: ['items'] })
      qc.invalidateQueries({ queryKey: ['stars'] })
      setModal(null)
    } catch (e) {
      toast(errMsg(e), 'err')
    }
  }
  const base = (t) => (t === 'file' ? '/files' : '/folders')
  const ref = (it, t) => ({ resource_type: t, resource_id: it.id })

  const on = {
    open: (it, t) => (t === 'folder' ? nav(`/folder/${it.id}`) : setModal({ kind: 'preview', item: it })),
    star: (it, t) => run(() => api.post('/stars/toggle', ref(it, t))),
    share: (it, t) => setModal({ kind: 'share', item: it, t }),
    rename: (it, t) => setModal({ kind: 'rename', item: it, t }),
    trash: (it, t) => run(() => api.delete(`${base(t)}/${it.id}`), 'Moved to trash'),
    restore: (it, t) => run(() => api.post('/trash/restore', ref(it, t)), 'Restored'),
    forever: (it, t) => {
      if (window.confirm(`Delete "${it.name}" forever? This cannot be undone.`))
        run(() => api.post('/trash/delete-forever', ref(it, t)), 'Deleted permanently')
    },
    download: async (it) => {
      try {
        const r = await api.get(`/files/${it.id}/download`)
        const u = r.data.url
        window.open(`${u}${u.includes('?') ? '&' : '?'}download=${encodeURIComponent(it.name)}`, '_blank')
      } catch (e) {
        toast(errMsg(e), 'err')
      }
    },
  }

  // ---------- sorting ----------
  const sorter = useMemo(
    () => (a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : sort === 'size'
        ? (b.size || 0) - (a.size || 0)
        : new Date(b.created_at) - new Date(a.created_at),
    [sort]
  )
  const folders = useMemo(() => [...(data?.folders || [])].sort(sorter), [data, sorter])
  const allFiles = useMemo(() => [...(data?.files || [])].sort(sorter), [data, sorter])
  const files = allFiles.slice(0, limit)

  const submitSearch = (e) => {
    e.preventDefault()
    nav(`/search?q=${encodeURIComponent(text)}${type ? `&type=${type}` : ''}`)
  }

  const permsFor = (it) => ({
    canEdit: mode === 'drive' ? data?.role !== 'viewer' : !it.role || it.role !== 'viewer',
    canShare: mode === 'drive' ? !data?.role || data.role === 'owner' : !it.role || it.role === 'owner',
  })

  const renderItem = (it, t) => (
    <ItemCard
      key={`${t}-${it.id}`}
      it={it}
      t={t}
      view={view}
      mode={mode}
      starred={starred.has(it.id)}
      on={on}
      {...permsFor(it)}
    />
  )

  const empty = !isLoading && !error && folders.length === 0 && allFiles.length === 0
  const gridCls = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3'

  return (
    <div {...getRootProps()} className="min-h-full relative">
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="fixed inset-0 z-40 bg-blue-500/20 border-4 border-dashed border-blue-500 flex items-center justify-center text-2xl font-semibold text-blue-700 pointer-events-none">
          Drop files to upload
        </div>
      )}

      {/* top bar */}
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex flex-wrap items-center gap-2">
        <form onSubmit={submitSearch} className="flex-1 min-w-[180px] max-w-xl relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search in Drive"
            className="w-full pl-9 pr-3 py-2 rounded-full bg-slate-100 text-sm outline-none focus:ring-2 ring-blue-300"
          />
        </form>

        {mode === 'search' && (
          <select
            value={type}
            onChange={(e) => nav(`/search?q=${encodeURIComponent(q)}${e.target.value ? `&type=${e.target.value}` : ''}`)}
            className="border rounded-lg px-2 py-2 text-sm"
          >
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="pdf">PDFs</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="folder">Folders</option>
          </select>
        )}

        {canWrite && (
          <>
            <button
              onClick={() => setModal({ kind: 'newfolder' })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-slate-50"
            >
              <FolderPlus className="w-4 h-4" /> New folder
            </button>
            <button
              onClick={open}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              <Upload className="w-4 h-4" /> Upload
            </button>
          </>
        )}

        <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
          <option value="name">Sort: Name</option>
          <option value="date">Sort: Date</option>
          <option value="size">Sort: Size</option>
        </select>
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setView('grid')}
            className={`p-2 ${view === 'grid' ? 'bg-blue-100 text-blue-700' : ''}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2 ${view === 'list' ? 'bg-blue-100 text-blue-700' : ''}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* breadcrumb / title */}
        {mode === 'drive' ? (
          <nav className="flex flex-wrap items-center gap-1 text-sm mb-4">
            <Link to="/" className={`px-2 py-1 rounded hover:bg-slate-200 ${!id ? 'font-semibold' : ''}`}>
              My Drive
            </Link>
            {data?.breadcrumb?.map((b, i) => (
              <span key={b.id} className="flex items-center gap-1">
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <Link
                  to={`/folder/${b.id}`}
                  className={`px-2 py-1 rounded hover:bg-slate-200 ${
                    i === data.breadcrumb.length - 1 ? 'font-semibold' : ''
                  }`}
                >
                  {b.name}
                </Link>
              </span>
            ))}
          </nav>
        ) : (
          <h2 className="text-xl font-semibold mb-4">
            {TITLES[mode]}
            {mode === 'search' && q ? ` for "${q}"` : ''}
          </h2>
        )}

        {mode === 'trash' && (
          <p className="text-xs text-slate-500 mb-3">Items in trash can be restored or deleted forever.</p>
        )}

        {isLoading && (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
          </div>
        )}
        {error && <p className="text-red-600 text-sm">{errMsg(error)}</p>}
        {empty && (
          <div className="py-20 text-center text-slate-400">
            {mode === 'drive' ? 'This folder is empty. Drag & drop files here or click Upload.' : 'Nothing here yet.'}
          </div>
        )}

        {folders.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Folders</p>
            <div className={view === 'grid' ? gridCls : 'border rounded-lg overflow-hidden'}>
              {folders.map((f) => renderItem(f, 'folder'))}
            </div>
          </>
        )}

        {files.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase mt-6 mb-2">Files</p>
            <div className={view === 'grid' ? gridCls : 'border rounded-lg overflow-hidden'}>
              {files.map((f) => renderItem(f, 'file'))}
            </div>
            {allFiles.length > limit && (
              <div className="text-center mt-4">
                <button onClick={() => setLimit(limit + 40)} className="px-4 py-2 border rounded-lg text-sm hover:bg-white">
                  Load more ({allFiles.length - limit} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* upload progress panel */}
      {uploads.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-xl shadow-xl border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white text-sm">
            <span>
              Uploads ({uploads.filter((u) => u.status === 'done').length}/{uploads.length})
            </span>
            <button onClick={() => setUploads([])}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="max-h-60 overflow-auto divide-y">
            {uploads.map((u) => (
              <div key={u.uid} className="px-4 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{u.name}</span>
                  {u.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                  {u.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                  {u.status === 'uploading' && <span>{u.progress}%</span>}
                </div>
                {u.status === 'uploading' && (
                  <div className="h-1.5 bg-slate-200 rounded mt-1">
                    <div className="h-1.5 bg-blue-600 rounded" style={{ width: `${u.progress}%` }} />
                  </div>
                )}
                {u.status === 'error' && <p className="text-red-600 mt-1">{u.error}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* modals */}
      {modal?.kind === 'newfolder' && (
        <PromptModal
          title="New folder"
          label="Folder name"
          cta="Create"
          onClose={() => setModal(null)}
          onSubmit={(name) => run(() => api.post('/folders', { name, parent_id: folderId || null }), 'Folder created')}
        />
      )}
      {modal?.kind === 'rename' && (
        <PromptModal
          title="Rename"
          label="New name"
          initial={modal.item.name}
          onClose={() => setModal(null)}
          onSubmit={(name) => run(() => api.patch(`${base(modal.t)}/${modal.item.id}`, { name }), 'Renamed')}
        />
      )}
      {modal?.kind === 'share' && <ShareModal item={modal.item} type={modal.t} onClose={() => setModal(null)} />}
      {modal?.kind === 'preview' && <PreviewModal file={modal.item} onClose={() => setModal(null)} />}
    </div>
  )
}
