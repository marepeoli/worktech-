# WorkTech+ - VAMP Performance

Implementacao inicial da Feature 1: autenticacao e sessao (Login + JWT access/refresh + RBAC).

## Estrutura

- backend: FastAPI + SQLAlchemy + PostgreSQL
- frontend: Vite + React + TypeScript

## Requisitos

- Python 3.11+
- Node 20+
- PostgreSQL ativo com schema em `vamp_db`

## Backend

1. Copie `.env.example` para `.env` em `backend` e ajuste as variaveis (DATABASE_URL, JWT_SECRET).
2. Crie o ambiente virtual e instale dependencias:
   - `python -m venv .venv`
   - `.venv\Scripts\Activate.ps1` (Windows) ou `source .venv/bin/activate` (Linux/Mac)
   - `pip install -e .[dev]`
3. Rode API:
   - `uvicorn app.main:app --reload --port 8000`

### Endpoints principais

- `GET /health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me` (protegido)
- `GET /api/v1/auth/admin-check` (ADMIN)

## Frontend

1. Copie `.env.example` para `.env` em `frontend`.
   - O valor padrao `VITE_API_BASE_URL=/api/v1` ja esta correto (proxy do Vite aponta para o backend).
2. Instale dependencias:
   - `npm install`
3. Rode app:
   - `npm run dev`

> O Vite esta configurado com proxy: requisicoes para `/api` sao redirecionadas para `http://localhost:8000` automaticamente, sem problemas de CORS.

## Fluxo de autenticacao

1. Frontend chama login com `login` e `senha`.
2. Backend autentica:
   - `login_users` por `username` -> role `ADMIN`
   - `usuario` por `email` -> role `USER`
3. Backend retorna `access_token` e `refresh_token`.
4. Frontend guarda sessao local e usa `Authorization: Bearer <access>`.
5. Em `401`, interceptor chama refresh e refaz a requisicao original.

## Observacoes de seguranca

- Seeds atuais usam senha em texto puro.
- O backend aceita texto puro e bcrypt para permitir migracao gradual sem quebrar o banco atual.
