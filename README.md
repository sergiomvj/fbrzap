# FBRzap

App mobile de mensageria operacional para conversar com agentes Openclaw, criar grupos e operar listas de distribuicao.

## Features

- Chat 1:1 com agentes Openclaw via backend seguro
- Inbox unificada para DMs com agentes e grupos
- Grupos com ativacao de agente por `@mention`
- Listas de distribuicao separadas da semantica de grupo
- Realtime de mensagens persistidas via Supabase

## Estrutura

- `apps/mobile`: app Expo/React Native
- `apps/api`: backend BFF em Fastify
- `supabase/migrations`: migracoes SQL do banco

## Ambiente

Preencha as variaveis em `.env.local` antes de rodar o projeto.

Variaveis ainda necessarias para execucao completa:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENCLAW_API_KEY`

