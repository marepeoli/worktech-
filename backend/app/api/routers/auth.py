from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_principal, require_roles
from app.db.session import get_db
from app.repositories.auth_repository import AuthRepository
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
def me(principal: dict = Depends(get_current_principal), db: Session = Depends(get_db)) -> dict:
    repo = AuthRepository(db)
    nome = principal["sub"]

    if principal["sub"].startswith("admin:"):
        try:
            admin_id = int(principal["sub"].split(":", maxsplit=1)[1])
            admin = repo.find_admin_by_id(admin_id)
            nome = admin.username if admin else "Admin"
        except (ValueError, IndexError):
            nome = "Admin"
    elif principal["sub"].startswith("professor:"):
        try:
            professor_id = int(principal["sub"].split(":", maxsplit=1)[1])
            professor = repo.find_admin_by_id(professor_id)
            nome = professor.username if professor else "Professor"
        except (ValueError, IndexError):
            nome = "Professor"
    elif principal["sub"].startswith("user:"):
        try:
            user_id = int(principal["sub"].split(":", maxsplit=1)[1])
            user = repo.find_user_by_id(user_id)
            nome = user.nome if user else "Atleta"
        except (ValueError, IndexError):
            nome = "Atleta"

    return {"sub": principal["sub"], "role": principal["role"], "nome": nome}


@router.get("/admin-check")
def admin_check(_: dict = Depends(require_roles("ADMIN"))) -> dict:
    return {"status": "allowed"}
