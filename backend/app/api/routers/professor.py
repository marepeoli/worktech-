from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, desc, func, or_, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.deps import get_current_principal, get_db
from app.db.models import Checkin, CheckinCancelamento, Presenca, ProfessorModalidade, Treino, Usuario
from app.schemas.professor import (
    PresencaHistoricoItem,
    PresencaRequest,
    PresencaResponse,
    ProfessorModalidadeRequest,
    ProfessorModalidadeResponse,
    TreinoCheckinsResponse,
)

router = APIRouter(prefix="/professor", tags=["professor"])


_DIA_SEMANA_JS = {
    "domingo": 0,
    "segunda": 1,
    "terca": 2,
    "terça": 2,
    "quarta": 3,
    "quinta": 4,
    "sexta": 5,
    "sabado": 6,
    "sábado": 6,
}


def _parse_dia_semana_to_js(dia_semana: str) -> Optional[int]:
    value = (dia_semana or "").strip().lower()
    if not value:
        return None

    if value.isdigit():
        day = int(value)
        if 0 <= day <= 6:
            return day
        if day == 7:
            return 0
        return None

    return _DIA_SEMANA_JS.get(value)


def _treino_matches_professor_slot(treino: Treino, slot: ProfessorModalidade) -> bool:
    if treino.modalidade != slot.modalidade:
        return False

    slot_day = _parse_dia_semana_to_js(slot.dia_semana)
    if slot_day is None:
        return False

    treino_day = (treino.data.weekday() + 1) % 7
    if treino_day != slot_day:
        return False

    return slot.hora_inicio <= treino.hora <= slot.hora_fim


def _get_professor_id(principal: dict, db: Session) -> int:
    """Obtém ID do professor a partir do token."""
    subject = principal.get("sub", "")
    professor = None

    if isinstance(subject, str) and subject.startswith("user:"):
        try:
            user_id = int(subject.split(":", maxsplit=1)[1])
            professor = (
                db.query(Usuario)
                .filter(Usuario.id == user_id, Usuario.role == "PROFESSOR")
                .first()
            )
        except (ValueError, IndexError):
            professor = None

    if professor is None and isinstance(subject, str):
        professor = (
            db.query(Usuario)
            .filter(Usuario.email == subject, Usuario.role == "PROFESSOR")
            .first()
        )

    if not professor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a professores",
        )
    return professor.id


