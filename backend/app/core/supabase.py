from supabase import create_client
from app.core.config import settings

sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
storage = sb.storage.from_(settings.BUCKET)
