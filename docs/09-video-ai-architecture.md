# 09 VIDEO AI — arquitetura técnica inicial

## Objetivo
Editor audiovisual premium de uso exclusivamente interno da equipe da 09 Comunicação Integrada. Clientes não terão contas, login, acesso a projetos, arquivos, aprovações ou painel.

## Decisões de arquitetura
- **Aplicação:** Next.js App Router + TypeScript, dentro do repositório 09-AI e da área autenticada do dashboard.
- **Identidade e acesso:** Supabase Auth existente; somente membros internos ativos da organização 09 acessam o módulo. Não existe papel, convite ou permissão para clientes.
- **Dados:** Supabase Postgres, com tabelas próprias do módulo (video_projects, video_assets, video_jobs, video_edits, video_approvals) e RLS por organização. Não misturar jobs de vídeo com agent_runs.
- **Arquivos:** Supabase Storage em buckets privados, upload/download por URL assinada; originais, proxies, áudio, thumbnails, overlays e exports separados por organização/projeto.
- **Orquestração:** fila durável no Postgres (ou pgmq quando validado) e worker independente. Não renderizar vídeo dentro de uma função Vercel.
- **Motor audiovisual:** FFmpeg para ingestão, normalização, áudio, cortes e mux; Remotion para composições, legendas animadas, motion graphics e templates; render final executado no worker.
- **IA:** camada provider-agnostic. Transcrição/alinhamento de fala, análise de cenas, detecção de pausas e planejamento de edição em JSON tipado. O plano de edição é revisável antes da renderização.
- **Integração conversacional:** endpoint autenticado com ferramentas limitadas: criar projeto, anexar mídia, atualizar briefing, consultar status, solicitar revisão e obter export. A conversa nunca recebe acesso direto ao Storage nem executa comandos arbitrários. As ferramentas do agente operam apenas em nome de membros autenticados da equipe.
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
- Links de mídia são temporários e assinados. O acesso é restrito a membros internos ativos da organização.
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
- `video_assets`: inventário dos originais, proxies, áudios, imagens, legendas e exports.
- `video_edits`: versões do EDL e estados de aprovação.
- `video_jobs`: fila durável com idempotência e tentativas.
- `video_approvals`: decisões e feedbacks.
- Bucket privado `09-video-ai`, limite inicial de 2 GB por arquivo e MIME types restritos.

As tabelas têm RLS habilitado. O acesso é exclusivamente interno e limitado aos membros ativos da organização 09. O bucket é privado e usa o UUID do projeto como primeiro segmento do caminho.

As migrations versionadas estão em `supabase/migrations`. O hardening removeu a política permissiva sobreposta e adicionou índices para chaves estrangeiras. O Advisor de segurança não apontou problemas novos no módulo; permanece um aviso preexistente do projeto sobre proteção contra senhas vazadas desabilitada.


## Correção de escopo — ferramenta interna
Decisão confirmada pela responsável do produto: o 09 VIDEO AI é exclusivamente interno da equipe da 09 Comunicação Integrada. Clientes não terão contas, convites, login, painel, upload, projetos nem aprovação dentro da plataforma. A equipe recebe os vídeos por seus canais habituais, opera o editor, revisa e entrega os arquivos finais externamente.

A tabela `video_project_members` foi removida por não haver necessidade de associação de clientes a projetos. As funções RLS `private.can_access_video_project` e `private.can_manage_video_project` agora validam membership ativo na organização do projeto. O dashboard continua sob a autenticação e a autorização organizacional existentes.
