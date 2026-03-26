from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.core.deps import require_roles
from app.core.security import create_access_token


def _make_client() -> TestClient:
    app = FastAPI()

    @app.get("/admin")
    def admin(_: dict = Depends(require_roles("ADMIN"))):
        return {"ok": True}

    return TestClient(app)


def test_admin_route_returns_401_without_token() -> None:
    client = _make_client()
    response = client.get("/admin")
    assert response.status_code == 401


def test_admin_route_returns_403_for_user_role() -> None:
    client = _make_client()
    user_access = create_access_token(subject="user:1", role="USER")
    response = client.get("/admin", headers={"Authorization": f"Bearer {user_access}"})
    assert response.status_code == 403


def test_admin_route_returns_200_for_admin_role() -> None:
    client = _make_client()
    admin_access = create_access_token(subject="admin:1", role="ADMIN")
    response = client.get("/admin", headers={"Authorization": f"Bearer {admin_access}"})
    assert response.status_code == 200
