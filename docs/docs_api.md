# FBRzap — Briefing Técnico Consolidado
> Respostas pré-preenchidas com o que já está consolidado na infra OpenClaw/ARVA
> Para revisão do Sergio antes de enviar ao dev
> Maio 2026

**Legenda:**
- ✅ **Consolidado** — informação que já existe e está em produção
- ⚠️ **Decisão sua** — depende de uma escolha de arquitetura que ainda não foi feita
- 🔲 **Pergunta para o dev** — só o dev pode responder (e provavelmente nem ele ainda sabe, porque o FBRzap não existe)

---

## Decisões de arquitetura que precisam ser tomadas ANTES de mandar pro dev

Três pontos travam o briefing inteiro. Sem decidir esses, metade das perguntas vira fumaça:

**1. Onde mora o banco do FBRzap?**
Os agentes hoje estão no **PostgreSQL `openclaw_dashboard` da VPS2** — não no Supabase. Opções:
- **(A)** FBRzap consome direto o Postgres da VPS via API do `api.mjs` — agentes ficam onde estão, FBRzap só precisa de suas próprias tabelas (users, chats, messages, groups, distribution_lists). Mais simples, menos sync.
- **(B)** Sobe um **Supabase novo** que espelha agentes via job de sync com o `openclaw_dashboard`, e tem todas as tabelas do FBRzap. Mais isolamento, mas duplica fonte de verdade.
- **(C)** Migra tudo (agentes + FBRzap) para um Supabase único. Decisão grande, exige mover ARVA Platform também.

Recomendo **(A) para v1**: o FBRzap só precisa do que é dele (chat/users/grupos). A leitura de agentes pode ser proxy via `GET /api/agents` do OpenClaw. Isso evita sync e mantém o `openclaw_dashboard` como fonte única.

**2. Streaming de resposta — sim ou não no v1?**
O `api.mjs` hoje **não tem streaming SSE** para chat — o endpoint `POST /api/chat/:agentId` é request/response síncrono (recebe a mensagem inteira de volta após 5–45s). Opções:
- **(A)** v1 sem streaming, com indicador "digitando..." baseado em status — mais rápido de entregar.
- **(B)** Implementa SSE no `api.mjs` antes do FBRzap — adiciona ~1 semana de backend.

Recomendo **(A)** — Telegram-like funciona perfeitamente sem streaming visível; o "digitando..." dá a sensação certa.

**3. Grupos chamam agentes — como?**
Hoje no Telegram, grupo precisa de `@mention` para o agente responder (`requireMention: true` no openclaw.json). No FBRzap, mantemos isso? Ou todo grupo tem um agente "designado" que sempre escuta?

Recomendo manter o padrão Telegram: **mention explícita**. Grupos sem mention não ativam agente — economiza chamadas LLM e evita ruído.

---

## 1. Openclaw / VPS — ✅ totalmente consolidado

**URL base (produção):** `https://dashboard.fbrapps.com`
**Porta interna:** `19010` (Express, `api.mjs`)
**Protocolo:** HTTPS / REST (JSON). Sem WebSocket nem SSE hoje.
**Proxy:** Easypanel na frente do Express na VPS2 (`srv1300318`, `76.13.168.223`). Easypanel termina TLS e proxia para `127.0.0.1:19010`.
**Ambientes disponíveis:** **só produção** (`dashboard.fbrapps.com`). Não existe staging nem dev hoje. ⚠️ Se o dev exigir staging para o FBRzap, decidir: subir staging da VPS2 ou mockar `api.mjs` em dev local.

---

## 2. Wake-up do agente — ✅ não existe wake-up explícito

O OpenClaw não tem conceito de "acordar agente". O `api.mjs` roda permanentemente via `systemctl` (`openclaw.service`), e todos os agentes ficam "sempre disponíveis" — a primeira mensagem já dispara a sessão.

- **Endpoint de chat:** `POST /api/chat/:agentId` (já é o wake-up implícito)
- **Identificação:** sempre por `agent_id` (slug minúsculo, ex: `bia`, `chiara`, `tina`, `kate`)
- **Sessão:** quando uma mensagem chega para um agente cuja sessão não está em cache (`/home/openclaw/.openclaw/agents/{id}/sessions/*.json`), o OpenClaw carrega os MDs do workspace, monta o contexto via SMTLoader e responde. **Não é fila** — processamento síncrono por agente.
- **Tempo médio até primeira resposta:**
  - Sessão quente (cache): 3–8s
  - Sessão fria (primeiro contato após restart): 8–15s
  - ORACLE (Opus): 15–45s

**Para o FBRzap:** não precisa endpoint separado de wake-up. Manda direto pro `/api/chat/:agentId` com a mensagem e mostra "digitando..." enquanto espera.

