from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    assert client.get("/health").json() == {"status": "ok"}

def test_protected_routes_need_token():
    assert client.get("/auth/me").status_code == 401
    assert client.get("/folders/root").status_code == 401
