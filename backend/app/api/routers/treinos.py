from datetime import date, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.core.deps import get_current_principal, require_roles
from app.db.models import Checkin, Event, MatriculaModalidade, MatriculaTreino, NotificacaoLeitura, Recommendation, Treino, Usuario
from app.db.session import get_db

router = APIRouter(tags=["treinos"])


DIAS_SEMANA = {
    "segunda": "Segunda",
    "terca": "Terca",
    "terça": "Terca",
    "quarta": "Quarta",
    "quinta": "Quinta",
    "sexta": "Sexta",
    "sabado": "Sabado",
    "sábado": "Sabado",
    "domingo": "Domingo",
}


class MatriculaIn(BaseModel):
    usuario_id: int
    modalidade: str


class MatriculaTreinoIn(BaseModel):
    usuario_id: int
    modalidade: str
    dia_semana: str


class TreinoIn(BaseModel):
    data: date
    hora: time
    modalidade: str = Field(min_length=1)
    local: str = Field(min_length=1)
    vagas_total: int = Field(ge=1)
    vagas_disponiveis: int | None = Field(default=None, ge=0)


class EventIn(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    date: date
    location: str = Field(min_length=1)


class RecommendationIn(BaseModel):
    title: str = Field(min_length=1)
    description: str | None = None
    modalidade: str | None = None
    video_url: str = Field(min_length=1)


class AthleteAccessIn(BaseModel):
    email: str = Field(min_length=5)
    nome: str | None = None
    senha_temporaria: str = Field(default="123456", min_length=4)


class AthleteMeUpdateIn(BaseModel):
    nome: str | None = None
    email: str | None = None
    senha_atual: str | None = None
    nova_senha: str | None = Field(default=None, min_length=4)


class CheckinIn(BaseModel):
    treino_id: int


class NotificacaoLeituraIn(BaseModel):
    referencia: str = Field(min_length=1)


def _clean_text(value: str) -> str:
    return value.strip()


def _normalize_dia_semana(value: str) -> str:
    cleaned = value.strip().lower()
    if cleaned not in DIAS_SEMANA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dia da semana invalido. Use: Segunda, Terca, Quarta, Quinta, Sexta, Sabado ou Domingo.",
        )
    return DIAS_SEMANA[cleaned]


def _ensure_email(value: str) -> str:
    email = value.strip().lower()
    if "@" not in email or email.count("@") != 1:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email invalido")
    return email


def _treino_to_dict(treino: Treino) -> dict:
    return {
        "id": treino.id,
        "data": treino.data.isoformat(),
        "hora": treino.hora.strftime("%H:%M"),
        "modalidade": treino.modalidade,
        "local": treino.local,
        "vagas_total": treino.vagas_total,
        "vagas_disponiveis": treino.vagas_disponiveis,
    }


def _event_to_dict(event: Event) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "date": event.date.isoformat(),
        "location": event.location,
    }


def _recommendation_to_dict(item: Recommendation) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "modalidade": item.modalidade,
        "video_url": item.video_url,
    }


def _checkin_to_dict(checkin: Checkin) -> dict:
    return {
        "id": checkin.id,
        "usuario_id": checkin.usuario_id,
        "treino_id": checkin.treino_id,
    }


def _build_notificacoes(principal: dict, db: Session) -> list[dict]:
    events = db.query(Event).order_by(Event.date.desc()).limit(5).all()

    recommendations_query = db.query(Recommendation)
    if principal["role"] == "USER":
        user_id = _extract_user_id(principal["sub"])
        if user_id is None:
            recommendations = []
        else:
            modalidades = _get_user_modalidades(user_id, db)
            if not modalidades:
                recommendations = []
            else:
                recommendations = (
                    recommendations_query
                    .filter(
                        (Recommendation.modalidade.is_(None))
                        | (Recommendation.modalidade == "")
                        | (Recommendation.modalidade.in_(modalidades))
                    )
                    .order_by(Recommendation.id.desc())
                    .limit(5)
                    .all()
                )
    else:
        recommendations = recommendations_query.order_by(Recommendation.id.desc()).limit(5).all()

    notificacoes_eventos = [
        {
            "referencia": f"evento-{item.id}",
            "tipo": "evento",
            "titulo": item.title,
            "descricao": item.description or f"{item.location} • {item.date.isoformat()}",
            "destino": "/eventos",
            "prioridade": 100 - idx,
        }
        for idx, item in enumerate(events)
    ]
    notificacoes_recomendacoes = [
        {
            "referencia": f"recomendacao-{item.id}",
            "tipo": "recomendacao",
            "titulo": item.title,
            "descricao": item.description or f"Nova recomendacao para {item.modalidade or 'atletas'}",
            "destino": "/recomendacoes",
            "prioridade": 80 - idx,
        }
        for idx, item in enumerate(recommendations)
    ]

    items = [*notificacoes_eventos, *notificacoes_recomendacoes]
    items.sort(key=lambda row: row["prioridade"], reverse=True)
    return items


