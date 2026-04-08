from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel


class ProfessorModalidadeRequest(BaseModel):
    modalidade: str
    dia_semana: str
    hora_inicio: time
    hora_fim: time


class ProfessorModalidadeResponse(BaseModel):
    id: int
    professor_id: int
    modalidade: str
    dia_semana: str
    hora_inicio: time
    hora_fim: time
    created_at: datetime


class PresencaRequest(BaseModel):
    usuario_id: int
    treino_id: int
    presente: bool
    observacoes: Optional[str] = None


class PresencaResponse(BaseModel):
    id: int
    usuario_id: int
    treino_id: int
    professor_id: int
    presente: bool
    observacoes: Optional[str]
    created_at: datetime


class PresencaHistoricoItem(BaseModel):
    treino_id: int
    data: str
    hora: str
    modalidade: str
    total_alunos: int
    presentes: int
    percentual: float


class TreinoCheckinsResponse(BaseModel):
    treino_id: int
    data: str
    hora: str
    modalidade: str
    usuarios: list
