# 09 VIDEO AI — ingest worker

Worker interno de mídia. Não expõe endpoints públicos e não atende clientes. Consome somente jobs `ingest` da tabela `video_jobs`.

## Responsabilidades desta etapa
- Baixar o original por URL assinada temporária, sem tornar o bucket público.
- Inspecionar contêiner, codecs, duração, resolução e faixas com FFprobe.
- Gerar thumbnail e proxy MP4 com FFmpeg.
- Armazenar derivados no bucket privado `09-video-ai` usando upload TUS.
- Registrar os derivados em `video_assets`, enriquecer os metadados do original e concluir o job.

O original nunca é sobrescrito. O worker só processa projetos e arquivos que já passaram pela autorização do dashboard; a credencial privilegiada fica exclusivamente no ambiente server-side do worker.

## Ambiente
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (somente segredo do worker; nunca no frontend ou no Git)
- `POLL_INTERVAL_MS` (padrão 4000)
- `WORKER_CONCURRENCY` (padrão 1; manter baixo até medir RAM/CPU)

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
- Recuperação automática de jobs abandonados após queda do processo (lease/heartbeat), limites de duração/resolução e limpeza de derivados parciais serão endurecidos antes de operar com concorrência ou volumes altos.
- O worker ainda não transcreve, interpreta conteúdo, remove ruído, monta cortes criativos ou renderiza a edição final. Essas são as etapas seguintes do pipeline.
