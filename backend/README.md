# Cloud Storage Backend (FastAPI + Supabase)

1. Supabase: create project -> Storage: create PRIVATE bucket "files" -> SQL Editor: run schema.sql
2. Copy .env.example to .env and fill SUPABASE_URL and SUPABASE_SERVICE_KEY
3. python -m venv venv ; activate it ; pip install -r requirements.txt
4. uvicorn app.main:app --reload   (docs at http://localhost:8000/docs)
5. pytest