---

## 3. Conversa com o agente — ✅ consolidado

**Endpoint:** `POST https://dashboard.fbrapps.com/api/chat/:agentId`
**Método:** HTTP POST, `Content-Type: application/json`
**Streaming:** **não** (resposta única — ver Decisão #2)

**Payload de request:**
```json
{
  "message": "texto da mensagem do usuário",
  "history": [
    { "role": "user", "content": "msg anterior 1" },
    { "role": "assistant", "content": "resposta anterior 1" }
  ]
}
```

**Payload de response:**
```json
{
  "ok": true,
  "reply": "resposta do agente em texto",
  "meta": {
    "model": "z-ai/glm-4.7",
    "tokens_in": 1240,
    "tokens_out": 380,
    "duration_ms": 4200
  }
}
```

**Eventos/status:** não existem hoje (`waking`, `typing`, etc.). Para o FBRzap:
- Mostrar "digitando..." enquanto a request HTTP estiver pendente
- Timeout sugerido: 60s (cobre Opus e modelos lentos)
- Erro: response com `{ "ok": false, "error": "..." }` ou HTTP 4xx/5xx

⚠️ **Decisão:** se quiser eventos reais (`typing`, `processing`), implementar SSE no `api.mjs` antes — não está pronto.

---

## 4. Autenticação com Openclaw — ✅ consolidado

Dois esquemas coexistem:

**(a) JWT Bearer — para usuários admin do dashboard:**
```
POST /api/auth/login
Body: { "email": "...", "password": "..." }
Response: { "ok": true, "token": "eyJhbG..." }

Uso: Authorization: Bearer eyJhbG...
```

**(b) API Key — para integrações backend-to-backend:**
```
Authorization: ApiKey oc_live_XXXXXXXXXXXXXXXXXXXX...
```

**Para o FBRzap, recomendo API Key.** O backend do FBRzap autentica seus próprios usuários (Supabase Auth ou outro), e fala com o OpenClaw via uma única ApiKey de servidor. **Nunca expor a ApiKey no app mobile** — sempre proxy via backend.

**Credenciais:**
- ApiKey já existente (escopos: `oracle`, `sprint`, `checkin`): `oc_live_6e99700dcccf30d8aebca558733ab9f7a62e8ce57ed93c964f70aba91a812a3e`
- ⚠️ **Decisão:** criar uma ApiKey nova específica do FBRzap com escopo `chat` (precisa adicionar esse escopo no `api.mjs` se ainda não existe). Recomendo criar — assim revogar o FBRzap não afeta ORACLE/Sprint.

**Armazenamento da ApiKey no banco:** SHA-256 hash + prefix (raw key nunca persiste). Middleware `authOrApiKey` hashea o header antes de buscar.

**Credencial por ambiente:** só prod existe (ver §1).
**Timeout recomendado:** 60s no client (Opus chega a 45s).
**Rate limit:** **não há rate limit implementado** no `api.mjs` hoje. ⚠️ Para o FBRzap precisa adicionar — sugestão: 30 req/min por ApiKey, 10 req/min por usuário final.
**IP allowlist / firewall:** sem allowlist hoje, apenas Easypanel firewall padrão. Se quiser restringir o tráfego do FBRzap, dá pra adicionar via nginx ou Cloudflare.

---

## 5. Sessão e memória — ✅ consolidado

**Sessão usada?** Sim, mas é **gerenciada pelo OpenClaw**, não pelo client.

**Granularidade:** sessão é **por par `(agent_id, channel_id)`**. Hoje cada conta Telegram tem sua sessão. Para o FBRzap, a chave natural é `(agent_id, fbrzap_chat_id)` — cada chat individual tem sua sessão.

**Cache de sessão:** `/home/openclaw/.openclaw/agents/{agent_id}/sessions/*.json` na VPS2.

**Expira?** Não expira por timeout — fica até ser limpa manualmente ou até o OpenClaw reiniciar (e mesmo após restart, o JSON persiste). **Cuidado:** sessão "stale" causa problemas — após editar `TOOLS.md` ou `SOUL.md`, é preciso limpar `sessions/*.json`.

**Memória:** o agente mantém memória própria via protocolo **SMT (Smart Memory Transhipment)** — 5 camadas:
1. Working memory (sessão ativa)
2. Short-term (`MEMORY.md`, TTL 7–30d)
3. Mid-term (`MEMORY_MID.md`, TTL 60–180d)
4. Long-term (`MEMORY_LONG.md`, permanente)
5. Archive (banco com pgvector — pesquisável)

**O backend FBRzap precisa reenviar histórico?** Recomendação: **sim, mandar histórico recente no `history[]` do payload** (últimas 10–20 mensagens), mesmo o OpenClaw tendo memória interna. Motivo: a memória SMT é semântica/comprimida, enquanto o histórico literal da conversa atual é mais útil para continuidade conversacional. O `api.mjs` já aceita `history[]` no `/api/chat/:agentId`.

**Endpoint para recuperar sessão/histórico do OpenClaw?** Não existe endpoint público. O OpenClaw guarda o estado, mas não expõe. **O FBRzap deve guardar seu próprio histórico** na sua tabela `messages` — essa é a fonte de verdade da UI.

---

## 6. Supabase: agentes — ⚠️ depende da Decisão #1

**Hoje os agentes NÃO estão no Supabase.** Estão no PostgreSQL `openclaw_dashboard` na VPS2.

Schema atual da tabela `agents` (PostgreSQL VPS2):

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | VARCHAR(100) PK | slug (`bia`, `chiara`, `tina`...) |
| `name` | VARCHAR(200) | nome completo |
| `role` | TEXT | função |
| `model` | VARCHAR(200) | modelo OpenRouter primário |
| `fallback_model` | VARCHAR(200) | modelo fallback |
| `workspace_path` | TEXT | `/home/openclaw/.openclaw/workspace-{id}` |
| `color` | VARCHAR(20) | cor hex |
| `active` | BOOLEAN | online/offline |
| `email` | VARCHAR(200) | |
| `telegram_token` | TEXT | token bot |
| `telegram_chat_id` | VARCHAR(50) | chat principal |
| `arva_line` | VARCHAR(50) | Professional/Autism/SDR/Support/Custom |
| `skills` | TEXT[] | array de skills |
| `the_call_data` | JSONB | briefing completo |
| `metadata` | JSONB | |

**Agentes ativos hoje (14):** Bia, Chiara, Cinthia, David, Erick, Gabe, Giorgian, Leon, Lia, Maia, Maria, Mila, Priscila (Secretary), Tina Brooks, Kate Whitmore.

**Para o FBRzap, recomendação (cenário A da Decisão #1):**
- **Não duplica agentes no Supabase.** O FBRzap chama `GET https://dashboard.fbrapps.com/api/agents` (com ApiKey) sempre que precisa listar agentes disponíveis. Cacheia local por 5 minutos.
- Se quiser cache persistente no Supabase para offline, criar tabela `agents_cache` com sync diário.

**Exemplo de resposta `GET /api/agents`:**
```json
{
  "ok": true,
  "agents": [
    {
      "id": "bia",
      "name": "Ana Beatriz Schultz",
      "role": "Assistente Comercial",
      "color": "#10B981",
      "active": true,
      "arva_line": "SDR",
      "skills": ["web_search", "google-cal"]
    }
  ]
}
```

**Owner/privacidade:** cada agente pertence a uma organização (`Grupo Facebrasil`, `Cliente Externo A`, etc.). Quando o ARVA Platform for multi-tenant, isso ganha `organization_id`. Por enquanto, todos os agentes do `Grupo Facebrasil` são acessíveis pela ApiKey global.

---

## 7. Supabase: chat e usuários — 🔲 não existe nada, é tudo novo

**Nenhuma das tabelas de chat/usuário/grupo existe.** Isso é 100% trabalho novo do FBRzap. Schema sugerido (cenário A — Supabase só para FBRzap):

```sql
-- Usuários FBRzap (auth.users do Supabase + perfil)
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  avatar_url  TEXT,
  phone       TEXT,
  org_id      UUID,  -- multi-tenant futuro
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Chats (1:1 com agente, ou grupo)
CREATE TABLE chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('dm_agent','group','list')),
  agent_id    TEXT,  -- preenchido se type='dm_agent', referencia OpenClaw
  title       TEXT,  -- nome do grupo, se aplicável
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_msg_at TIMESTAMPTZ
);

-- Membros do chat (para grupos e listas)
CREATE TABLE chat_members (
  chat_id     UUID REFERENCES chats(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

-- Mensagens
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user','agent')),
  sender_id   TEXT NOT NULL,  -- profile.id (uuid) ou agent_id (slug)
  content     TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  reply_to    UUID REFERENCES messages(id),
  status      TEXT DEFAULT 'sent' CHECK (status IN ('sent','delivered','read','failed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Status de leitura por usuário
CREATE TABLE message_reads (
  message_id  UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

-- Listas de distribuição (envio em massa sem virar grupo)
CREATE TABLE distribution_lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES profiles(id),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE distribution_list_members (
  list_id     UUID REFERENCES distribution_lists(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (list_id, user_id)
);
```

**RLS sugerida:**
- `chats` / `messages` / `chat_members`: usuário só vê chats onde é membro
- `distribution_lists`: só o owner vê e edita
- `profiles`: leitura pública do `display_name` e `avatar_url`; resto só o próprio usuário

**Realtime:** usar Supabase Realtime no canal `messages:chat_id=eq.{chat_id}` para receber novas mensagens em tempo real no app.

---

## 8. Regras de negócio — ⚠️ decisões suas (com sugestões)

| Pergunta | Sugestão |
|---|---|
| Usuário pode falar com qualquer agente? | **Não.** Cada agente tem `organization_id`; usuário vê apenas agentes da sua org. Para v1 com só Grupo Facebrasil, todos veem todos. |
| Agentes privados por equipe/owner? | **Sim**, via `organization_id` no agente + `org_id` no profile. Multi-tenant verdadeiro fica para v2. |
| Grupos podem invocar agentes? | **Sim**, mas com `@mention` (mantém padrão Telegram). Mensagens sem mention não vão pro `/api/chat/:agentId`. |
| Listas enviam individual ou em massa? | **Cria N mensagens em N chats DM separados**. Não é grupo. Cada destinatário recebe sem ver os outros. |
| Limite de membros? | Grupo: 50 (alinha com WhatsApp básico). Lista: 256. |
| Papéis? | `owner`, `admin`, `member` em grupos. Listas só têm owner. |

---

## 9. Observabilidade / operação — ✅ parcialmente consolidado

**Logs do OpenClaw:**
- Sistema: `journalctl -u openclaw.service -f`
- Dashboard: `journalctl -u openclaw-dashboard -f`
- Tabela `agent_logs` no Postgres para eventos por agente

**Healthcheck:**
- Hoje não existe `/health` formal. ⚠️ **Adicionar antes do FBRzap entrar em prod.** Sugestão: `GET /api/health` retornando `{ ok, db, openrouter, uptime_seconds }`.

**Métricas de uptime/latência:** não há instrumentação (Prometheus/Grafana). ⚠️ Para o FBRzap recomendo adicionar pelo menos logs estruturados de cada `/api/chat/:agentId` (agent, duration_ms, tokens, success/error).

**Fila/retry:** não implementado. Chamadas falham e o client decide retry. **Para o FBRzap:** retry no backend FBRzap com backoff exponencial (3 tentativas, 1s/3s/9s).

**Backup:** cron diário 3h via `/home/openclaw/.openclaw/backup.sh` (retenção: 7d hoje, vai mudar para 3d).

**Wake-up failure tracking:** não aplicável (não há wake-up). Falhas de resposta aparecem em `agent_logs` e nos logs do systemd.

---

## 10. Acesso técnico (canal seguro)

⚠️ **Decidir canal antes de enviar:** 1Password vault compartilhado, Bitwarden Send, ou cofre do Easypanel. **NUNCA por Slack/email texto puro.**

Variáveis necessárias para o backend FBRzap:
```bash
# OpenClaw
OPENCLAW_BASE_URL=https://dashboard.fbrapps.com
OPENCLAW_API_KEY=<nova ApiKey escopo 'chat' — a criar>

# Supabase (FBRzap)
SUPABASE_URL=<a criar — projeto novo>
SUPABASE_ANON_KEY=<a criar>
SUPABASE_SERVICE_ROLE_KEY=<a criar — só no backend>

# Timeouts
OPENCLAW_TIMEOUT_MS=60000
OPENCLAW_RETRY_ATTEMPTS=3
```

Endpoints internos VPS2 (só se o dev precisar SSH para debug, normalmente não precisa):
- `srv1300318` / `76.13.168.223` (porta 22)
- Postgres: `openclaw_dashboard` (não exposto externamente)

---

## Resumo executivo — o que falta de fato

Tirando o que já está consolidado, o que o dev realmente precisa decidir/construir:

1. **Schema completo do Supabase FBRzap** (profiles, chats, messages, groups, lists) — sugestão pronta no §7
2. **Implementação do backend FBRzap** que faz proxy entre o app mobile e o `/api/chat/:agentId` do OpenClaw
3. **Realtime via Supabase** para mensagens chegando no app
4. **(Opcional) SSE/streaming no `api.mjs`** se quiser "digitando..." real-time
5. **(Opcional) Healthcheck e rate limiting no `api.mjs`** antes do FBRzap entrar em prod

E as **3 decisões de arquitetura** lá em cima precisam ser fechadas por você antes que o dev comece.

---

*Documento consolidado a partir de: BRIEFING-AGENTE-ARVABOTS, DEPLOY.md, ARVA-CONNECT.md, oracle-briefing-dev, briefing-dev-sprint-api, guia-instalacao-openclaw, ARVA-ADENDO-IMPLEMENTACAO-AGENTES, SMT, SAPP, IRO, e estado operacional atual do OpenClaw (maio 2026).*