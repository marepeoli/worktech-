from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.repositories.auth_repository import AuthRepository


class AuthService:
    def __init__(self, db: Session):
        self.repo = AuthRepository(db)

    def login(self, login: str, senha: str) -> dict:
        admin = self.repo.find_admin_by_username(login)
        if admin and verify_password(senha, admin.password):
            return self._build_tokens(subject=f"admin:{admin.id}", role="ADMIN")

        user = self.repo.find_user_by_email(login)
        if user and verify_password(senha, user.senha):
            return self._build_tokens(subject=f"user:{user.id}", role="USER")

        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    def refresh(self, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except TokenError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

        subject = payload["sub"]
        role = payload["role"]
        return self._build_tokens(subject=subject, role=role)

    @staticmethod
    def _build_tokens(*, subject: str, role: str) -> dict:
        return {
            "access_token": create_access_token(subject=subject, role=role),
            "refresh_token": create_refresh_token(subject=subject, role=role),
            "token_type": "bearer",
            "role": role,
        }
