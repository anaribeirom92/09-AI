import { BriefcaseBusiness } from "lucide-react";
import { getAgencyContext, formatDate, statusLabel } from "@/lib/agency";
export default async function ProjectsPage() {
 const {supabase,organization}=await getAgencyContext();
 const {data}=await supabase.from("projects").select("id,name,description,status,priority,starts_at,due_at").eq("organization_id",organization!.id).order("created_at",{ascending:false});
 const items=data??[];
 return <div className="dashboard-page"><section className="page-heading"><div><span className="eyebrow">GESTÃO DA AGÊNCIA</span><h1>Projetos<span className="heading-dot">.</span></h1><p>Campanhas, contas e iniciativas com visão de ponta a ponta.</p></div><span className="count-chip">{items.length} projetos</span></section>
 <section className="panel list-panel"><div className="panel-heading"><div><span className="eyebrow">PORTFÓLIO DE TRABALHO</span><h3>Todos os projetos</h3></div><BriefcaseBusiness size={19} className="muted-icon"/></div>{items.length?<div className="project-list">{items.map(x=><article className="project-row" key={x.id}><div className="project-symbol"><BriefcaseBusiness size={18}/></div><div className="project-main"><b>{x.name}</b><p>{x.description||"Sem descrição cadastrada."}</p><small>Início: {formatDate(x.starts_at)} · Prazo: {formatDate(x.due_at)}</small></div><span className={`status-pill status-${x.status}`}>{statusLabel(x.status)}</span></article>)}</div>:<div className="empty-panel"><BriefcaseBusiness size={26}/><b>Nenhum projeto cadastrado</b><p>Quando os projetos forem registrados, eles aparecerão nesta visão.</p></div>}</section></div>;
}
