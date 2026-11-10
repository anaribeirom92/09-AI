# 09 AI Agency

Sistema operacional inteligente da 09 Comunicação Integrada.

## Arquitetura
- **Frontend:** Next.js 16 + TypeScript + App Router
- **Deploy:** Vercel conectado ao GitHub
- **Backend:** Supabase (Postgres, Auth, Storage e Edge Functions)
- **Orquestração:** serviço TypeScript próprio, com fila durável e worker
- **IA:** OpenAI Responses API, atrás de uma camada de provider

## Painel inicial
- Login por e-mail e senha, sem cadastro público.
- Sessão SSR com cookies e renovação via `proxy.ts`.
- Área administrativa protegida por autenticação e vínculo ativo de liderança.
- Visões iniciais de agentes, projetos, tarefas e aprovações.
- Sem controles de ativação de agentes ou execução irreversível nesta versão inicial.

## Configuração
Defina no ambiente da Vercel ou em `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```
Nunca utilize chaves `service_role` no navegador ou no repositório.

## Desenvolvimento local
```bash
npm install
npm run dev
```

## Governança
Agentes iniciam em rascunho. Publicações, despesas, alterações de preço, contratos, mudanças de mídia paga e ações irreversíveis exigem autorização explícita da direção. Toda autorização deve ser validada no backend e registrada em auditoria.
