import { Bot, ShieldCheck } from "lucide-react";
import { getAgencyContext, statusLabel } from "@/lib/agency";
export default async function AgentsPage() {
 const {supabase,organization}=await getAgencyContext();
 const {data}=await supabase.from("agents").select("id,name,code,role_title,description,status,reports_to_agent_id").eq("organization_id",organization!.id).order("created_at");
 const agents=data??[];
 return <div className="dashboard-page"><section className="page-heading"><div><span className="eyebrow">ESTRUTURA ORGANIZACIONAL</span><h1>Agentes<span className="heading-dot">.</span></h1><p>Especialistas digitais e suas responsabilidades dentro da operação.</p></div><span className="count-chip">{agents.length} cadastrados</span></section>
 <div className="section-callout"><ShieldCheck size={18}/><p>Agentes em rascunho não executam tarefas. A ativação e as permissões de execução exigem autorização da direção.</p></div>
 <section className="agent-cards">{agents.map(x=><article className="agent-card" key={x.id}><div className="agent-card-top"><div className="agent-avatar large">{x.code?.slice(0,2)??"AI"}</div><span className={`status-pill status-${x.status}`}>{statusLabel(x.status)}</span></div><h3>{x.name}</h3><p className="agent-role">{x.role_title}</p><p className="agent-description">{x.description||"Responsabilidades e escopo serão detalhados nesta ficha."}</p><div className="agent-card-footer"><span><Bot size={14}/> {x.code}</span><span>{x.reports_to_agent_id?"Com liderança":"Reporta à direção"}</span></div></article>)}</section></div>;
}
