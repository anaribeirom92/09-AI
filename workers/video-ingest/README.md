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
- normaliza o volume de áudio quando existe faixa de áudio;
- valida o arquivo renderizado;
- usa pasta temporária do sistema e a apaga ao terminar;
- nunca sobrescreve o arquivo original.

## Análise local de pausas (sem cortes automáticos)

Para gerar um relatório JSON sem renderizar nem alterar o vídeo:

```bash
npm start -- --input ./bruto.mp4 --analyze-only
```

O relatório é salvo ao lado do original com o sufixo `.09-video-analysis.json`. Também é possível escolher o destino com `--report ./analise.json`. A detecção usa FFmpeg `silencedetect`, com padrão de -35 dB por pelo menos 0,45 s. Ajustes opcionais: `--silence-noise -32dB` e `--silence-duration 0.6`.

Cada intervalo é registrado como sugestão de revisão, nunca como corte automático. Pausas naturais fazem parte da fala e precisam ser avaliadas no contexto.

## Limites desta fundação
Esta etapa é um renderizador local determinístico, não a edição criativa completa. Ainda não faz transcrição, seleção inteligente de melhores takes, remoção semântica de erros, legendas animadas, busca/geração de B-roll, motion graphics ou montagem guiada por IA. Essas capacidades serão acrescentadas por etapas sem exigir um serviço de processamento contínuo.

## Privacidade e custo
Os arquivos não são enviados a um bucket ou servidor por este CLI. A única cópia persistente é o arquivo final que você escolheu salvar. A pasta intermediária temporária é apagada ao concluir. Não há custo de hospedagem ou chamadas de IA neste motor básico.
