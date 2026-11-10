# 09 AI Agency

Sistema operacional inteligente da 09 Comunicação Integrada.

## Objetivo

Centralizar a operação da agência em uma plataforma com agentes especializados, gestão de projetos e tarefas, aprovações, memória operacional, indicadores e auditoria.

## Arquitetura

- **Frontend:** Next.js + TypeScript
- **Deploy:** Vercel, conectado ao repositório GitHub
- **Backend:** Supabase (Postgres, Auth, Storage e Edge Functions)
- **Orquestração:** serviço TypeScript próprio, com fila durável e worker
- **IA:** OpenAI Responses API, atrás de uma camada de provider

## Estado atual

A infraestrutura inicial do Supabase e os serviços de execução de agentes já foram preparados. O painel web ainda está em fase inicial de implementação.

**Importante:** nenhum agente de produção está ativado. A ativação depende de autorização explícita da direção.

## Princípios de segurança

- Segredos ficam em variáveis de ambiente ou no cofre de secrets do Supabase.
- Nunca commitar chaves, tokens, credenciais ou dados pessoais.
- Ações externas, financeiras, publicações e alterações de mídia paga exigem aprovação.
- Toda ação relevante deve ser autorizada no backend e registrada em auditoria.

## Desenvolvimento local

A configuração de desenvolvimento será documentada à medida que a aplicação e seus scripts forem adicionados.
