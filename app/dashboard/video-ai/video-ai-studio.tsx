 "use client";

import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AudioLines, Captions, Clapperboard, Film, Images, Layers3,
  LoaderCircle, Plus, ShieldCheck, Sparkles, UploadCloud, WandSparkles, X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as tus from "tus-js-client";

type VideoProject = {
  id: string; name: string; description: string | null; status: string;
  aspect_ratio: string; resolution: string; created_at: string; updated_at: string;
};
type Props = { organizationId: string; initialProjects: VideoProject[] };

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/webm", "video/x-matroska",
  "audio/mpeg", "audio/wav", "audio/mp4", "image/jpeg", "image/png", "image/webp"
]);
const ALLOWED_EXTENSIONS = new Set(["mp4","mov","webm","mkv","mp3","wav","m4a","jpg","jpeg","png","webp"]);

function safeFilename(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120);
  return cleaned || "arquivo";
}
function mimeForFile(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  const types: Record<string,string> = { mp4:"video/mp4",mov:"video/quicktime",webm:"video/webm",mkv:"video/x-matroska",mp3:"audio/mpeg",wav:"audio/wav",m4a:"audio/mp4",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp" };
  return ext ? types[ext] ?? "application/octet-stream" : "application/octet-stream";
}
function uploadResumable(file: File, path: string, accessToken: string, onProgress: (percent: number) => void) {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!projectUrl || !apiKey) return Promise.reject(new Error("Configuração do Storage não encontrada."));
  const projectRef = new URL(projectUrl).hostname.split(".")[0];
  const contentType = mimeForFile(file);
  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${accessToken}`, apikey: apiKey, "x-upsert": "false" },
      metadata: { bucketName: "09-video-ai", objectName: path, contentType, cacheControl: "3600" },
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      onError: reject,
      onProgress: (uploaded, total) => onProgress(Math.round((uploaded / total) * 100)),
      onSuccess: () => resolve()
    });
    upload.findPreviousUploads().then(previous => {
      if (previous.length) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(reject);
  });
}
function formatSize(bytes: number) {
  return bytes >= 1024 ** 3 ? (bytes / 1024 ** 3).toFixed(2) + " GB" : (bytes / 1024 ** 2).toFixed(1) + " MB";
}
function statusText(status: string) {
  const labels: Record<string,string> = {
    draft:"Rascunho",ingesting:"Recebendo mídia",analyzing:"Em análise",
    ready_for_review:"Pronto para revisão",rendering:"Renderizando",
    completed:"Concluído",failed:"Falha",archived:"Arquivado"
  };
  return labels[status] ?? status;
}

export default function VideoAIStudio({ organizationId, initialProjects }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [projects,setProjects] = useState(initialProjects);
  const [name,setName] = useState("");
  const [brief,setBrief] = useState("");
  const [aspectRatio,setAspectRatio] = useState("9:16");
  const [resolution,setResolution] = useState("1080p");
  const [file,setFile] = useState<File|null>(null);
  const [busy,setBusy] = useState(false);
  const [progress,setProgress] = useState("");
  const [error,setError] = useState("");
  const [showForm,setShowForm] = useState(false);
  const allowedFile = useMemo(() => {
    if (!file) return false;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    return ALLOWED_MIME_TYPES.has(file.type) || ALLOWED_EXTENSIONS.has(ext);
  },[file]);

  function chooseFile(nextFile?: File) {
    setError("");
    if (!nextFile) { setFile(null); return; }
    const ext = nextFile.name.split(".").pop()?.toLowerCase() ?? "";
    if (nextFile.size > MAX_FILE_SIZE) { setFile(null); setError("O arquivo ultrapassa o limite de 2 GB por envio."); return; }
    if (!ALLOWED_MIME_TYPES.has(nextFile.type) && !ALLOWED_EXTENSIONS.has(ext)) {
      setFile(null); setError("Formato não permitido. Envie MP4, MOV, WebM, MKV, áudio ou imagem."); return;
    }
    setFile(nextFile);
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setError("Dê um nome para este projeto."); return; }
    if (!file || !allowedFile) { setError("Selecione um arquivo válido para iniciar a ingestão."); return; }
    setBusy(true); setError("");
    const supabase = createClient();
    let uploadedPath: string|null = null;
    let assetId: string|null = null;
    let createdProjectId: string|null = null;
    try {
      setProgress("Validando sessão e criando projeto…");
      const {data:authData,error:authError} = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sua sessão expirou. Entre novamente.");
      const {data:project,error:projectError} = await supabase.from("video_projects").insert({
        organization_id:organizationId,name:name.trim(),description:brief.trim()||null,
        creative_brief:brief.trim()||null,aspect_ratio:aspectRatio,resolution,created_by:authData.user.id
      }).select("id,name,description,status,aspect_ratio,resolution,created_at,updated_at").single();
      if (projectError) throw projectError;
      createdProjectId = project.id;
      assetId = crypto.randomUUID();
      const path = project.id + "/" + assetId + "/" + safeFilename(file.name);
      setProgress("Enviando arquivo original (" + formatSize(file.size) + ")…");
      const {error:uploadError} = await supabase.storage.from("09-video-ai").upload(path,file,{
        cacheControl:"3600",upsert:false,contentType:file.type||undefined
      });
      if (uploadError) throw uploadError;
      uploadedPath = path;
      setProgress("Registrando mídia e preparando a fila…");
      const kind = file.type.startsWith("audio/") ? "audio" : file.type.startsWith("image/") ? "broll" : "original";
      const {error:assetError} = await supabase.from("video_assets").insert({
        id:assetId,organization_id:organizationId,project_id:project.id,kind,storage_path:path,
        original_filename:file.name,mime_type:mimeForFile(file),size_bytes:file.size,
        metadata:{source:"dashboard_upload"},created_by:authData.user.id
      });
      if (assetError) throw assetError;
      const {error:jobError} = await supabase.from("video_jobs").insert({
        organization_id:organizationId,project_id:project.id,job_type:"ingest",status:"queued",
        payload:{asset_id:assetId,storage_path:path},idempotency_key:"ingest:"+assetId,created_by:authData.user.id
      });
      if (jobError) throw jobError;
      await supabase.from("video_projects").update({status:"ingesting"}).eq("id",project.id);
      setProjects(current => [project,...current]);
      setName(""); setBrief(""); setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setShowForm(false); setProgress("Projeto criado e mídia adicionada à fila de ingestão.");
      router.refresh();
    } catch (caught) {
      if (assetId && createdProjectId) await supabase.from("video_assets").delete().eq("id",assetId);
      if (uploadedPath) await supabase.storage.from("09-video-ai").remove([uploadedPath]);
      setError(caught instanceof Error ? caught.message : "Não foi possível concluir o envio.");
      setProgress("");
    } finally { setBusy(false); }
  }

  return <div className="video-ai-page">
    <section className="video-ai-heading"><div><span className="eyebrow">AGENTE ESPECIALISTA EM PRODUÇÃO AUDIOVISUAL</span><h1>09 VIDEO AI<span className="heading-dot">.</span></h1><p>Um agente da 09 IA dedicado a transformar material bruto em vídeos prontos para revisão da equipe.</p></div><div className="video-ai-status"><span className="status-pulse"/> USO INTERNO · 09 IA</div></section>
    <section className="video-ai-hero"><div className="video-ai-hero-copy"><span className="video-ai-kicker"><WandSparkles size={14}/> ESTÚDIO DE PÓS-PRODUÇÃO</span><h2>Você direciona.<br/><em>A IA edita.</em></h2><p>A equipe envia o material bruto, define a direção criativa e acompanha cada etapa até a aprovação interna do vídeo final.</p><div className="video-ai-tags"><span>ÁUDIO</span><span>LEGENDAS</span><span>MOTION</span><span>B-ROLL</span><span>RENDER</span></div><small>O original é preservado. Nenhum arquivo é compartilhado com clientes pela plataforma.</small></div><div className="video-ai-preview"><div className="preview-top"><span><i/> WORKFLOW 09</span><span>09 / VIDEO</span></div><div className="preview-screen"><div className="preview-orbit orbit-a"/><div className="preview-orbit orbit-b"/><div className="preview-play"><Film size={25}/></div><div className="preview-caption">IDEIAS QUE <b>MOVEM.</b></div><span className="preview-time">STUDIO / 09 AI</span></div><div className="preview-track"><span/><span/><span/><span/><span/><span/><span/><span/><span/></div><div className="preview-bottom"><span>EDITORIAL / MOTION / STORYTELLING</span><span>09 AI</span></div></div></section>
    <section className="video-ai-stats"><article><span>01</span><b>Briefing criativo</b><small>Direção e objetivo</small></article><article><span>02</span><b>Análise audiovisual</b><small>Fala, cenas e áudio</small></article><article><span>03</span><b>Edição inteligente</b><small>Montagem e motion</small></article><article><span>04</span><b>Revisão da 09</b><small>Prévia e exportação</small></article></section>
    <section className="video-ai-workspace">
      <div className="video-ai-section-head"><div><span className="eyebrow">PRODUÇÃO INTERNA</span><h2>Projetos de vídeo</h2></div><button className="video-ai-primary" onClick={()=>{setShowForm(v=>!v);setError("");}}>{showForm?<X size={16}/>:<Plus size={16}/>} {showForm?"Fechar":"Novo projeto"}</button></div>
      {showForm && <form className="video-ai-form" onSubmit={createProject}>
        <div className="video-ai-form-heading"><div><span className="eyebrow">NOVA PRODUÇÃO</span><h3>Começar um vídeo</h3></div><span>01 / INGESTÃO</span></div>
        <label>Nome do projeto<input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex.: Campanha institucional — UniGoiás" maxLength={160} required/></label>
        <label>Direção criativa / briefing<textarea value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Objetivo, público, estilo, referências, ritmo, formato, elementos obrigatórios…" rows={4}/></label>
        <div className="video-ai-form-grid"><label>Formato<select value={aspectRatio} onChange={e=>setAspectRatio(e.target.value)}><option value="9:16">Vertical · 9:16</option><option value="16:9">Horizontal · 16:9</option><option value="1:1">Quadrado · 1:1</option></select></label><label>Resolução<select value={resolution} onChange={e=>setResolution(e.target.value)}><option value="1080p">Full HD · 1080p</option><option value="720p">HD · 720p</option><option value="1440p">QHD · 1440p</option><option value="2160p">4K · 2160p</option></select></label></div>
        <div className="video-ai-file-picker" onClick={()=>fileInput.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();chooseFile(e.dataTransfer.files[0]);}}><input ref={fileInput} type="file" accept="video/mp4,video/quicktime,video/webm,video/x-matroska,audio/*,image/jpeg,image/png,image/webp,.mkv" onChange={e=>chooseFile(e.target.files?.[0])} hidden/><UploadCloud size={25}/><b>{file?file.name:"Arraste o arquivo bruto ou clique para selecionar"}</b><span>{file?formatSize(file.size)+" · Arquivo selecionado":"Vídeo, áudio ou imagem · Máximo de 2 GB por arquivo"}</span></div>
        {error && <p className="video-ai-error" role="alert">{error}</p>}{progress && <p className="video-ai-progress"><LoaderCircle size={14} className={busy?"video-ai-spin":""}/>{progress}</p>}
        <div className="video-ai-form-actions"><span><ShieldCheck size={14}/> Armazenamento privado · somente equipe 09</span><button className="video-ai-primary" type="submit" disabled={busy}>{busy?<LoaderCircle size={15} className="video-ai-spin"/>:<UploadCloud size={15}/>} {busy?"Processando…":"Criar projeto e enviar"}</button></div>
      </form>}
      <div className="video-ai-project-list">{projects.length?projects.map(project=><article className="video-ai-project-row" key={project.id}><div className="video-ai-project-icon"><Film size={19}/></div><div className="video-ai-project-main"><b>{project.name}</b><p>{project.description||"Sem briefing adicional."}</p><small>{project.aspect_ratio} · {project.resolution} · {new Date(project.created_at).toLocaleDateString("pt-BR")}</small></div><span className={"video-ai-project-status status-"+project.status}>{statusText(project.status)}</span></article>):<div className="video-ai-empty"><Clapperboard size={27}/><b>Nenhum projeto de vídeo ainda</b><p>Crie o primeiro projeto e envie o material bruto para iniciar a fila de ingestão.</p><button className="video-ai-secondary" onClick={()=>setShowForm(true)}>Criar primeiro projeto</button></div>}</div>
    </section>
    <section className="video-ai-modules"><article className="video-ai-module"><div className="video-ai-module-icon"><AudioLines size={19}/></div><div className="video-ai-module-copy"><span>MÓDULO 01</span><h3>Áudio inteligente</h3><p>Redução de ruído, nivelamento e limpeza de voz</p></div><span className="video-ai-module-state">Próxima fase</span></article><article className="video-ai-module"><div className="video-ai-module-icon"><Captions size={19}/></div><div className="video-ai-module-copy"><span>MÓDULO 02</span><h3>Legendas premium</h3><p>Transcrição sincronizada e palavras em destaque</p></div><span className="video-ai-module-state">Próxima fase</span></article><article className="video-ai-module"><div className="video-ai-module-icon"><Images size={19}/></div><div className="video-ai-module-copy"><span>MÓDULO 03</span><h3>B-roll e imagens</h3><p>Apoios visuais alinhados ao conteúdo</p></div><span className="video-ai-module-state">Próxima fase</span></article><article className="video-ai-module"><div className="video-ai-module-icon"><Sparkles size={19}/></div><div className="video-ai-module-copy"><span>MÓDULO 04</span><h3>Motion graphics</h3><p>Títulos, números, gráficos e animações</p></div><span className="video-ai-module-state">Próxima fase</span></article></section>
    <div className="video-ai-footnote"><Layers3 size={14}/> A ingestão registra o arquivo e cria um job durável. O processamento audiovisual real será ativado pelo worker FFmpeg/Remotion na próxima fase.</div>
  </div>;
}
