from datetime import datetime

from sqlalchemy import Date, Integer, Text, Time
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Usuario(Base):
    __tablename__ = "usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    senha: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]


class LoginUser(Base):
    __tablename__ = "login_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]


class Treino(Base):
    __tablename__ = "treinos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    data: Mapped[Date] = mapped_column(Date, nullable=False)
    hora: Mapped[Time] = mapped_column(Time, nullable=False)
    modalidade: Mapped[str] = mapped_column(Text, nullable=False)
    local: Mapped[str] = mapped_column(Text, nullable=False)
    vagas_total: Mapped[int] = mapped_column(Integer, nullable=False)
    vagas_disponiveis: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime]