def _extract_user_id(principal_sub: str) -> int | None:
    if not principal_sub.startswith("user:"):
        return None
    try:
        return int(principal_sub.split(":", maxsplit=1)[1])
    except (ValueError, IndexError):
        return None


def _get_user_modalidades(user_id: int, db: Session) -> list[str]:
    modalidades_legacy = [
        row[0]
        for row in db.query(MatriculaModalidade.modalidade)
        .filter(MatriculaModalidade.usuario_id == user_id)
        .all()
    ]
    modalidades_dia = [
        row[0]
        for row in db.query(MatriculaTreino.modalidade)
        .filter(MatriculaTreino.usuario_id == user_id)
        .all()
    ]
    return sorted({*modalidades_legacy, *modalidades_dia})


def _query_treinos_visiveis(principal: dict, db: Session):
    query = db.query(Treino)

    if principal["role"] == "USER":
        user_id = _extract_user_id(principal["sub"])
        if user_id is None:
            return query.filter(Treino.id == -1)

        modalidades = _get_user_modalidades(user_id, db)
        if not modalidades:
            return query.filter(Treino.id == -1)

        query = query.filter(Treino.modalidade.in_(modalidades))

    return query


@router.get("/admin/dias-checkin")
def get_dias_checkin(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    hoje = date.today()
    fim = hoje + timedelta(days=30)
    query = _query_treinos_visiveis(principal, db).filter(Treino.data >= hoje, Treino.data <= fim)

    treinos = query.order_by(Treino.data.asc()).all()
    sabados = []
    for t in treinos:
        if t.data.weekday() == 5:  # sábado
            sabados.append({
                "id": t.id,
                "dia": t.data.day,
                "mes": t.data.month,
                "ano": t.data.year,
                "local": t.local,
                "horario": str(t.hora)[:5],
                "modalidade": t.modalidade,
                "vagas_disponiveis": t.vagas_disponiveis,
            })
        if len(sabados) >= 4:
            break
    return sabados


@router.get("/checkins/me")
def list_me_checkins(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem consultar check-ins")

    rows = (
        db.query(Checkin)
        .filter(Checkin.usuario_id == user_id)
        .order_by(Checkin.id.desc())
        .all()
    )
    return [_checkin_to_dict(row) for row in rows]


@router.get("/notificacoes/me")
def list_me_notificacoes(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem consultar notificacoes")

    items = _build_notificacoes(principal, db)
    referencias = [item["referencia"] for item in items]
    if not referencias:
        return []

    lidas = {
        row[0]
        for row in db.query(NotificacaoLeitura.referencia)
        .filter(NotificacaoLeitura.usuario_id == user_id, NotificacaoLeitura.referencia.in_(referencias))
        .all()
    }

    return [
        {
            **item,
            "lida": item["referencia"] in lidas,
        }
        for item in items
    ]


@router.get("/notificacoes/me/resumo")
def get_notificacoes_resumo(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem consultar notificacoes")

    items = _build_notificacoes(principal, db)
    referencias = [item["referencia"] for item in items]
    if not referencias:
        return {"nao_lidas": 0}

    lidas_count = (
        db.query(NotificacaoLeitura)
        .filter(NotificacaoLeitura.usuario_id == user_id, NotificacaoLeitura.referencia.in_(referencias))
        .count()
    )
    nao_lidas = max(len(referencias) - lidas_count, 0)
    return {"nao_lidas": nao_lidas}


@router.post("/notificacoes/me/marcar-lida")
def mark_notificacao_lida(
    payload: NotificacaoLeituraIn,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem atualizar notificacoes")

    referencia = payload.referencia.strip()
    if not referencia:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Referencia invalida")

    existing = (
        db.query(NotificacaoLeitura)
        .filter(NotificacaoLeitura.usuario_id == user_id, NotificacaoLeitura.referencia == referencia)
        .first()
    )
    if existing:
        return {"status": "ok"}

    row = NotificacaoLeitura(usuario_id=user_id, referencia=referencia)
    db.add(row)
    db.commit()
    return {"status": "ok"}


@router.post("/notificacoes/me/marcar-todas-lidas")
def mark_todas_notificacoes_lidas(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem atualizar notificacoes")

    items = _build_notificacoes(principal, db)
    referencias = [item["referencia"] for item in items]
    if not referencias:
        return {"status": "ok"}

    existing_refs = {
        row[0]
        for row in db.query(NotificacaoLeitura.referencia)
        .filter(NotificacaoLeitura.usuario_id == user_id, NotificacaoLeitura.referencia.in_(referencias))
        .all()
    }

    for referencia in referencias:
        if referencia in existing_refs:
            continue
        db.add(NotificacaoLeitura(usuario_id=user_id, referencia=referencia))

    db.commit()
    return {"status": "ok"}


@router.delete("/notificacoes/me/{referencia}")
def mark_notificacao_unread(
    referencia: str,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem atualizar notificacoes")

    row = (
        db.query(NotificacaoLeitura)
        .filter(NotificacaoLeitura.usuario_id == user_id, NotificacaoLeitura.referencia == referencia)
        .first()
    )
    if not row:
        return {"status": "ok"}

    db.delete(row)
    db.commit()
    return {"status": "ok"}


@router.post("/checkins/me")
def create_me_checkin(
    payload: CheckinIn,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem confirmar check-in")

    treino = _query_treinos_visiveis(principal, db).filter(Treino.id == payload.treino_id).first()
    if not treino:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treino nao encontrado")

    existing = (
        db.query(Checkin)
        .filter(Checkin.usuario_id == user_id, Checkin.treino_id == payload.treino_id)
        .first()
    )
    if existing:
        return _checkin_to_dict(existing)

    row = Checkin(usuario_id=user_id, treino_id=payload.treino_id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _checkin_to_dict(row)


@router.delete("/checkins/me/{treino_id}")
def delete_me_checkin(
    treino_id: int,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem cancelar check-in")

    row = db.query(Checkin).filter(Checkin.usuario_id == user_id, Checkin.treino_id == treino_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in nao encontrado")

    db.delete(row)
    db.commit()
    return {"status": "ok"}


@router.get("/modalidades")
def get_modalidades(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    dias_semana = {
        0: "Segunda",
        1: "Terça",
        2: "Quarta",
        3: "Quinta",
        4: "Sexta",
        5: "Sábado",
        6: "Domingo",
    }

    treinos = _query_treinos_visiveis(principal, db).order_by(Treino.modalidade.asc(), Treino.data.asc(), Treino.hora.asc()).all()

    agrupado: dict[str, dict] = {}
    for treino in treinos:
        item = agrupado.setdefault(
            treino.modalidade,
            {
                "modalidade": treino.modalidade,
                "dias_semana": [],
                "horarios": [],
                "locais": [],
                "descricao": f"Treinos de {treino.modalidade.lower()} na Vamp Performance.",
            },
        )

        dia_semana = dias_semana[treino.data.weekday()]
        horario = str(treino.hora)[:5]

        if dia_semana not in item["dias_semana"]:
            item["dias_semana"].append(dia_semana)
        if horario not in item["horarios"]:
            item["horarios"].append(horario)
        if treino.local not in item["locais"]:
            item["locais"].append(treino.local)

    return list(agrupado.values())


@router.get("/admin/recomendacoes")
def list_admin_recomendacoes(
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    rows = db.query(Recommendation).order_by(Recommendation.id.desc()).all()
    return [_recommendation_to_dict(row) for row in rows]


@router.get("/recomendacoes")
def list_recomendacoes(
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    query = db.query(Recommendation)
    if principal["role"] == "USER":
        user_id = _extract_user_id(principal["sub"])
        if user_id is None:
            return []

        modalidades = _get_user_modalidades(user_id, db)
        if not modalidades:
            return []

        query = query.filter(
            (Recommendation.modalidade.is_(None))
            | (Recommendation.modalidade == "")
            | (Recommendation.modalidade.in_(modalidades))
        )

    rows = query.order_by(Recommendation.id.desc()).all()
    return [_recommendation_to_dict(row) for row in rows]


@router.get("/events")
def get_events(db: Session = Depends(get_db)):
    events = db.query(Event).order_by(Event.date.desc()).all()
    return [_event_to_dict(event) for event in events]


@router.get("/admin/treinos")
def list_admin_treinos(
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    rows = db.query(Treino).order_by(Treino.data.desc(), Treino.hora.desc()).all()
    return [_treino_to_dict(row) for row in rows]


@router.post("/admin/treinos")
def create_treino(
    payload: TreinoIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    vagas_disponiveis = payload.vagas_total if payload.vagas_disponiveis is None else payload.vagas_disponiveis
    if vagas_disponiveis > payload.vagas_total:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="vagas_disponiveis nao pode ser maior que vagas_total")

    row = Treino(
        data=payload.data,
        hora=payload.hora,
        modalidade=_clean_text(payload.modalidade),
        local=_clean_text(payload.local),
        vagas_total=payload.vagas_total,
        vagas_disponiveis=vagas_disponiveis,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _treino_to_dict(row)


@router.put("/admin/treinos/{treino_id}")
def update_treino(
    treino_id: int,
    payload: TreinoIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.query(Treino).filter(Treino.id == treino_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treino nao encontrado")

    vagas_disponiveis = payload.vagas_total if payload.vagas_disponiveis is None else payload.vagas_disponiveis
    if vagas_disponiveis > payload.vagas_total:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="vagas_disponiveis nao pode ser maior que vagas_total")

    row.data = payload.data
    row.hora = payload.hora
    row.modalidade = _clean_text(payload.modalidade)
    row.local = _clean_text(payload.local)
    row.vagas_total = payload.vagas_total
    row.vagas_disponiveis = vagas_disponiveis

    db.commit()
    db.refresh(row)
    return _treino_to_dict(row)


@router.delete("/admin/treinos/{treino_id}")
def delete_treino(
    treino_id: int,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.query(Treino).filter(Treino.id == treino_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Treino nao encontrado")
    db.delete(row)
    db.commit()
    return {"status": "ok"}


@router.get("/admin/events")
def list_admin_events(
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    rows = db.query(Event).order_by(Event.date.desc()).all()
    return [_event_to_dict(row) for row in rows]


@router.post("/admin/events")
def create_event(
    payload: EventIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = Event(
        title=_clean_text(payload.title),
        description=payload.description,
        date=payload.date,
        location=_clean_text(payload.location),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _event_to_dict(row)


@router.put("/admin/events/{event_id}")
def update_event(
    event_id: int,
    payload: EventIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.query(Event).filter(Event.id == event_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento nao encontrado")
    row.title = _clean_text(payload.title)
    row.description = payload.description
    row.date = payload.date
    row.location = _clean_text(payload.location)
    db.commit()
    db.refresh(row)
    return _event_to_dict(row)


@router.delete("/admin/events/{event_id}")
def delete_event(
    event_id: int,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.query(Event).filter(Event.id == event_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento nao encontrado")
    db.delete(row)
    db.commit()
    return {"status": "ok"}


@router.post("/admin/recomendacoes")
def create_recomendacao(
    payload: RecommendationIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = Recommendation(
        title=_clean_text(payload.title),
        description=payload.description,
        modalidade=_clean_text(payload.modalidade) if payload.modalidade else None,
        video_url=_clean_text(payload.video_url),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _recommendation_to_dict(row)


@router.put("/admin/recomendacoes/{recommendation_id}")
def update_recomendacao(
    recommendation_id: int,
    payload: RecommendationIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recomendacao nao encontrada")
    row.title = _clean_text(payload.title)
    row.description = payload.description
    row.modalidade = _clean_text(payload.modalidade) if payload.modalidade else None
    row.video_url = _clean_text(payload.video_url)
    db.commit()
    db.refresh(row)
    return _recommendation_to_dict(row)


@router.delete("/admin/recomendacoes/{recommendation_id}")
def delete_recomendacao(
    recommendation_id: int,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recomendacao nao encontrada")
    db.delete(row)
    db.commit()
    return {"status": "ok"}


@router.get("/admin/atletas")
def list_atletas(
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    rows = db.query(Usuario).order_by(Usuario.id.desc()).all()
    return [
        {
            "id": row.id,
            "nome": row.nome,
            "email": row.email,
        }
        for row in rows
    ]


@router.post("/admin/atletas")
def create_atleta_access(
    payload: AthleteAccessIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    email = _ensure_email(payload.email)
    exists = db.query(Usuario).filter(Usuario.email == email).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ja cadastrado")

    nome = _clean_text(payload.nome) if payload.nome else "Novo Atleta"
    row = Usuario(nome=nome, email=email, senha=payload.senha_temporaria)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "nome": row.nome,
        "email": row.email,
        "senha_temporaria": payload.senha_temporaria,
    }


@router.put("/atletas/me")
def update_me_atleta(
    payload: AthleteMeUpdateIn,
    principal: dict = Depends(get_current_principal),
    db: Session = Depends(get_db),
):
    user_id = _extract_user_id(principal["sub"])
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Somente atletas podem atualizar os dados cadastrais")

    row = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Atleta nao encontrado")

    if payload.nome is not None:
        row.nome = _clean_text(payload.nome)

    if payload.email is not None:
        email = _ensure_email(payload.email)
        email_owner = db.query(Usuario).filter(Usuario.email == email, Usuario.id != user_id).first()
        if email_owner:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email ja utilizado")
        row.email = email

    if payload.nova_senha is not None:
        if not payload.senha_atual:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Informe a senha atual")
        if not verify_password(payload.senha_atual, row.senha):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual invalida")
        row.senha = payload.nova_senha

    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "nome": row.nome,
        "email": row.email,
    }


@router.get("/admin/matriculas")
def list_matriculas(
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    rows = db.query(MatriculaModalidade).order_by(MatriculaModalidade.usuario_id.asc()).all()
    return [
        {
            "id": row.id,
            "usuario_id": row.usuario_id,
            "modalidade": row.modalidade,
        }
        for row in rows
    ]


@router.post("/admin/matriculas")
def upsert_matricula(
    payload: MatriculaIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    modalidade = payload.modalidade.strip()
    row = (
        db.query(MatriculaModalidade)
        .filter(
            MatriculaModalidade.usuario_id == payload.usuario_id,
            MatriculaModalidade.modalidade == modalidade,
        )
        .first()
    )
    if row is None:
        row = MatriculaModalidade(usuario_id=payload.usuario_id, modalidade=modalidade)
        db.add(row)

    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "usuario_id": row.usuario_id,
        "modalidade": row.modalidade,
    }


@router.get("/admin/matriculas-treino")
def list_matriculas_treino(
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    rows = db.query(MatriculaTreino).order_by(MatriculaTreino.usuario_id.asc(), MatriculaTreino.id.asc()).all()
    return [
        {
            "id": row.id,
            "usuario_id": row.usuario_id,
            "modalidade": row.modalidade,
            "dia_semana": row.dia_semana,
        }
        for row in rows
    ]


@router.post("/admin/matriculas-treino")
def create_matricula_treino(
    payload: MatriculaTreinoIn,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    modalidade = _clean_text(payload.modalidade)
    dia_semana = _normalize_dia_semana(payload.dia_semana)

    row = (
        db.query(MatriculaTreino)
        .filter(
            MatriculaTreino.usuario_id == payload.usuario_id,
            MatriculaTreino.modalidade == modalidade,
            MatriculaTreino.dia_semana == dia_semana,
        )
        .first()
    )
    if row:
        return {
            "id": row.id,
            "usuario_id": row.usuario_id,
            "modalidade": row.modalidade,
            "dia_semana": row.dia_semana,
        }

    row = MatriculaTreino(
        usuario_id=payload.usuario_id,
        modalidade=modalidade,
        dia_semana=dia_semana,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "id": row.id,
        "usuario_id": row.usuario_id,
        "modalidade": row.modalidade,
        "dia_semana": row.dia_semana,
    }


@router.delete("/admin/matriculas-treino/{matricula_id}")
def delete_matricula_treino(
    matricula_id: int,
    _: dict = Depends(require_roles("ADMIN")),
    db: Session = Depends(get_db),
):
    row = db.query(MatriculaTreino).filter(MatriculaTreino.id == matricula_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matricula nao encontrada")
    db.delete(row)
    db.commit()
    return {"status": "ok"}
