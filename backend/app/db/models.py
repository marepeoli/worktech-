from datetime import datetime

from sqlalchemy import Date, ForeignKey, Integer, Text, Time, UniqueConstraint
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


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    date: Mapped[Date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    modalidade: Mapped[str] = mapped_column(Text, nullable=True)
    video_url: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]


class MatriculaModalidade(Base):
    __tablename__ = "matriculas_modalidade"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), nullable=False)
    modalidade: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]


class MatriculaTreino(Base):
    __tablename__ = "matriculas_treino"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), nullable=False)
    modalidade: Mapped[str] = mapped_column(Text, nullable=False)
    dia_semana: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]


class Checkin(Base):
    __tablename__ = "checkins"
    __table_args__ = (UniqueConstraint("usuario_id", "treino_id", name="uq_checkin_usuario_treino"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), nullable=False)
    treino_id: Mapped[int] = mapped_column(ForeignKey("treinos.id"), nullable=False)
    created_at: Mapped[datetime]


class CheckinCancelamento(Base):
    __tablename__ = "checkins_cancelamentos"
    __table_args__ = (UniqueConstraint("checkin_id", name="uq_cancelamento_checkin"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    checkin_id: Mapped[int] = mapped_column(ForeignKey("checkins.id"), nullable=False)
    justificativa: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]


class PresencaTreino(Base):
    __tablename__ = "presencas_treino"
    __table_args__ = (UniqueConstraint("usuario_id", "treino_id", name="uq_presenca_usuario_treino"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), nullable=False)
    treino_id: Mapped[int] = mapped_column(ForeignKey("treinos.id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    professor_sub: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]


class NotificacaoProfessor(Base):
    __tablename__ = "notificacoes_professor"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    treino_id: Mapped[int] = mapped_column(ForeignKey("treinos.id"), nullable=False)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), nullable=False)
    acao: Mapped[str] = mapped_column(Text, nullable=False)
    justificativa: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime]


class NotificacaoLeitura(Base):
    __tablename__ = "notificacoes_leitura"
    __table_args__ = (UniqueConstraint("usuario_id", "referencia", name="uq_notif_leitura_usuario_ref"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuario.id"), nullable=False)
    referencia: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime]
