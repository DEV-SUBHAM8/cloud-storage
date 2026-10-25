import api from './api'
import { supabase, SUPABASE_KEY, BUCKET } from './supabase'

function xhrPut(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('apikey', SUPABASE_KEY)
    if (SUPABASE_KEY && SUPABASE_KEY.startsWith('eyJ')) {
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_KEY}`)
    }
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed (' + xhr.status + ')'))
    xhr.onerror = () => reject(new Error('Network error'))
    const fd = new FormData()
    fd.append('cacheControl', '3600')
    fd.append('', file)
    xhr.send(fd)
  })
}

export async function uploadFile(file, folderId, onProgress) {
  const { data: init } = await api.post('/files/init-upload', {
    name: file.name,
    size: file.size,
    mime_type: file.type || 'application/octet-stream',
    folder_id: folderId || null,
  })
  try {
    await xhrPut(init.signed_url, file, onProgress)
  } catch (e) {
    // fallback: official SDK (no progress events)
    const { error } = await supabase.storage.from(BUCKET).uploadToSignedUrl(init.path, init.token, file)
    if (error) throw new Error(error.message || 'Upload failed')
    onProgress(100)
  }
  await api.post('/files/complete-upload', { file_id: init.file_id })
}
