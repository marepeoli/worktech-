from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import LoginUser, Usuario


class AuthRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_admin_by_username(self, username: str) -> LoginUser | None:
        stmt = select(LoginUser).where(LoginUser.username == username)
        return self.db.scalar(stmt)

    def find_user_by_email(self, email: str) -> Usuario | None:
        stmt = select(Usuario).where(Usuario.email == email)
        return self.db.scalar(stmt)

    def find_admin_by_id(self, admin_id: int) -> LoginUser | None:
        stmt = select(LoginUser).where(LoginUser.id == admin_id)
        return self.db.scalar(stmt)

    def find_user_by_id(self, user_id: int) -> Usuario | None:
        stmt = select(Usuario).where(Usuario.id == user_id)
        return self.db.scalar(stmt)
