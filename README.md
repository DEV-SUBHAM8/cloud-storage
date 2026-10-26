# Cloud Drive: Cloud-Based File Storage & Sharing

A Google Drive-style web app to upload, organize, search and share files securely.

**Live demo:** https://cloud-storage-swart.vercel.app
**API:** https://cloud-storage-api-q00v.onrender.com/docs

> The backend runs on a free tier, so the first request may take up to ~50 seconds to wake up.

## Features
- Authentication with email/password (Supabase Auth)
- Nested folders: create, rename, move, delete
- File upload with progress, drag & drop, preview (image, PDF, video, audio)
- Sharing with Viewer / Editor roles (permissions inherited through folders)
- Public share links with optional password and expiry
- Search with type filters, sorting, list/grid view
- Starred files, Trash with restore and permanent delete

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, TanStack Query, Axios, React Dropzone
- **Backend:** Python, FastAPI, Pydantic, SlowAPI (rate limiting)
- **Database & Storage:** Supabase (PostgreSQL + private Storage bucket, signed URLs)
- **Deployment:** Vercel (frontend), Render (backend)

## Security
- All permission checks enforced server-side (Owner / Editor / Viewer)
- Files served only through short-lived signed URLs
- Row-level security enabled on all tables
- Passwords for public links hashed with bcrypt

## Run locally
See `backend/README.md` and `frontend/README.md`.