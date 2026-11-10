import { ShieldCheck } from "lucide-react";
import { getAgencyContext, formatDate, statusLabel } from "@/lib/agency";
export default async function ApprovalsPage() {
 const {supabase,organization}=await getAgencyContext();
 const {data}=await supabase.from("approvals").select("id,summary,status,action_type,resource_type,created_at").eq("organization_id",organization!.id).order("created_at",{ascending:false});
 const items=data??[];
 return <div className="dashboard-page"><section className="page-heading"><div><span className="eyebrow">GOVERNANÇA E AUTONOMIA</span><h1>Aprovações<span className="heading-dot">.</span></h1><p>Decisões que precisam permanecer sob controle humano.</p></div><span className="count-chip">{items.filter(x=>x.status==="pending").length} pendentes</span></section>
 <div className="section-callout"><ShieldCheck size={18}/><p>Ações com impacto financeiro, externo ou irreversível exigem autorização explícita. Esta versão apresenta a fila; o fluxo decisório será conectado às regras de governança antes de habilitar decisões por aqui.</p></div>
 <section className="panel list-panel"><div className="panel-heading"><div><span className="eyebrow">REGISTRO DE DECISÕES</span><h3>Solicitações recebidas</h3></div><ShieldCheck size={19} className="muted-icon"/></div>{items.length?<div className="approval-list">{items.map(x=><article className="approval-row" key={x.id}><div className="approval-icon"><ShieldCheck size={17}/></div><div className="approval-content"><b>{x.summary}</b><p>{x.action_type} · {x.resource_type}</p><small>Solicitada em {formatDate(x.created_at)}</small></div><span className={`status-pill status-${x.status}`}>{statusLabel(x.status)}</span></article>)}</div>:<div className="empty-panel"><ShieldCheck size={26}/><b>Nenhuma aprovação pendente</b><p>Quando uma ação exigir autorização, a solicitação aparecerá aqui.</p></div>}</section></div>;
}
