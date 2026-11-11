import { Film, AudioLines, Captions, Clapperboard, Images, Sparkles, WandSparkles, ShieldCheck, Clock3, Layers3, ArrowUpRight } from "lucide-react";
import "./video-ai.css";

const pipeline = [
  { icon: AudioLines, title: "Áudio inteligente", detail: "Redução de ruído, nivelamento e limpeza de voz", state: "Planejado" },
  { icon: Captions, title: "Legendas premium", detail: "Transcrição sincronizada e palavras em destaque", state: "Planejado" },
  { icon: Clapperboard, title: "Edição narrativa", detail: "Cortes, ritmo, zooms e enquadramentos", state: "Planejado" },
  { icon: Images, title: "B-roll e imagens", detail: "Apoios visuais alinhados ao que está sendo dito", state: "Planejado" },
  { icon: Sparkles, title: "Motion graphics", detail: "Títulos, números, gráficos e animações", state: "Planejado" },
];

export default function VideoAIPage() {
  return <div className="video-ai-page">
    <section className="video-ai-heading">
      <div>
        <span className="eyebrow">ESTÚDIO AUDIOVISUAL INTELIGENTE</span>
        <h1>09 VIDEO AI<span className="heading-dot">.</span></h1>
        <p>Do bruto à edição premium. Um briefing, uma direção criativa e um fluxo de produção inteligente.</p>
      </div>
      <div className="video-ai-status"><span className="status-pulse"/> FUNDAÇÃO EM CONSTRUÇÃO</div>
    </section>

    <section className="video-ai-hero">
      <div className="video-ai-hero-copy">
        <span className="video-ai-kicker"><WandSparkles size={14}/> SEU NOVO ESTÚDIO DE PÓS-PRODUÇÃO</span>
        <h2>Você direciona.<br/><em>A IA edita.</em></h2>
        <p>Envie o material bruto, descreva a intenção criativa e acompanhe cada etapa até a aprovação do vídeo final.</p>
        <div className="video-ai-tags"><span>ÁUDIO</span><span>LEGENDAS</span><span>MOTION</span><span>B-ROLL</span><span>RENDER 4K*</span></div>
        <small>*Resolução final será definida conforme o arquivo de origem e a capacidade de renderização.</small>
      </div>
      <div className="video-ai-preview">
        <div className="preview-top"><span><i/> LIVE WORKFLOW</span><span>09 / VIDEO</span></div>
        <div className="preview-screen">
          <div className="preview-orbit orbit-a"/><div className="preview-orbit orbit-b"/>
          <div className="preview-play"><Film size={25}/></div>
          <div className="preview-caption">IDEIAS QUE <b>MOVEM.</b></div>
          <span className="preview-time">00:18 / 00:52</span>
        </div>
        <div className="preview-track"><span/><span/><span/><span/><span/><span/><span/><span/><span/></div>
        <div className="preview-bottom"><span>EDITORIAL / MOTION / STORYTELLING</span><span>09 AI</span></div>
      </div>
    </section>

    <section className="video-ai-stats">
      <article><span>01</span><b>Briefing criativo</b><small>Direção e objetivo</small></article>
      <article><span>02</span><b>Análise audiovisual</b><small>Fala, cenas e áudio</small></article>
      <article><span>03</span><b>Edição inteligente</b><small>Montagem e motion</small></article>
      <article><span>04</span><b>Aprovação final</b><small>Prévia e exportação</small></article>
    </section>

    <section className="video-ai-section-head">
      <div><span className="eyebrow">PIPELINE DE PRODUÇÃO</span><h2>Uma equipe inteira. Um fluxo só.</h2></div>
      <span className="video-ai-counter"><Layers3 size={14}/> 05 MÓDULOS</span>
    </section>
    <section className="video-ai-modules">
      {pipeline.map((item,index)=>{const Icon=item.icon;return <article className="video-ai-module" key={item.title}>
        <div className="video-ai-module-icon"><Icon size={19}/></div>
        <div className="video-ai-module-copy"><span>MÓDULO 0{index+1}</span><h3>{item.title}</h3><p>{item.detail}</p></div>
        <span className="video-ai-module-state">{item.state}</span>
      </article>;})}
    </section>

    <section className="video-ai-next">
      <div className="video-ai-next-icon"><ShieldCheck size={20}/></div>
      <div><b>Produção com controle e aprovação</b><p>O arquivo original será preservado. A IA propõe a edição; você ou o cliente aprovam antes do render final e da entrega.</p></div>
      <span><Clock3 size={14}/> FASE 0 / 5</span>
    </section>
    <div className="video-ai-footnote"><ArrowUpRight size={14}/> O próximo marco é ativar projetos, upload privado e fila de processamento. Nenhum vídeo será enviado ou processado até a conclusão dessa etapa.</div>
  </div>;
}
