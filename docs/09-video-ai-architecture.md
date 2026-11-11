# 09 VIDEO AI — arquitetura ChatGPT-first

## Objetivo
Agente audiovisual interno da 09 Comunicação Integrada. A experiência principal deve acontecer no ChatGPT: a equipe envia o vídeo e o briefing na conversa, recebe análise/decisões de edição e, quando o ambiente de execução permitir, recebe o arquivo final na própria conversa. Não há portal de clientes, contas externas ou fluxo de aprovação para clientes.

## Decisão de produto
- ChatGPT é a interface de uso e direção criativa.
- Código versionado no GitHub; desenvolvimento e manutenção assistidos pelo Codex.
- Não exigir instalação de Node.js, FFmpeg, Whisper ou qualquer ferramenta no computador da Ana/equipe.
- Não criar servidor permanente, worker pago, Render/Railway/Cloud Run, storage permanente ou API paga sem autorização explícita.
- Não presumir que anexos enviados ao ChatGPT ficam automaticamente acessíveis ao repositório ou a um app externo.
- A execução de código e renderização deve ocorrer no ambiente de trabalho/código disponível ao ChatGPT/Codex, quando suportado, ou ser tratada como limitação explícita. Não prometer renderização de qualquer duração/tamanho sem teste.
- Vídeos não precisam ser arquivados. Trabalhar com cópias temporárias e eliminar intermediários após o processamento, respeitando os limites de retenção da própria plataforma.

## Experiência desejada
1. Usuária envia vídeo(s) e briefing no ChatGPT.
2. Agente analisa conteúdo, áudio, cenas, pausas, erros e objetivo.
3. Agente propõe/gera plano de edição: seleção de takes, cortes, ritmo, legendas, títulos, B-roll e motion.
4. Código de processamento executa em ambiente disponível, sem exigir setup local.
5. Agente valida áudio, sincronização, enquadramento e arquivo final.
6. Entrega MP4 na conversa, quando os limites do ambiente permitirem.

## Arquitetura técnica em evolução
- `workers/video-ingest` contém utilitários FFmpeg/FFprobe e formatos de análise/EDL. É uma biblioteca/engine de referência reutilizável, não uma exigência de instalação local para a usuária.
- O projeto deve separar análise/orquestração, plano de edição, renderização e entrega.
- Transcrição offline via whisper.cpp é opcional e não pode ser requisito da experiência ChatGPT-first; só usar quando houver runtime compatível e executável/modelo disponíveis no ambiente. Não pedir que Ana instale isso no PC.
- Nenhum recurso externo pago será habilitado automaticamente.

## Uso do Codex
- Codex trabalha no repositório: implementa código, executa testes, revisa alterações e mantém PRs.
- Alterações ficam em branch de feature e PR draft até revisão explícita.
- Não fazer merge em `main`, deploy de produção ou provisionamento pago sem autorização.

## Limitações e honestidade
- Anexos do ChatGPT não são automaticamente montados no ambiente local do repositório.
- A disponibilidade de processamento de vídeo, duração máxima, memória, codecs e tamanho de saída depende do ambiente e dos limites da plataforma.
- Se um arquivo não puder ser processado integralmente na conversa, explicar o motivo e oferecer alternativa compatível; não deslocar silenciosamente o trabalho para o computador da usuária.
- Assinatura ChatGPT não significa acesso ilimitado a APIs ou infraestrutura externa.

## Privacidade e custo
- Não usar Supabase Storage nem persistência de vídeos.
- Não manter fila/worker contínuo.
- Limpar arquivos temporários produzidos no ambiente de execução.
- Não chamar APIs pagas, baixar modelos grandes ou criar infraestrutura paga sem aprovação.
- O usuário mantém controle sobre os vídeos enviados à conversa e sobre a entrega final.

## Histórico
A fundação começou como motor local. A direção do produto foi corrigida para ChatGPT-first, com código desenvolvido/versionado pelo Codex. O motor local existente permanece como código reutilizável, mas não define a experiência nem cria requisito de instalação no computador da usuária.
