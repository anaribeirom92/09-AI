# 09 VIDEO AI — motor local (sem servidor)

O motor é executado no computador da equipe, somente quando solicitado. Não usa Supabase Storage, Render, filas em nuvem, API paga ou banco de dados para processar arquivos.

## Requisitos
- Node.js 22+
- FFmpeg e FFprobe instalados e disponíveis no PATH

## Instalação e compilação
```bash
npm install
npm run build
```

## Primeiro render local
```bash
npm start -- --input ./bruto.mp4 --output ./final.mp4 --aspect 9:16 --height 1080
```

Proporções aceitas: `9:16`, `16:9`, `1:1`. Resoluções: `720`, `1080`, `1440`, `2160`.

O motor:
- inspeciona o original com FFprobe;
- converte para H.264/AAC em MP4;
- enquadra no formato solicitado;
- normaliza o volume de áudio quando existe conteúdo audível; faixas de silêncio digital são preservadas sem aplicar `loudnorm`, evitando falhas de codificação;
- valida o arquivo renderizado;
- usa pasta temporária do sistema e a apaga ao terminar;
- nunca sobrescreve o arquivo original.

## Análise local de pausas (sem cortes automáticos)

Para gerar um relatório JSON sem renderizar nem alterar o vídeo:

```bash
npm start -- --input ./bruto.mp4 --analyze-only --plan ./plano-edicao.json
```

O relatório é salvo ao lado do original com o sufixo `.09-video-analysis.json`. Também é possível escolher o destino com `--report ./analise.json`. A detecção usa FFmpeg `silencedetect`, com padrão de -35 dB por pelo menos 0,45 s. Ajustes opcionais: `--silence-noise -32dB` e `--silence-duration 0.6`.

Cada intervalo é registrado como sugestão de revisão, inclusive silêncio que chega ao fim do arquivo. Pausas naturais fazem parte da fala e precisam ser avaliadas no contexto. O argumento opcional `--plan ./plano-edicao.json` também exporta um EDL conservador: mantém o vídeo inteiro e lista as pausas para revisão, sem aplicar cortes.

## Plano de edição (EDL) — primeira versão

O módulo `src/edit-plan.ts` define um formato estruturado para decisões de edição. Nesta etapa, ele gera um plano conservador: mantém 100% do vídeo original, organiza pausas como itens para revisão humana e registra parâmetros de áudio e formato de saída. A validação verifica duração, limites dos segmentos e invariantes de segurança. Ainda não aplica cortes nem renderiza a partir do EDL.

## Legendas SRT (base local)

O módulo `src/captions.ts` lê arquivos SRT sem dependências externas, aceita milissegundos com vírgula ou ponto, preserva legendas em múltiplas linhas e valida ordem cronológica, timestamps e duração opcional do vídeo. Nesta etapa ele apenas interpreta e valida legendas fornecidas; ainda não transcreve fala nem grava legendas no vídeo.

## Transcrição offline com whisper.cpp (opcional)

A transcrição pode ser executada localmente quando o executável `whisper-cli` e um modelo GGML já estiverem instalados no computador. O motor não baixa executáveis nem modelos automaticamente.

Exemplo (português do Brasil):
```bash
npm start -- --input ./bruto.mp4 --transcribe --whisper-model ./models/ggml-base.bin --output ./legendas.srt --language pt
```

Se o executável não estiver no PATH, informe-o com `--whisper-bin ./caminho/whisper-cli`. O áudio é convertido temporariamente para WAV mono de 16 kHz, processado pelo Whisper em CPU e removido ao final. O SRT é validado contra a duração do vídeo antes de ser salvo. O arquivo original não é alterado.

Modelos são downloads separados e ocupam espaço local. O modelo `tiny` ocupa cerca de 75 MiB e usa aproximadamente 273 MB de memória; `base` ocupa cerca de 142 MiB e usa aproximadamente 388 MB. Para começar em máquinas modestas, avalie `tiny` ou `base`; a qualidade e velocidade dependem do equipamento e do áudio. Nenhum modelo é baixado por este projeto sem escolha explícita da equipe.

## Testes

```bash
npm test
```

Os testes cobrem parsing de silêncio (intervalos fechados, silêncio final, múltiplos intervalos e dados inválidos), geração/validação de planos de edição e smoke tests de ponta a ponta com vídeo sintético, fonte sem áudio e faixa de áudio em silêncio digital. O CI instala FFmpeg e valida análise, exportação EDL e renderização.

## Limites desta fundação

Esta etapa é um renderizador local determinístico, não a edição criativa completa. Ainda não faz transcrição, seleção inteligente de melhores takes, remoção semântica de erros, legendas animadas, busca/geração de B-roll, motion graphics ou montagem guiada por IA. Essas capacidades serão acrescentadas por etapas sem exigir um serviço de processamento contínuo.

## Privacidade e custo

Os arquivos não são enviados a um bucket ou servidor por este CLI. A única cópia persistente é o arquivo final que você escolheu salvar. A pasta intermediária temporária é apagada ao concluir. Não há custo de hospedagem ou chamadas de IA neste motor básico.
