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

## Executor de agentes
O worker da Responses API aceita chamadas de funções em uma lista fechada de ferramentas internas. Nesta etapa, o conjunto operacional inclui:
- Consulta, criação e atualização de tarefas.
- Consulta, criação e atualização de projetos.
- Consulta, criação e atualização de entregáveis.

As ferramentas de escrita passam por validação de permissões no servidor e por uma função PostgreSQL transacional com registro de auditoria. Não há ferramentas para exclusão, comunicação externa, publicação, gastos, alteração de preços, contratos, contratação, pesquisa web, notificações, agendamento ou delegação entre agentes. Agentes em rascunho não podem executar chamadas.

## Governança
Agentes iniciam em rascunho. Publicações, despesas, alterações de preço, contratos, mudanças de mídia paga e ações irreversíveis exigem autorização explícita da direção. Toda autorização deve ser validada no backend e registrada em auditoria.
