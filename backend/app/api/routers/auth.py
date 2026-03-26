from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_principal, require_roles
from app.db.session import get_db
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    return TokenResponse(**service.login(payload.login, payload.senha))


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    service = AuthService(db)
    return TokenResponse(**service.refresh(payload.refresh_token))


@router.get("/me")
def me(principal: dict = Depends(get_current_principal)) -> dict:
    return principal


@router.get("/admin-check")
def admin_check(_: dict = Depends(require_roles("ADMIN"))) -> dict:
    return {"status": "allowed"}
