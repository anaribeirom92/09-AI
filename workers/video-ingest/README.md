# 09 VIDEO AI — ingest worker

Worker interno de mídia. Não expõe endpoints públicos e não atende clientes. Consome somente jobs `ingest` da tabela `video_jobs`.

## Responsabilidades desta etapa
- Baixar o original por URL assinada temporária, sem tornar o bucket público.
- Inspecionar contêiner, codecs, duração, resolução e faixas com FFprobe.
- Gerar thumbnail para vídeos/imagens e proxy MP4 para vídeos com FFmpeg; áudio isolado também é validado e catalogado.
- Armazenar derivados no bucket privado `09-video-ai` usando upload TUS.
- Registrar os derivados em `video_assets`, enriquecer os metadados do original e concluir o job.

O original nunca é sobrescrito. O worker só processa projetos e arquivos que já passaram pela autorização do dashboard; a credencial privilegiada fica exclusivamente no ambiente server-side do worker.

## Ambiente
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (somente segredo do worker; nunca no frontend ou no Git)
- `POLL_INTERVAL_MS` (padrão 4000)
- `WORKER_CONCURRENCY` (padrão 1; manter baixo até medir RAM/CPU)

## Implantação como background worker
O serviço foi preparado para ser implantado como worker contínuo (não como função serverless). Um `render.yaml` na raiz do repositório define o serviço Render usando este Dockerfile. Na criação do serviço, configure os segredos `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no painel do provedor. Não grave esses valores no GitHub.

## Executar com Docker
```bash
docker build -t 09-video-ingest ./workers/video-ingest
docker run --rm \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  09-video-ingest
```

## Limites conhecidos desta fundação
- Esta primeira versão processa um job por vez por padrão; use concorrência 1 em produção inicial.
- O claim usa atualização condicional de `queued` para `running`, evitando que dois workers concluam o mesmo claim.
- Heartbeat renova `started_at` a cada minuto; jobs `running` sem heartbeat por 15 minutos são recuperados automaticamente ou encerrados quando esgotam as tentativas.
- Limites de duração/resolução e limpeza de derivados parciais serão endurecidos antes de operar com concorrência ou volumes altos.
- O worker ainda não transcreve, interpreta conteúdo, remove ruído, monta cortes criativos ou renderiza a edição final. Essas são as etapas seguintes do pipeline.