@router.get("/modalidades", response_model=list[ProfessorModalidadeResponse])
def listar_modalidades_professor(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    """Lista modalidades e horários que o professor ministra."""
    professor_id = _get_professor_id(principal, db)
    modalidades = (
        db.query(ProfessorModalidade)
        .filter(ProfessorModalidade.professor_id == professor_id)
        .all()
    )
    return modalidades


@router.post(
    "/modalidades", response_model=ProfessorModalidadeResponse, status_code=201
)
def adicionar_modalidade_professor(
    payload: ProfessorModalidadeRequest,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    """Adiciona nova modalidade e horário para o professor."""
    professor_id = _get_professor_id(principal, db)

    existing = (
        db.query(ProfessorModalidade)
        .filter(
            and_(
                ProfessorModalidade.professor_id == professor_id,
                ProfessorModalidade.modalidade == payload.modalidade,
                ProfessorModalidade.dia_semana == payload.dia_semana,
            )
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Professor já ministra essa modalidade nesse dia",
        )

    prof_mod = ProfessorModalidade(
        professor_id=professor_id,
        modalidade=payload.modalidade,
        dia_semana=payload.dia_semana,
        hora_inicio=payload.hora_inicio,
        hora_fim=payload.hora_fim,
        created_at=datetime.now(),
    )
    db.add(prof_mod)
    db.commit()
    db.refresh(prof_mod)
    return prof_mod


@router.get("/treinos")
def listar_treinos_professor(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    """Lista treinos que o professor ministra."""
    professor_id = _get_professor_id(principal, db)

    prof_mods = (
        db.query(ProfessorModalidade)
        .filter(ProfessorModalidade.professor_id == professor_id)
        .all()
    )
    if not prof_mods:
        return []

    modalidades = sorted({pm.modalidade for pm in prof_mods})
    candidatos = (
        db.query(Treino)
        .filter(Treino.data >= datetime.now().date(), Treino.modalidade.in_(modalidades))
        .order_by(Treino.data, Treino.hora)
        .all()
    )
    treinos = [
        treino
        for treino in candidatos
        if any(_treino_matches_professor_slot(treino, pm) for pm in prof_mods)
    ]

    return [
        {
            "id": t.id,
            "data": t.data.isoformat(),
            "hora": t.hora.isoformat(),
            "modalidade": t.modalidade,
            "local": t.local,
            "vagas_total": t.vagas_total,
            "vagas_disponiveis": t.vagas_disponiveis,
        }
        for t in treinos
    ]


@router.get("/treinos/{treino_id}/checkins", response_model=TreinoCheckinsResponse)
def listar_checkins_treino(
    treino_id: int,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    """Lista alunos com check-in em um treino específico."""
    professor_id = _get_professor_id(principal, db)
    treino = db.query(Treino).filter(Treino.id == treino_id).first()
    if not treino:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Treino não encontrado"
        )

    prof_mods = (
        db.query(ProfessorModalidade)
        .filter(ProfessorModalidade.professor_id == professor_id)
        .all()
    )
    if not any(_treino_matches_professor_slot(treino, pm) for pm in prof_mods):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não ministra essa modalidade",
        )

    usuarios = []
    try:
        checkins = (
            db.query(Checkin, Usuario)
            .join(Usuario, Checkin.usuario_id == Usuario.id)
            .filter(Checkin.treino_id == treino_id)
            .all()
        )
        cancel_map = {
            row.checkin_id: True
            for row in db.query(CheckinCancelamento).filter(
                CheckinCancelamento.checkin_id.in_([row[0].id for row in checkins])
            )
        }
        for checkin, usuario in checkins:
            if cancel_map.get(checkin.id):
                continue
            usuarios.append(
                {
                    "usuario_id": usuario.id,
                    "nome": usuario.nome,
                    "email": usuario.email,
                }
            )
    except SQLAlchemyError:
        db.rollback()
        legacy_rows = db.execute(
            text(
                """
                SELECT u.id AS usuario_id, u.nome, u.email
                FROM checkins c
                JOIN usuario u ON u.email = c.usuario_email
                LEFT JOIN checkins_cancelamentos cc ON cc.checkin_id = c.id
                WHERE c.treino_id = :treino_id
                  AND cc.id IS NULL
                """
            ),
            {"treino_id": treino_id},
        ).all()
        for row in legacy_rows:
            usuarios.append(
                {
                    "usuario_id": row.usuario_id,
                    "nome": row.nome,
                    "email": row.email,
                }
            )

    return TreinoCheckinsResponse(
        treino_id=treino_id,
        data=treino.data.isoformat(),
        hora=treino.hora.isoformat(),
        modalidade=treino.modalidade,
        usuarios=usuarios,
    )


@router.post("/presenca", status_code=201)
def registrar_presenca_lote(
    presencas: list[PresencaRequest],
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    """Registra presença de vários alunos em um treino."""
    professor_id = _get_professor_id(principal, db)

    if not presencas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lista de presenças vazia",
        )

    treino_id = presencas[0].treino_id
    treino = db.query(Treino).filter(Treino.id == treino_id).first()
    if not treino:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Treino não encontrado"
        )

    prof_mods = (
        db.query(ProfessorModalidade)
        .filter(
            and_(
                ProfessorModalidade.professor_id == professor_id,
                ProfessorModalidade.modalidade == treino.modalidade,
            )
        )
        .first()
    )
    if not prof_mods:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não ministra essa modalidade",
        )

    created = []
    for p in presencas:
        if p.treino_id != treino_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Todos os registros devem ser do mesmo treino",
            )

        existing = (
            db.query(Presenca)
            .filter(
                and_(
                    Presenca.usuario_id == p.usuario_id,
                    Presenca.treino_id == p.treino_id,
                )
            )
            .first()
        )
        if existing:
            existing.presente = p.presente
            existing.observacoes = p.observacoes
        else:
            presenca = Presenca(
                usuario_id=p.usuario_id,
                treino_id=p.treino_id,
                professor_id=professor_id,
                presente=p.presente,
                observacoes=p.observacoes,
                created_at=datetime.now(),
            )
            db.add(presenca)

        created.append({"usuario_id": p.usuario_id, "presente": p.presente})

    db.commit()
    return {"status": "ok", "registros": created}


@router.get(
    "/presenca/historico",
    response_model=list[PresencaHistoricoItem],
)
def historico_presencas_professor(
    dias: int = Query(7, ge=1, le=90),
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    """Lista histórico de presenças dos últimos treinos do professor."""
    professor_id = _get_professor_id(principal, db)

    data_inicio = datetime.now().date() - timedelta(days=dias)

    treinos_ids = (
        db.query(Treino.id)
        .filter(
            and_(
                Treino.modalidade.in_(
                    db.query(ProfessorModalidade.modalidade).filter(
                        ProfessorModalidade.professor_id == professor_id
                    )
                ),
                Treino.data >= data_inicio,
            )
        )
        .all()
    )
    treino_ids_list = [t[0] for t in treinos_ids]

    if not treino_ids_list:
        return []

    resultado = []
    for treino_id in treino_ids_list:
        treino = db.query(Treino).filter(Treino.id == treino_id).first()
        if not treino:
            continue

        presencas = (
            db.query(Presenca)
            .filter(Presenca.treino_id == treino_id)
            .all()
        )

        total = len(presencas)
        presentes = len([p for p in presencas if p.presente])
        percentual = (presentes / total * 100) if total > 0 else 0

        resultado.append(
            PresencaHistoricoItem(
                treino_id=treino_id,
                data=treino.data.isoformat(),
                hora=treino.hora.isoformat(),
                modalidade=treino.modalidade,
                total_alunos=total,
                presentes=presentes,
                percentual=round(percentual, 2),
            )
        )

    return sorted(resultado, key=lambda x: (x.data, x.hora), reverse=True)
