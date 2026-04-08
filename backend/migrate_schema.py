import psycopg

conn = psycopg.connect("postgresql://postgres:Mona%402010@localhost:5432/vamp_db")
cur = conn.cursor()

# Adicionar coluna role a usuario se não existir
try:
    cur.execute("ALTER TABLE usuario ADD COLUMN role TEXT DEFAULT 'USER' NOT NULL;")
    print("Coluna 'role' adicionada a tabela usuario")
except psycopg.errors.DuplicateColumn:
    print("Coluna 'role' já existe em usuario")

# Criar tabela professor_modalidades
try:
    cur.execute("""
    CREATE TABLE IF NOT EXISTS professor_modalidades (
        id SERIAL PRIMARY KEY,
        professor_id INTEGER NOT NULL REFERENCES usuario(id),
        modalidade TEXT NOT NULL,
        dia_semana TEXT NOT NULL,
        hora_inicio TIME NOT NULL,
        hora_fim TIME NOT NULL,
        created_at TIMESTAMP NOT NULL,
        UNIQUE(professor_id, modalidade, dia_semana)
    )
    """)
    print("Tabela 'professor_modalidades' criada")
except Exception as e:
    print(f"Erro ao criar professor_modalidades: {e}")

# Criar tabela presencas
try:
    cur.execute("""
    CREATE TABLE IF NOT EXISTS presencas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuario(id),
        treino_id INTEGER NOT NULL REFERENCES treinos(id),
        professor_id INTEGER NOT NULL REFERENCES usuario(id),
        presente BOOLEAN NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP NOT NULL,
        UNIQUE(usuario_id, treino_id)
    )
    """)
    print("Tabela 'presencas' criada")
except Exception as e:
    print(f"Erro ao criar presencas: {e}")

conn.commit()
cur.close()
conn.close()
print("Migrações concluídas!")
