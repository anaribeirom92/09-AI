# 09 VIDEO AI — arquitetura local e sob demanda

## Objetivo
Editor audiovisual de uso exclusivamente interno da equipe da 09 Comunicação Integrada. O fluxo não oferece contas, upload ou aprovação para clientes.

## Decisão de produto
- Sem Render, Railway, Cloud Run ou worker contínuo.
- Sem upload dos originais para Supabase Storage.
- Sem retenção de mídia em nuvem ou fila persistente para arquivos de vídeo.
- Processamento local no computador autorizado da equipe, iniciado somente quando houver uma edição.
- Arquivos intermediários em diretório temporário do sistema, removidos ao final.
- O arquivo final fica somente no destino escolhido pela pessoa que executou o render.
- O ChatGPT pode receber o material diretamente na conversa para análise e orientação, dentro dos limites de upload e processamento da plataforma. O repositório não recebe automaticamente os anexos desta conversa; uma integração explícita será necessária para automatizar esse caminho.

## Componentes
1. **ChatGPT / direção criativa:** recebe o vídeo e o briefing, ajuda a definir cortes, estrutura, textos, legendas e elementos visuais. Não se presume acesso direto ao disco local.
2. **Motor local:** Node.js 22 + FFmpeg/FFprobe em `workers/video-ingest`. Executa sob demanda, sem servidor residente.
3. **Entrega:** MP4 final salvo no caminho indicado e anexado à conversa quando o fluxo de trabalho permitir.

## Motor local — fundação implementada
O CLI valida a entrada, inspeciona streams e metadados, converte para H.264/AAC, ajusta o enquadramento para 9:16, 16:9 ou 1:1, normaliza áudio, valida o arquivo renderizado e remove a pasta temporária. Nunca sobrescreve o original.

## Pipeline premium — próximas fases
1. Transcrição e alinhamento de fala.
2. Detecção de cenas, pausas, repetições e possíveis erros.
3. Plano de edição EDL estruturado e revisável.
4. Legendas estilizadas, títulos, motion graphics e B-roll.
5. Render FFmpeg/Remotion local.
6. QA de sincronização, áudio, safe areas e arquivo final.

## Custos
A fundação local não exige hospedagem, banco, armazenamento remoto nem API paga. Recursos de IA externos só poderão ser ativados após avaliação e autorização explícita de custo. A capacidade de processamento depende do computador utilizado.

## Segurança
- Não incluir chaves de serviço no frontend ou no repositório.
- Não transmitir originais para Storage.
- Não sobrescrever originais.
- Limpar arquivos temporários mesmo em falha.
- Revisão humana antes da entrega final.

## Histórico
A primeira fundação usava Supabase Storage, fila de jobs e worker contínuo. Essa arquitetura foi substituída por decisão da responsável do produto para evitar custos recorrentes e retenção desnecessária de vídeos. As tabelas e bucket já provisionados podem permanecer inativos; não serão usados pelo novo fluxo.
