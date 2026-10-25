import { File, FileText, Image as ImageIcon, Film, Music, FileArchive } from 'lucide-react'

export function formatSize(bytes) {
  if (!bytes) return '0 B'
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${u[i]}`
}

export function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fileKind(mime = '', name = '') {
  const m = mime || ''
  if (m.startsWith('image/')) return { Icon: ImageIcon, color: 'text-pink-500', kind: 'image' }
  if (m === 'application/pdf') return { Icon: FileText, color: 'text-red-500', kind: 'pdf' }
  if (m.startsWith('video/')) return { Icon: Film, color: 'text-purple-500', kind: 'video' }
  if (m.startsWith('audio/')) return { Icon: Music, color: 'text-amber-500', kind: 'audio' }
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return { Icon: FileArchive, color: 'text-orange-500', kind: 'archive' }
  if (m.startsWith('text/')) return { Icon: FileText, color: 'text-slate-500', kind: 'text' }
  return { Icon: File, color: 'text-slate-400', kind: 'other' }
}
