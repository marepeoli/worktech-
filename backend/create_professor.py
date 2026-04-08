from app.db.session import SessionLocal
from app.db.models import Usuario, ProfessorModalidade
from datetime import datetime, time
import bcrypt

db = SessionLocal()

# Criar professor (se não existir)
professor = db.query(Usuario).filter(Usuario.email == 'professor@test.com').first()
if not professor:
    # Usar bcrypt para hashear senha
    senha_hash = bcrypt.hashpw(b'123456', bcrypt.gensalt()).decode()
    professor = Usuario(
        nome='Carlos Professor',
        email='professor@test.com',
        senha=senha_hash,
        role='PROFESSOR',
        created_at=datetime.now()
    )
    db.add(professor)
    db.commit()
    db.refresh(professor)
    print(f'Professor criado: {professor.id}')
else:
    print(f'Professor já existe: {professor.id}')

# Adicionar modalidades
modalidades = [
    ('Musculação', '1', time(6, 0), time(7, 0)),
    ('Musculação', '3', time(6, 0), time(7, 0)),
    ('Musculação', '5', time(6, 0), time(7, 0)),
    ('Crossfit', '2', time(18, 0), time(19, 0)),
    ('Crossfit', '4', time(18, 0), time(19, 0)),
]

for mod, dia, inicio, fim in modalidades:
    existing = db.query(ProfessorModalidade).filter(
        ProfessorModalidade.professor_id == professor.id,
        ProfessorModalidade.modalidade == mod,
        ProfessorModalidade.dia_semana == dia
    ).first()
    if not existing:
        prof_mod = ProfessorModalidade(
            professor_id=professor.id,
            modalidade=mod,
            dia_semana=dia,
            hora_inicio=inicio,
            hora_fim=fim,
            created_at=datetime.now()
        )
        db.add(prof_mod)
        print(f'Adicionado: {mod} em dia {dia}')
    else:
        print(f'Já existe: {mod} em dia {dia}')

db.commit()
print('Dados de teste criados com sucesso!')
db.close()
