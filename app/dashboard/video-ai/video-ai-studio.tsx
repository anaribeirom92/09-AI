"use client";

import { AudioLines, Captions, Clapperboard, Film, Images, Layers3, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";

export default function VideoAIStudio() {
  return <div className="video-ai-page">
    <section className="video-ai-heading">
      <div><span className="eyebrow">AGENTE ESPECIALISTA EM PRODUÇÃO AUDIOVISUAL</span><h1>09 VIDEO AI<span className="heading-dot">.</span></h1><p>Editor audiovisual interno, executado sob demanda e sem armazenamento permanente dos originais.</p></div>
      <div className="video-ai-status"><span className="status-pulse"/> USO INTERNO · 09 IA</div>
    </section>
    <section className="video-ai-hero">
      <div className="video-ai-hero-copy"><span className="video-ai-kicker"><WandSparkles size={14}/> ESTÚDIO DE PÓS-PRODUÇÃO</span><h2>Você direciona.<br/><em>A IA edita.</em></h2><p>Envie o vídeo na conversa do ChatGPT, explique a direção criativa e trabalhe com o motor local para renderizar a versão final.</p><div className="video-ai-tags"><span>ÁUDIO</span><span>LEGENDAS</span><span>MOTION</span><span>B-ROLL</span><span>RENDER</span></div><small>Sem upload dos originais para o Storage da 09. Sem retenção permanente de mídia.</small></div>
      <div className="video-ai-preview"><div className="preview-top"><span><i/> WORKFLOW 09</span><span>09 / VIDEO</span></div><div className="preview-screen"><div className="preview-orbit orbit-a"/><div className="preview-orbit orbit-b"/><div className="preview-play"><Film size={25}/></div><div className="preview-caption">IDEIAS QUE <b>MOVEM.</b></div><span className="preview-time">LOCAL / ON DEMAND</span></div><div className="preview-track"><span/><span/><span/><span/><span/><span/><span/><span/><span/></div><div className="preview-bottom"><span>EDITORIAL / MOTION / STORYTELLING</span><span>09 AI</span></div></div>
    </section>
    <section className="video-ai-stats"><article><span>01</span><b>Briefing criativo</b><small>Direção e objetivo</small></article><article><span>02</span><b>Análise audiovisual</b><small>Fala, cenas e áudio</small></article><article><span>03</span><b>Edição inteligente</b><small>Montagem e motion</small></article><article><span>04</span><b>Revisão da 09</b><small>Prévia e exportação</small></article></section>
    <section className="video-ai-workspace">
      <div className="video-ai-section-head"><div><span className="eyebrow">FLUXO DE TRABALHO</span><h2>Como usar nesta fase</h2></div></div>
      <div className="video-ai-empty"><Clapperboard size={27}/><b>Envie o vídeo diretamente nesta conversa</b><p>Inclua objetivo, plataforma, duração desejada, estilo de edição, referências e elementos obrigatórios. O ChatGPT pode ajudar a analisar e planejar a edição. O renderizador local ainda precisa ser executado no computador que fará o processamento.</p><span className="video-ai-module-state">Upload em nuvem desativado para evitar custos e retenção de arquivos.</span></div>
    </section>
    <section className="video-ai-modules">
      <article className="video-ai-module"><div className="video-ai-module-icon"><AudioLines size={19}/></div><div className="video-ai-module-copy"><span>MÓDULO 01</span><h3>Áudio inteligente</h3><p>Normalização local implementada; redução avançada de ruído pendente</p></div><span className="video-ai-module-state">Em construção</span></article>
      <article className="video-ai-module"><div className="video-ai-module-icon"><Captions size={19}/></div><div className="video-ai-module-copy"><span>MÓDULO 02</span><h3>Legendas premium</h3><p>Transcrição sincronizada e palavras em destaque</p></div><span className="video-ai-module-state">Próxima fase</span></article>
      <article className="video-ai-module"><div className="video-ai-module-icon"><Images size={19}/></div><div className="video-ai-module-copy"><span>MÓDULO 03</span><h3>B-roll e imagens</h3><p>Apoios visuais alinhados ao conteúdo</p></div><span className="video-ai-module-state">Próxima fase</span></article>
      <article className="video-ai-module"><div className="video-ai-module-icon"><Sparkles size={19}/></div><div className="video-ai-module-copy"><span>MÓDULO 04</span><h3>Motion graphics</h3><p>Títulos, números, gráficos e animações</p></div><span className="video-ai-module-state">Próxima fase</span></article>
    </section>
    <div className="video-ai-footnote"><Layers3 size={14}/> Motor local FFmpeg/FFprobe: execução manual, arquivos temporários e saída escolhida pela equipe. Nenhum processamento contínuo na nuvem.</div>
  </div>;
}
