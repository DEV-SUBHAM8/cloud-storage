import { Folder, Star, Trash2, Share2, Download, Pencil, RotateCcw } from 'lucide-react'
import { fileKind, formatSize, formatDate } from '../utils/format'

function IconBtn({ icon: Icon, title, onClick, danger, extra = '' }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-full hover:bg-slate-200 ${danger ? 'hover:text-red-600' : ''}`}
    >
      <Icon className={`w-4 h-4 ${extra}`} />
    </button>
  )
}

export default function ItemCard({ it, t, view, starred, mode, canEdit, canShare, on }) {
  const isFolder = t === 'folder'
  const inTrash = mode === 'trash'
  const { Icon, color } = isFolder ? { Icon: Folder, color: 'text-blue-500' } : fileKind(it.mime_type, it.name)
  const stop = (fn) => (e) => {
    e.stopPropagation()
    fn()
  }

  const actions = (
    <div className="flex items-center opacity-100 md:opacity-0 group-hover:opacity-100 transition">
      {inTrash ? (
        <>
          <IconBtn icon={RotateCcw} title="Restore" onClick={stop(() => on.restore(it, t))} />
          <IconBtn icon={Trash2} title="Delete forever" danger onClick={stop(() => on.forever(it, t))} />
        </>
      ) : (
        <>
          <IconBtn
            icon={Star}
            title={starred ? 'Unstar' : 'Star'}
            onClick={stop(() => on.star(it, t))}
            extra={starred ? 'fill-yellow-400 text-yellow-500' : ''}
          />
          {!isFolder && <IconBtn icon={Download} title="Download" onClick={stop(() => on.download(it))} />}
          {canShare && <IconBtn icon={Share2} title="Share" onClick={stop(() => on.share(it, t))} />}
          {canEdit && <IconBtn icon={Pencil} title="Rename" onClick={stop(() => on.rename(it, t))} />}
          {canEdit && <IconBtn icon={Trash2} title="Move to trash" danger onClick={stop(() => on.trash(it, t))} />}
        </>
      )}
    </div>
  )

  const click = () => {
    if (!inTrash) on.open(it, t)
  }

  if (view === 'list') {
    return (
      <div
        onClick={click}
        className={`group flex items-center gap-3 px-3 py-2 bg-white border-b hover:bg-slate-50 ${
          inTrash ? '' : 'cursor-pointer'
        }`}
      >
        <Icon className={`w-5 h-5 shrink-0 ${color}`} />
        <span className="flex-1 truncate text-sm">{it.name}</span>
        <span className="hidden sm:block w-24 text-xs text-slate-500">{isFolder ? '—' : formatSize(it.size)}</span>
        <span className="hidden sm:block w-28 text-xs text-slate-500">{formatDate(it.created_at)}</span>
        {actions}
      </div>
    )
  }

  return (
    <div
      onClick={click}
      className={`group relative border rounded-xl bg-white p-3 hover:shadow-md transition ${
        inTrash ? '' : 'cursor-pointer'
      }`}
    >
      <div className="h-24 flex items-center justify-center rounded-lg bg-slate-50">
        <Icon className={`w-10 h-10 ${color}`} />
      </div>
      <p className="mt-2 truncate text-sm font-medium" title={it.name}>
        {it.name}
      </p>
      <p className="text-xs text-slate-500">
        {isFolder ? formatDate(it.created_at) : `${formatSize(it.size)} · ${formatDate(it.created_at)}`}
      </p>
      <div className="mt-1 -mb-1 flex justify-end">{actions}</div>
    </div>
  )
}
