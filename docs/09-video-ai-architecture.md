# 09 VIDEO AI — arquitetura técnica inicial

## Objetivo
Editor audiovisual premium multi-tenant para a 09 Comunicação e seus clientes. A experiência principal é uma aplicação web; a experiência conversacional será conectada depois por um endpoint de agente/MCP autenticado, usando o mesmo serviço de projetos e jobs.

## Decisões de arquitetura
- **Aplicação:** Next.js App Router + TypeScript, dentro do repositório 09-AI e da área autenticada do dashboard.
- **Identidade e acesso:** Supabase Auth existente; organizações e memberships existentes. Clientes terão papéis e escopo por organização/projeto, sem acesso cruzado.
- **Dados:** Supabase Postgres, com tabelas próprias do módulo (video_projects, video_assets, video_jobs, video_edits, video_approvals) e RLS por organização. Não misturar jobs de vídeo com agent_runs.
- **Arquivos:** Supabase Storage em buckets privados, upload/download por URL assinada; originais, proxies, áudio, thumbnails, overlays e exports separados por organização/projeto.
- **Orquestração:** fila durável no Postgres (ou pgmq quando validado) e worker independente. Não renderizar vídeo dentro de uma função Vercel.
- **Motor audiovisual:** FFmpeg para ingestão, normalização, áudio, cortes e mux; Remotion para composições, legendas animadas, motion graphics e templates; render final executado no worker.
- **IA:** camada provider-agnostic. Transcrição/alinhamento de fala, análise de cenas, detecção de pausas e planejamento de edição em JSON tipado. O plano de edição é revisável antes da renderização.
- **Integração conversacional:** endpoint autenticado com ferramentas limitadas: criar projeto, anexar mídia, atualizar briefing, consultar status, solicitar revisão e obter export. A conversa nunca recebe acesso direto ao Storage nem executa comandos arbitrários.
- **Hospedagem:** Vercel para interface/API leve; worker de mídia em serviço com CPU/GPU e armazenamento temporário próprios (Cloud Run/Modal/Railway a avaliar com benchmarks). Domínio e worker serão configurados após estimativa de custo.
- **Observabilidade:** job_id, etapas, duração, tentativas, custos de IA/render, logs sem conteúdo sensível e trilha de auditoria.

## Pipeline premium
1. Ingestão: validar codec, duração, proporção, resolução, tamanho; gerar proxy, waveform e thumbnails.
2. Compreensão: transcrever; detectar cenas, falas, pausas, erros aparentes e momentos de ênfase.
3. Direção: converter o briefing em um Edit Decision List (EDL) com cortes, enquadramentos, legendas, B-roll, gráficos, trilha e transições.
4. Revisão: exibir roteiro visual e permitir aprovação/ajustes antes do render.
5. Render: FFmpeg + Remotion; gerar MP4 H.264/AAC e variantes 9:16, 16:9 e 1:1.
6. QA: verificar duração, áudio, sincronização, safe areas, frames pretos e arquivo final.
7. Entrega: prévia com marca d'água opcional, aprovação do cliente e export final.

## Governança e segurança
- Nunca sobrescrever o original.
- Todo asset pertence a uma organização e projeto; RLS e policies de Storage verificam membership.
- Links de mídia são temporários e assinados.
- Ações de custo/renderização precisam de limites e idempotência.
- Conteúdo de fala não é alterado silenciosamente. Remoção de erro de conteúdo ou reescrita exige aprovação.
- Aprovação humana antes da entrega/publicação; sem publicação automática em redes sociais nesta fase.
- Segredos somente em variáveis de ambiente server-side.

## Fases
- **F0 — Fundação:** módulo, arquitetura, navegação e interface inicial.
- **F1 — Projetos e ingestão:** schema, Storage privado, upload assinado, validação e proxies.
- **F2 — Análise:** transcrição, cenas, pausas, EDL e revisão.
- **F3 — Render premium:** worker FFmpeg/Remotion, legendas, motion, B-roll e QA.
- **F4 — Conversa:** integração segura do agente no ChatGPT e no dashboard.
- **F5 — Clientes:** convites, permissões, limites de uso, cobrança e white-label leve.

## Fora do escopo inicial
Editor de timeline manual completo tipo Premiere; publicação automática; clonagem de voz; geração irrestrita de imagens/vídeos; processamento síncrono dentro da Vercel.


## Fundação já provisionada
No projeto Supabase **09 AI Agency** (separado do Fechou AI) foram criadas e verificadas:
- `video_projects`: projetos e briefings por organização.
- `video_project_members`: associação de usuários a projetos com papéis client/reviewer/editor/producer.
- `video_assets`: inventário dos originais, proxies, áudios, imagens, legendas e exports.
- `video_edits`: versões do EDL e estados de aprovação.
- `video_jobs`: fila durável com idempotência e tentativas.
- `video_approvals`: decisões e feedbacks.
- Bucket privado `09-video-ai`, limite inicial de 2 GB por arquivo e MIME types restritos.

As tabelas têm RLS habilitado. Acesso de cliente é por associação explícita ao projeto; liderança ativa da organização mantém acesso operacional. As políticas de associação exigem que o usuário convidado já seja membro ativo da organização. Os arquivos ficam em bucket privado e usam o UUID do projeto como primeiro segmento do caminho.

As migrations versionadas estão em `supabase/migrations`. O hardening removeu a política permissiva sobreposta e adicionou índices para chaves estrangeiras. O Advisor de segurança não apontou problemas novos no módulo; permanece um aviso preexistente do projeto sobre proteção contra senhas vazadas desabilitada.
