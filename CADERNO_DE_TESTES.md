# Caderno de Testes

## Objetivo

Validar o fluxo principal do app VAMP Performance por tela, cobrindo navegacao, autenticacao, permissao por perfil, consulta de dados e a regra de negocio principal de check-in.

## Ambiente

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:8000`
- Banco: `vamp_db`
- Data de referencia dos testes: `31/03/2026`

## Perfis de teste

### Alunos

| Nome | Login | Senha | Modalidade esperada |
| --- | --- | --- | --- |
| Mariana Oliveira | mare.oliveira@icloud.com | 123456 | Futsal Feminino |
| Dayane Silva | dayane@gmail.com | 123456 | Futsal Feminino |
| Fernanda Ramos | fernanda.ramos@vamp.local | 123456 | Volei Quadra |
| Alan Ribeiro | alan.ribeiro@vamp.local | 123456 | Basquete |
| Giovana Borghesi | giovana.borghesi@vamp.local | 123456 | Volei Quadra |
| Paula Alta Performance | paula.altaperformance@vamp.local | 123456 | Alta Performance |
| Marcos Futsal Masculino | marcos.futsal@vamp.local | 123456 | Futsal Masculino |
| Bruna Volei de Praia | bruna.voleipraia@vamp.local | 123456 | Volei de Praia |

### Admin

| Perfil | Login | Senha | Observacao |
| --- | --- | --- | --- |
| Admin | admin | admin | Enxerga todos os treinos no calendario, mas nao faz check-in |

## Massa de dados esperada

### Treinos futuros cadastrados

| Modalidade | Data | Hora | Local |
| --- | --- | --- | --- |
| Futsal Feminino | 01/04/2026 | 19:00 | conforme cadastro atual |
| Futsal Feminino | 04/04/2026 | 09:00 | conforme cadastro atual |
| Futsal Feminino | 05/04/2026 | 10:00 | conforme cadastro atual |
| Alta Performance | 02/04/2026 | conforme cadastro atual | conforme cadastro atual |
| Volei Quadra | 04/04/2026 | 10:30 | conforme cadastro atual |
| Volei de Praia | 06/04/2026 | conforme cadastro atual | conforme cadastro atual |
| Basquete | 01/04/2026 | 20:30 | conforme cadastro atual |
| Futsal Masculino | 31/03/2026 | conforme cadastro atual | conforme cadastro atual |

### Regras principais a validar

1. Usuario sem login valido nao entra no app.
2. Rotas internas exigem autenticacao.
3. Aluno ve apenas treinos da modalidade em que esta matriculado.
4. Admin ve todos os treinos no calendario.
5. Admin nao consegue confirmar check-in.
6. Aluno consegue fazer apenas 1 check-in por treino.
7. Aluno pode cancelar check-in ate 1 hora antes da aula com justificativa.
8. Lista de confirmados e atualizada apos check-in/cancelamento.
9. Professor, quando existir conta `prof*`, deve ver notificacoes e lista de presenca.

## Checklist rapido de smoke test

| ID | Tela | Perfil | Resultado esperado |
| --- | --- | --- | --- |
| ST-01 | Login | Todos | Login com credenciais validas redireciona para Home |
| ST-02 | Home | Aluno | Atalhos para Check-in, Modalidades e Eventos funcionam |
| ST-03 | Check-in | Aluno | Calendario aparece e dias da modalidade ficam destacados |
| ST-04 | Check-in | Admin | Calendario aparece com todos os treinos e sem botao de check-in funcional |
| ST-05 | Modalidades | Aluno/Admin | Cards e navegacao carregam sem erro |
| ST-06 | Eventos | Aluno/Admin | Lista de eventos carrega sem erro |
| ST-07 | Recomendacoes | Aluno/Admin | Lista de recomendacoes abre sem erro |
| ST-08 | Perfil | Aluno/Admin | Dados do usuario aparecem corretamente |
| ST-09 | Notificacoes | Aluno/Admin | Tela abre sem quebrar layout |
| ST-10 | Admin | Admin | CRUD principal carrega dados de treino, evento, recomendacao, atletas e matriculas |

## Casos de teste por tela

### CT-LOGIN-01 - Login com aluno valido

- Perfil: Aluno
- Login: `mare.oliveira@icloud.com`
- Senha: `123456`
- Passos:
  1. Acessar `/login`.
  2. Informar login e senha validos.
  3. Clicar em `Entrar`.
- Resultado esperado:
  1. Usuario entra no sistema.
  2. App redireciona para `/home`.
  3. Nome/perfil carregam sem erro visivel.

### CT-LOGIN-02 - Login invalido

- Perfil: Qualquer
- Passos:
  1. Acessar `/login`.
  2. Informar senha incorreta.
  3. Clicar em `Entrar`.
- Resultado esperado:
  1. Usuario permanece na tela de login.
  2. Mensagem de erro aparece.

### CT-HOME-01 - Atalhos da Home

- Perfil: Aluno
- Passos:
  1. Entrar com um aluno valido.
  2. Abrir Home.
  3. Clicar nos atalhos `Check In`, `Modalidades` e `Eventos`.
- Resultado esperado:
  1. Cada atalho abre a tela correta.
  2. Navegacao inferior tambem funciona.

### CT-HOME-02 - Acesso ao Admin pela Home

- Perfil: Admin
- Login: `admin`
- Senha: `admin`
- Passos:
  1. Entrar com admin.
  2. Abrir menu do usuario.
  3. Clicar em `Admin`.
- Resultado esperado:
  1. Rota `/admin` abre sem bloqueio.

### CT-CHECKIN-01 - Calendario visivel para aluno

- Perfil: Aluno Futsal
- Login: `dayane@gmail.com`
- Senha: `123456`
- Passos:
  1. Entrar com o aluno.
  2. Ir para `/checkin`.
- Resultado esperado:
  1. Calendario aparece literalmente na tela.
  2. Modalidade vem preenchida com a modalidade do aluno.
  3. Dias do mes com treino da modalidade ficam destacados.
  4. Lista `Treinos disponiveis` aparece abaixo do calendario.

### CT-CHECKIN-02 - Selecao de dia no calendario

- Perfil: Aluno Futsal
- Passos:
  1. Na tela `/checkin`, clicar em um dia destacado.
  2. Observar a lista abaixo.
- Resultado esperado:
  1. O dia selecionado fica visualmente marcado.
  2. A lista de treinos continua mostrando as opcoes da modalidade no mes.
  3. O treino clicado fica associado ao dia selecionado.

### CT-CHECKIN-03 - Fazer check-in com confirmacao em modal

- Perfil: Aluno Futsal
- Passos:
  1. Na lista `Treinos disponiveis`, escolher um treino futuro.
  2. Clicar em `Fazer Check-in`.
  3. Confirmar no modal.
- Resultado esperado:
  1. Modal mostra data, horario e local.
  2. Check-in e confirmado com sucesso.
  3. Botao muda para estado confirmado.
  4. Treino aparece em `Seus ultimos checkins`.

### CT-CHECKIN-04 - Impedir segundo check-in no mesmo treino

- Perfil: Mesmo aluno do caso anterior
- Passos:
  1. Tentar confirmar novamente o mesmo treino.
- Resultado esperado:
  1. Sistema nao duplica o check-in.
  2. Estado continua como confirmado.

### CT-CHECKIN-05 - Cancelar check-in com justificativa

- Perfil: Aluno com check-in ja confirmado em treino com mais de 1 hora de antecedencia
- Passos:
  1. Selecionar treino confirmado.
  2. Acionar cancelamento.
  3. Informar justificativa valida.
  4. Confirmar.
- Resultado esperado:
  1. Cancelamento e salvo.
  2. Justificativa e exigida.
  3. Treino deixa de constar como confirmado.

### CT-CHECKIN-06 - Aluno ve somente sua modalidade

- Perfil: Alan Ribeiro
- Login: `alan.ribeiro@vamp.local`
- Senha: `123456`
- Passos:
  1. Entrar com Alan.
  2. Abrir `/checkin`.
- Resultado esperado:
  1. Calendario destaca apenas treinos de Basquete.
  2. Nao aparecem treinos de Futsal Feminino nem Volei Quadra.

### CT-CHECKIN-07 - Admin ve todos os treinos

- Perfil: Admin
- Login: `admin`
- Senha: `admin`
- Passos:
  1. Entrar com admin.
  2. Abrir `/checkin`.
  3. Trocar modalidade no seletor.
- Resultado esperado:
  1. Todas as modalidades cadastradas aparecem no seletor.
  2. Dias com treino do mes ficam destacados conforme a modalidade escolhida.
  3. A lista abaixo mostra todos os treinos daquela modalidade no mes.
  4. Tela fica em modo de visualizacao para admin.

### CT-CHECKIN-08 - Admin nao faz check-in

- Perfil: Admin
- Passos:
  1. Abrir `/checkin` com admin.
  2. Verificar a lista de treinos disponiveis.
- Resultado esperado:
  1. Nao existe fluxo funcional de confirmacao de check-in para admin.
  2. Mensagem de visualizacao admin aparece.

### CT-MOD-01 - Tela de Modalidades

- Perfil: Aluno e Admin
- Passos:
  1. Abrir `/modalidades`.
  2. Navegar pelos cards/modalidades disponiveis.
- Resultado esperado:
  1. A tela carrega imagens e informacoes sem quebrar layout.
  2. Navegacao inferior funciona.

### CT-EVENT-01 - Tela de Eventos

- Perfil: Aluno e Admin
- Passos:
  1. Abrir `/eventos`.
  2. Percorrer lista de eventos.
- Resultado esperado:
  1. Cards carregam corretamente.
  2. Se houver eventos do backend, dados substituem ou complementam os cards base.

### CT-REC-01 - Tela de Recomendacoes

- Perfil: Aluno e Admin
- Passos:
  1. Abrir `/recomendacoes`.
  2. Verificar lista/conteudo.
- Resultado esperado:
  1. Recomendacoes aparecem sem erro de renderizacao.

### CT-PERFIL-01 - Tela de Perfil

- Perfil: Aluno e Admin
- Passos:
  1. Abrir menu do usuario.
  2. Ir para `/perfil`.
- Resultado esperado:
  1. Dados do perfil aparecem conforme usuario logado.
  2. Acao de sair funciona.

### CT-NOTIF-01 - Tela de Notificacoes

- Perfil: Aluno e Admin
- Passos:
  1. Abrir `/notificacoes` pelo icone de sino.
- Resultado esperado:
  1. Tela abre sem erro.
  2. Contador/resumo, quando existir, e consistente com o estado atual.

### CT-ADMIN-01 - Carregamento do painel admin

- Perfil: Admin
- Passos:
  1. Entrar com admin.
  2. Abrir `/admin`.
- Resultado esperado:
  1. Dados de treinos, eventos, recomendacoes, atletas e matriculas carregam.
  2. Nao ocorre erro 403 nessa rota para admin.

### CT-ADMIN-02 - CRUD de treinos

- Perfil: Admin
- Passos:
  1. Criar um treino novo.
  2. Editar horario/local/frequencia.
  3. Excluir o treino criado para teste.
- Resultado esperado:
  1. Operacoes refletem na lista imediatamente apos reload dos dados.
  2. Alteracoes aparecem depois na tela de check-in.

### CT-ADMIN-03 - CRUD de eventos e recomendacoes

- Perfil: Admin
- Passos:
  1. Criar evento e recomendacao.
  2. Editar ambos.
  3. Excluir ambos.
- Resultado esperado:
  1. Operacoes persistem e recarregam na listagem.

### CT-ADMIN-04 - Atletas e matriculas

- Perfil: Admin
- Passos:
  1. Validar listagem de atletas.
  2. Validar listagem de matriculas em treino.
  3. Criar ou remover matricula de teste.
- Resultado esperado:
  1. Mudanca de matricula impacta os treinos exibidos no check-in do aluno correspondente.

## Roteiro sugerido de execucao

1. Executar smoke test completo com `admin` e `dayane@gmail.com`.
2. Validar check-in por modalidade com `alan.ribeiro@vamp.local`, `fernanda.ramos@vamp.local`, `paula.altaperformance@vamp.local`, `marcos.futsal@vamp.local` e `bruna.voleipraia@vamp.local`.
3. Validar impacto de alteracao no painel admin criando um treino e conferindo no calendario.
4. Validar cancelamento com justificativa e reflexo nas listas.

## Registro de execucao

Use esta tabela para anotar os resultados manualmente.

| Caso | Perfil | Status | Evidencia | Observacoes |
| --- | --- | --- | --- | --- |
| CT-LOGIN-01 |  |  |  |  |
| CT-HOME-01 |  |  |  |  |
| CT-CHECKIN-01 |  |  |  |  |
| CT-CHECKIN-03 |  |  |  |  |
| CT-CHECKIN-05 |  |  |  |  |
| CT-CHECKIN-07 |  |  |  |  |
| CT-ADMIN-01 |  |  |  |  |
| CT-ADMIN-02 |  |  |  |  |
