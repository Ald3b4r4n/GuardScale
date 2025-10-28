# 🛡️ GuardScale

<img src="public/favicon.svg" alt="GuardScale logo" height="64" />

[![Node](https://img.shields.io/badge/Node-18%2B-339933?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-47A248?logo=mongodb)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-blue)](#licença)
[![Made with](https://img.shields.io/badge/Made%20with-JavaScript-F7DF1E?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

Plataforma simples para gestão de agentes, turnos (shifts), geração de escalas, relatórios e exportação em PDF. Interface responsiva com modo escuro e cartões em telas menores.

> Dica: em produção, ative `secure=true` nos cookies e troque o `JWT_SECRET`. Veja a seção “Boas Práticas”.

## Sumário

- [Visão Geral](#visão-geral)
- [Conceitos](#conceitos)
- [Requisitos](#requisitos)
- [Instalação e Setup](#instalação-e-setup)
- [Navegação (Frontend)](#navegação-frontend)
- [Autenticação](#autenticação)
- [Arquitetura](#arquitetura)
- [Resumo Visual de Rotas](#resumo-visual-de-rotas)
- [Rotas da API](#rotas-da-api)
- [Exemplos (curl)](#exemplos-curl)
- [Desenvolvimento](#desenvolvimento)
- [Boas Práticas e Segurança](#boas-práticas-e-segurança)
- [Licença](#licença)

## Visão Geral

- Gestão de agentes com validações de CPF/telefone e status.
- Turnos individuais com cálculo de duração, virada de dia e persistência idempotente.
- Geração de escalas por período com opções de horários e duração dos turnos.
- Relatórios consolidados por período, por agente e totais gerais.
- Exportação em PDF das escalas e integração em tempo real via Socket.IO.

## Conceitos

- `Usuários` e papéis: autenticação por cookie (`gs_auth`) com JWT. Papéis principais: `admin` (acesso global) e usuários não-admin (escopo por tenant).
- `Tenant` e escopo: para não-admin, os dados são filtrados por `tenantId = req.user.sub`. Admin enxerga todos os registros.
- `Agente` (Agent): nome, telefone, CPF, chave PIX, valor hora, status e avatar. Associado a um `tenantId`.
- `Turno` (Shift): `agentId`, `date`, `start`, `end`, `location`, `notes`, `durationHours`, `isOvernight`, `is24h`, `endDate?`, `tenantId`. Operações CRUD com revalidação e logs.
- `Escala` (Schedule): geração em massa de turnos a partir de período, horários e agentes selecionados; persistência via `bulkWrite` com upsert.
- `Logs` e realtime: todas as operações relevantes registram em `Log`. Eventos `data-update` são emitidos no Socket.IO para clientes conectados.

## Requisitos

- Node.js 18+
- MongoDB local ou remoto acessível via `MONGO_URI`
- Tailwind CSS CLI (instalado via devDependencies)

## Instalação e Setup

1. Instale dependências:

```
npm install
```

2. Configure o `.env` (exemplo):

```
MONGO_URI=mongodb://127.0.0.1:27017/guardscale
JWT_SECRET=troque_este_segredo_em_producao
ADMIN_EMAIL=admin@local
ADMIN_PASSWORD=admin123
NODE_ENV=development
TZ=America/Sao_Paulo
# CORS permitido (separe por vírgula, p.ex. http://localhost:3000)
# CORS_ORIGIN=http://localhost:3000

# SMTP (opcional, para /api/auth/request)
SUPPORT_EMAIL_TO=seuemail@dominio.com
SUPPORT_EMAIL_FROM=GuardScale <no-reply@dominio.com>
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=usuario@gmail.com
SMTP_PASS=senha_de_app
```

3. Compile o CSS do Tailwind para `public/assets/tw.css`:

```
npm run build:css
```

4. Inicie o servidor:

```
npm start
```

Abra `http://localhost:3000`.

> Nota: você também pode usar `npm run dev` para hot-reload durante o desenvolvimento.

## Banco de Dados (MongoDB)

- Usa MongoDB com coleções: `users`, `agents`, `shifts`, `logs`.
- Conexão via `MONGO_URI` no `.env` (não publique segredos em repositórios).

### Criar a base local (mongosh)

```
mongosh
use guardscale
db.createCollection("users")
db.createCollection("agents")
db.createCollection("shifts")
db.createCollection("logs")
```

### Índices recomendados

Baseado nos modelos Mongoose do projeto:

```
// Users: e-mail único
db.users.createIndex({ email: 1 }, { unique: true })

// Agents: buscas por nome e por tenant
db.agents.createIndex({ name: 1 })
db.agents.createIndex({ tenantId: 1, name: 1 })

// Shifts: impedir duplicidade e facilitar filtros por tenant
db.shifts.createIndex({ agentId: 1, date: 1, start: 1 }, { unique: true })
db.shifts.createIndex({ tenantId: 1, date: 1, start: 1 })

// Logs: ordenação por timestamp
db.logs.createIndex({ ts: 1 })
```

### Conexão segura

- Desenvolvimento local: `MONGO_URI=mongodb://127.0.0.1:27017/guardscale`.
- Atlas/Cloud: use `mongodb+srv://<usuario>:<senha>@<cluster>/guardscale` com usuário de aplicação e IPs permitidos.
- Nunca comite `.env`; mantenha apenas um `.env.example` com placeholders.

### Docker (opcional)

```
docker run -d --name guardscale-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=guardscale \
  mongo:6
```

### Seed de admin e segurança

- O servidor cria um administrador se não houver usuários (usa `ADMIN_EMAIL`/`ADMIN_PASSWORD`).
- Em produção, defina credenciais fortes via variáveis de ambiente e troque `JWT_SECRET`.
- Não exponha e-mails reais, CPFs, telefones ou chaves PIX em exemplos públicos.

## Navegação (Frontend)

- `#agents` — cadastro e busca de agentes (lista com tabela em desktop e cartões no mobile).
- `#users` — administração de usuários (apenas admin), com cartões no mobile.
- `#schedules` — geração de escalas, criação/edição/remoção de turnos; visualização em tabela e cartões.
- `#reports` — consolidação de métricas e totais.

Em telas pequenas, a tabela é ocultada e os itens aparecem como cartões com os mesmos botões de ação (editar, excluir).

## Autenticação

- Cookie httpOnly `gs_auth` com `SameSite=lax` e `secure=true` em produção.
- Seed automático do admin quando não há usuários: `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- Rate-limit de login: 20 solicitações por 15 minutos.

## Arquitetura

- Frontend estático: arquivos em `public/` servidos diretamente (HTML, CSS, JS).
- Backend: `Express` exportado em `server.js` e empacotado como Function (`api/index.js`).
- Persistência: `MongoDB` via `mongoose`.
- Autenticação: JWT assinado no cookie httpOnly `gs_auth`.
- Funcionalidades: CRUD de usuários/agentes/turnos, geração de escalas e PDF.

### Fluxo de Autenticação

1. Usuário envia `POST /api/auth/login` com `{ email, password }`.
2. Servidor valida credenciais no MongoDB e, em caso de sucesso, grava o cookie `gs_auth` (2h).
3. O frontend consulta `GET /api/auth/me` para obter `{ id, email, role }` e montar a interface.
4. `POST /api/auth/logout` limpa o cookie; `POST /api/auth/change-password` troca a senha.

## Resumo Visual de Rotas

| Grupo                    | Principais Endpoints                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 🔐 Auth                  | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`, `POST /auth/request` |
| 👥 Usuários              | `GET /users`, `POST /users`, `POST /users/:id/reset-password`, `PUT /users/:id`, `DELETE /users/:id`        |
| 🧑‍✈️ Agentes               | `GET /agents`, `POST /agents`, `PUT /agents/:id`, `DELETE /agents/:id`                                      |
| 🕒 Turnos                | `GET /shifts`, `POST /shifts`, `PUT /shifts/:id`, `DELETE /shifts/:id`                                      |
| 📅 Escalas               | `POST /schedules/generate`, `POST /schedules/pdf`                                                           |
| 🛠️ Debug & 📊 Relatórios | `GET /debug/shifts`, `POST/GET /debug/cleanup-orphan-shifts`, `GET /reports`                                |

## Rotas da API

Todas as rotas abaixo (exceto as de autenticação e `POST /api/auth/request`) exigem sessão ativa. Não-admin opera restrito ao seu `tenantId`.

### Auth

- POST `/api/auth/login`

  - Body: `{ email, password }`
  - Retorna: `{ ok: true, user }` e grava cookie `gs_auth` (2h).

- POST `/api/auth/logout`

  - Limpa cookie e retorna `{ ok: true }`.

- GET `/api/auth/me`

  - Retorna `{ id, email, role }` do usuário logado.

- POST `/api/auth/change-password`

  - Body: `{ currentPassword, newPassword }`
  - Política de senha: mínimo 8, maiúscula, minúscula, número e símbolo.
  - Retorna `{ ok: true }`.

- POST `/api/auth/request`
  - Body: `{ type: 'forgot_password'|'create_access', email, payload? }`
  - Registra solicitação e tenta enviar e-mail (assíncrono). Retorna `{ ok: true, queued: true }`.

### Usuários (apenas admin)

- GET `/api/users`

  - Lista `{ email, role, active, createdAt }`.

- POST `/api/users`

  - Body: `{ email, password, role='user' }`
  - Retorna `{ id, email, role, active }`.

- POST `/api/users/:id/reset-password`

  - Body: `{ newPassword }` (segue política de senha forte).
  - Retorna `{ ok: true }`.

- PUT `/api/users/:id`

  - Body: `{ role?, active?, email? }` (verifica conflito de e-mail).
  - Retorna `{ id, email, role, active }`.

- DELETE `/api/users/:id`
  - Remove o usuário. Bloqueios: não permite excluir a si mesmo, nem o último admin ativo.
  - Retorna `{ ok: true }`.

### Agentes

- GET `/api/agents?q=...`

  - Filtro por `name`, `cpf` ou `phone` (regex case-insensitive). Ordena por nome.

- POST `/api/agents`

  - Body obrigatório: `{ name, phone, cpf, pix }`
  - Opcionais: `{ hourlyRate, status='disponível', avatarUrl }`
  - Valida CPF/telefone. Retorna agente criado (associado ao `tenantId`).

- PUT `/api/agents/:id`

  - Atualiza campos com validação opcional de CPF/telefone. Retorna agente atualizado.

- DELETE `/api/agents/:id`
  - Remove o agente e apaga todos os turnos vinculados (inclui formatos legados de `agentId`).
  - Retorna `{ ok: true, shiftsDeleted }`.

### Turnos (Shifts)

- GET `/api/shifts?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&agentId=`

  - Lista turnos no período e/ou por agente. Ordena por `date` e `start`.

- POST `/api/shifts`

  - Body obrigatório: `{ agentId, date, start, end }`
  - Opcionais: `{ location, notes }`
  - Idempotente (upsert por `agentId+date+start`). Retorna `201` com documento criado ou `{ ok: true, existed: true, shift }`.

- PUT `/api/shifts/:id`

  - Recalcula duração/virada (`isOvernight`, `is24h`, `endDate`) ao atualizar `start`, `end`, `notes`. Retorna documento atualizado.

- DELETE `/api/shifts/:id`
  - Remove turno e emite evento realtime. Retorna `{ ok: true }`.

### Escalas (Geração)

- POST `/api/schedules/generate`

  - Body: `{ period, startDate, endDate, shiftLengths=[8], startTimes=['08:00'], selectedAgentIds=[], notes }`
  - Persiste via `bulkWrite` com upsert e retorna `{ schedule, persistedCount }`.

- POST `/api/schedules/pdf`
  - Body: `{ title='Escala', items=[{ date, agentName, start, end, durationHours }] }`
  - Retorna PDF (`Content-Type: application/pdf`, `Content-Disposition: inline`).

### Debug e Relatórios

- GET `/api/debug/shifts`

  - Lista turnos com `agentName` enriquecido.

- POST/GET `/api/debug/cleanup-orphan-shifts`

  - Remove turnos órfãos cujos `agentId` não existem mais. Retorna `{ removed }`.

- GET `/api/reports?period=monthly&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - Consolida métricas usando `computeReports` (por agente e totais gerais). Retorna objeto de relatório.

## Rotas — Visual Interativo

<details>
  <summary><strong>🔐 Auth</strong> — login, sessão e solicitações</summary>

- `POST /api/auth/login` — autentica e grava cookie `gs_auth`.
- `POST /api/auth/logout` — encerra sessão.
- `GET /api/auth/me` — dados do usuário logado.
- `POST /api/auth/change-password` — troca de senha (política forte).
- `POST /api/auth/request` — suporte: esquecer senha/criar acesso.

</details>

<details>
  <summary><strong>👥 Usuários (admin)</strong> — gestão de contas</summary>

- `GET /api/users` — lista usuários.
- `POST /api/users` — cria usuário.
- `POST /api/users/:id/reset-password` — reseta senha.
- `PUT /api/users/:id` — atualiza papel, ativo e e-mail.

</details>

<details>
  <summary><strong>🧑‍✈️ Agentes</strong> — cadastro e validações</summary>

- `GET /api/agents` — busca com filtros `q` e por tenant.
- `POST /api/agents` — cria com validações de CPF/telefone.
- `PUT /api/agents/:id` — atualiza campos e validações opcionais.
- `DELETE /api/agents/:id` — remove e apaga turnos associados (legados incluídos).

</details>

<details>
  <summary><strong>🕒 Turnos</strong> — CRUD com idempotência</summary>

- `GET /api/shifts` — lista por período e agente.
- `POST /api/shifts` — cria idempotente por `agentId+date+start`.
- `PUT /api/shifts/:id` — recálculo de duração/overnight/24h.
- `DELETE /api/shifts/:id` — remove e emite `data-update`.

</details>

<details>
  <summary><strong>📅 Escalas</strong> — geração em massa e PDF</summary>

- `POST /api/schedules/generate` — gera e persiste via `bulkWrite`.
- `POST /api/schedules/pdf` — gera PDF com título e itens.

</details>

<details>
  <summary><strong>🛠️ Debug & 📊 Relatórios</strong> — manutenção e insights</summary>

- `GET /api/debug/shifts` — lista todos os turnos com `agentName`.
- `POST/GET /api/debug/cleanup-orphan-shifts` — limpa órfãos.
- `GET /api/reports` — consolida métricas por período.

</details>

## Exemplos (curl)

Login e uso com cookie:

```
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@local","password":"admin123"}' \
  http://localhost:3000/api/auth/login

curl -b cookies.txt http://localhost:3000/api/auth/me
```

Criar agente:

```
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"name":"João Silva","phone":"(11) 99999-9999","cpf":"123.456.789-09","pix":"joao@pix.com"}' \
  http://localhost:3000/api/agents
```

Criar turno idempotente:

```
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"agentId":"<ID_DO_AGENTE>","date":"2025-01-01","start":"08:00","end":"16:00","location":"Posto A"}' \
  http://localhost:3000/api/shifts
```

Gerar escala semanal (persistência em massa):

```
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"period":"weekly","startDate":"2025-01-01","endDate":"2025-01-07","shiftLengths":[8],"startTimes":["08:00","16:00"],"selectedAgentIds":["<ID1>","<ID2>"],"notes":"Escala da semana"}' \
  http://localhost:3000/api/schedules/generate
```

Gerar PDF de escala:

```
curl -b cookies.txt -H "Content-Type: application/json" \
  -d '{"title":"Escala Janeiro","items":[{"date":"2025-01-01","agentName":"João","start":"08:00","end":"16:00","durationHours":8}]}' \
  http://localhost:3000/api/schedules/pdf --output escala.pdf
```

## Desenvolvimento

- Estilos: executar `npm run build:css` após alterar `public/tw.css`.
- CORS: definir `CORS_ORIGIN` com uma ou mais origens separadas por vírgula.
- Realtime: clientes escutam `data-update` (`agent`, `shift`, `schedule`) e `status` via Socket.IO.

### Variáveis de Ambiente (tabela rápida)

| Nome                 | Descrição                    | Exemplo                                |
| -------------------- | ---------------------------- | -------------------------------------- |
| `MONGO_URI`          | Conexão com MongoDB          | `mongodb://127.0.0.1:27017/guardscale` |
| `JWT_SECRET`         | Segredo do JWT (cookies)     | `troque_este_segredo_em_producao`      |
| `ADMIN_EMAIL`        | E-mail seed do admin         | `admin@local`                          |
| `ADMIN_PASSWORD`     | Senha seed do admin          | `admin123`                             |
| `CORS_ORIGIN`        | Origens permitidas (vírgula) | `http://localhost:3000`                |
| `SUPPORT_EMAIL_TO`   | Destinatário suporte         | `suporte@dominio.com`                  |
| `SUPPORT_EMAIL_FROM` | Remetente suporte            | `GuardScale <no-reply@dominio.com>`    |
| `SMTP_*`             | Config SMTP                  | `HOST/PORT/SECURE/USER/PASS`           |

### Scripts disponíveis

- `npm start` — inicia servidor em modo normal.
- `npm run dev` — inicia em desenvolvimento com hot-reload.
- `npm run build:css` — compila Tailwind para `public/assets/tw.css`.
- `npm run lint` — executa ESLint.

## Boas Práticas e Segurança

- Troque `JWT_SECRET` em produção e não versionar `.env` com segredos reais.
- Cookies httpOnly; `secure` ativo em produção. Helmet e rate-limits habilitados.
- Log de operações relevantes mantido em banco (`src/models/Log`).

## Licença

ISC — © Antonio Rafael Souza Cruz de Noronha
