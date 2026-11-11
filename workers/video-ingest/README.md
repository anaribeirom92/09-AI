# 09 VIDEO AI — motor audiovisual

O 09 VIDEO AI é um agente interno da 09 Comunicação Integrada. A experiência desejada é enviar o vídeo e o briefing diretamente ao ChatGPT, receber a análise/decisão editorial e obter o MP4 final na própria conversa, sem instalar ferramentas no computador da equipe.

## Arquitetura e estado real

- **ChatGPT:** interface de uso, briefing, análise do conteúdo e direção editorial.
- **Codex + GitHub:** desenvolvimento, revisão e testes do código-fonte. Codex é ferramenta de desenvolvimento, não é por si só o runtime de edição de vídeos.
- **Motor deste diretório:** implementação técnica de referência em Node.js/TypeScript com FFmpeg/FFprobe. Não está conectado automaticamente aos anexos do ChatGPT.
- **Ponte de arquivos:** ainda não implementada. Um anexo enviado em uma conversa não fica automaticamente disponível ao repositório, ao Codex ou a este motor.
- **Entrega na conversa:** ainda não implementada. Para isso, o ambiente de execução precisa receber os bytes do vídeo, processá-los e devolver o arquivo resultante como anexo.
- **Privacidade/custo:** não há envio para Supabase Storage, armazenamento permanente de vídeos, servidor contínuo ou API paga neste motor.

**Importante:** este README não é um guia para Ana instalar Node.js, FFmpeg, Whisper ou qualquer outro programa. Os comandos abaixo documentam o motor para desenvolvimento e validação técnica no ambiente de engenharia, não o fluxo de uso final.

## Capacidades implementadas no motor de referência

- Inspeção de mídia com FFprobe.
- Conversão para MP4 H.264/AAC.
- Enquadramento em 9:16, 16:9 ou 1:1.
- Resoluções de 720, 1080, 1440 e 2160.
- Normalização de áudio quando existe conteúdo audível.
- Validação do arquivo renderizado.
- Diretório temporário removido ao final; o arquivo original nunca é sobrescrito.
- Análise de silêncio e exportação de relatório JSON.
- EDL conservador que mantém o vídeo inteiro e sinaliza pausas para revisão; não aplica cortes automaticamente.
- Renderização de segmentos de um plano explicitamente aprovado: o motor concatena os trechos mantidos e sincroniza vídeo/áudio. Planos pendentes de revisão são recusados.
- Leitura e validação de legendas SRT, incluindo vírgula/ponto nos milissegundos e texto multilinha.\n- Queima de legendas no vídeo com estilo legível; ao aplicar cortes aprovados, os tempos são recortados e reposicionados na timeline final.

## Desenvolvimento e testes

O motor usa Node.js 22+, TypeScript e FFmpeg/FFprobe. No ambiente de engenharia que já disponha dessas dependências:

```bash
npm install
npm test
```

Para executar um render de referência:

```bash
npm start -- --input ./bruto.mp4 --output ./final.mp4 --aspect 9:16 --height 1080
```

Para renderizar com legendas SRT já transcritas/revisadas, use `--captions`:\n\n```bash\nnpm start -- --input ./bruto.mp4 --output ./final-com-legendas.mp4 --captions ./legendas.srt --aspect 9:16 --height 1080\n```\n\nAs legendas são incorporadas à imagem (burn-in), com estilo padrão. Quando combinado com um plano de cortes aprovado, os tempos são ajustados para acompanhar a nova timeline.\n\nPara renderizar um plano aprovado, forneça um JSON de edição com `status: "approved"`, `safety.requires_human_review: false`, `review_items: []` e segmentos `keep` em timeline contínua. A aprovação é explícita e não é feita automaticamente pelo motor:

```bash
npm start -- --input ./bruto.mp4 --output ./final.mp4 --edit-plan ./plano-aprovado.json --aspect 9:16 --height 1080
```

O comando recusa planos com revisão pendente, segmentos inválidos ou duração de origem incompatível. Os cortes correspondem aos intervalos omitidos entre os segmentos `keep`.

Para analisar pausas sem renderizar:

```bash
npm start -- --input ./bruto.mp4 --analyze-only --plan ./plano-edicao.json
```

A detecção usa FFmpeg `silencedetect`, por padrão em -35 dB por pelo menos 0,45 s. Pausas naturais exigem avaliação contextual. O EDL atual não é consumido pelo renderizador.

## Transcrição

A integração opcional existente com whisper.cpp exige um executável `whisper-cli` e um modelo GGML fornecidos pelo ambiente de engenharia. Não baixa modelos automaticamente. Essa dependência **não faz parte do fluxo final pretendido para Ana** e não deve ser tratada como pré-requisito do produto.

## Ainda não implementado

- Integração para receber diretamente anexos enviados ao ChatGPT.
- Runtime de processamento transitório compatível com o ambiente de uso do ChatGPT.
- Devolução do MP4 final como anexo na conversa.
- Transcrição automática integrada ao fluxo principal.
- Edição semântica: identificar erros de fala, selecionar melhores takes e gerar automaticamente um plano de cortes com compreensão de contexto. O renderizador já executa segmentos aprovados, mas o agente ainda não produz esse plano semântico.
- Legendas animadas e sincronizadas geradas automaticamente.
- B-roll, títulos, motion graphics e montagem final guiada pelo briefing.
- Validação audiovisual automatizada da edição criativa final.

## Critérios para considerar o objetivo atingido

O agente só deve ser apresentado como pronto quando um teste real demonstrar, sem instalação no computador de Ana e sem serviço pago adicional:

1. Ana envia um vídeo e briefing diretamente na conversa.
2. O agente consegue acessar o arquivo de forma autorizada e temporária.
3. O agente analisa fala, cenas, áudio e objetivo editorial.
4. O motor executa a edição e renderiza um MP4.
5. O sistema valida reprodução, duração, áudio, sincronização e enquadramento.
6. O MP4 é devolvido na própria conversa.
7. Arquivos intermediários são descartados após a entrega, sem retenção permanente.

Até que esse fluxo seja demonstrado de ponta a ponta, o projeto deve ser descrito como fundação técnica em desenvolvimento, não como editor integrado ou pronto para produção.
