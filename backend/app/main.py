from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.config import settings
from app.main_limiter import limiter
from app.routes import auth, folders, files, trash, stars, shares, public, search

app = FastAPI(title="Cloud Storage API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

for r in (auth, folders, files, trash, stars, shares, public, search):
    app.include_router(r.router)

@app.get("/health")
def health():
    return {"status": "ok"}
