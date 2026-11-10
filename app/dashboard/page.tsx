import Link from "next/link";
import { ArrowUpRight, Bot, BriefcaseBusiness, CheckCircle2, Clock3, ShieldAlert, Sparkles } from "lucide-react";
import { getAgencyContext, formatDate, statusLabel } from "@/lib/agency";
export default async function DashboardPage() {
 const {supabase,organization}=await getAgencyContext(); const org=organization!.id;
 const [a,p,t,ap,ar,rr,tr]=await Promise.all([
  supabase.from("agents").select("id",{count:"exact",head:true}).eq("organization_id",org),
  supabase.from("projects").select("id",{count:"exact",head:true}).eq("organization_id",org),
  supabase.from("tasks").select("id",{count:"exact",head:true}).eq("organization_id",org).neq("status","completed"),
  supabase.from("approvals").select("id",{count:"exact",head:true}).eq("organization_id",org).eq("status","pending"),
  supabase.from("agents").select("id,name,role_title,status,code").eq("organization_id",org).order("created_at"),
  supabase.from("agent_runs").select("id,status,created_at,agent_id").eq("organization_id",org).order("created_at",{ascending:false}).limit(5),
  supabase.from("tasks").select("id,title,status,priority,due_at").eq("organization_id",org).neq("status","completed").order("due_at",{ascending:true,nullsFirst:false}).limit(5)
 ]);
 const agents=ar.data??[];const runs=rr.data??[];const tasks=tr.data??[];const names=new Map(agents.map(x=>[x.id,x.name]));
 const stats=[{label:"Agentes cadastrados",value:a.count??0,icon:Bot,note:"Especialistas da operação"},{label:"Projetos",value:p.count??0,icon:BriefcaseBusiness,note:"Frentes de trabalho"},{label:"Tarefas abertas",value:t.count??0,icon:CheckCircle2,note:"Demandas em acompanhamento"},{label:"Aprovações pendentes",value:ap.count??0,icon:ShieldAlert,note:"Decisões reservadas à direção"}];
 return <div className="dashboard-page">
  <section className="page-heading"><div><span className="eyebrow">CENTRAL DE OPERAÇÕES</span><h1>Visão geral<span className="heading-dot">.</span></h1><p>A operação da 09, organizada em um só lugar.</p></div><div className="live-indicator"><span className="status-pulse"/> Ambiente conectado</div></section>
  <section className="welcome-banner"><div className="welcome-orbit orbit-one"/><div className="welcome-orbit orbit-two"/><div className="welcome-copy"><span className="welcome-tag"><Sparkles size={13}/> SEU CENTRO DE COMANDO</span><h2>Ideias boas precisam de<br/><em>operação extraordinária.</em></h2><p>Agentes, equipes e projetos trabalhando com clareza, responsabilidade e ritmo.</p></div><div className="welcome-number">09<span>AI</span></div></section>
  <section className="stats-grid">{stats.map((s,i)=>{const Icon=s.icon;return <article className="stat-card" key={s.label}><div className="stat-card-top"><span>{s.label}</span><span className={i===3?"stat-icon orange":"stat-icon"}><Icon size={18}/></span></div><strong>{String(s.value).padStart(2,"0")}</strong><small>{s.note}</small></article>;})}</section>
  <section className="dashboard-grid">
   <article className="panel"><div className="panel-heading"><div><span className="eyebrow">TIME INTELIGENTE</span><h3>Agentes da 09</h3></div><Link href="/dashboard/agents" className="text-link">Ver todos <ArrowUpRight size={15}/></Link></div><div className="agent-list">{agents.map(x=><div className="agent-row" key={x.id}><div className="agent-avatar">{x.code?.slice(0,2)??"AI"}</div><div className="agent-info"><b>{x.name}</b><small>{x.role_title}</small></div><span className={`status-pill status-${x.status}`}>{statusLabel(x.status)}</span></div>)}{!agents.length&&<div className="empty-state">Nenhum agente cadastrado ainda.</div>}</div></article>
   <article className="panel"><div className="panel-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h3>Execuções recentes</h3></div><span className="panel-counter">{runs.length} últimas</span></div><div className="activity-list">{runs.map(run=><div className="activity-row" key={run.id}><span className={`activity-icon activity-${run.status}`}>{run.status==="succeeded"?<CheckCircle2 size={16}/>:<Clock3 size={16}/>}</span><div><b>{names.get(run.agent_id)??"Agente"}</b><small>{statusLabel(run.status)} · {formatDate(run.created_at)}</small></div><span className={`status-pill status-${run.status}`}>{statusLabel(run.status)}</span></div>)}{!runs.length&&<div className="empty-state">As execuções aparecerão aqui quando os agentes forem autorizados e utilizados.</div>}</div></article>
  </section>
  <section className="panel task-panel"><div className="panel-heading"><div><span className="eyebrow">PRÓXIMAS ENTREGAS</span><h3>Tarefas em aberto</h3></div><Link href="/dashboard/tasks" className="text-link">Abrir tarefas <ArrowUpRight size={15}/></Link></div><div className="table-wrap"><table><thead><tr><th>DEMANDA</th><th>PRIORIDADE</th><th>STATUS</th><th>PRAZO</th></tr></thead><tbody>{tasks.map(x=><tr key={x.id}><td className="task-name">{x.title}</td><td><span className={`priority priority-${x.priority}`}>{x.priority??"Normal"}</span></td><td>{statusLabel(x.status)}</td><td>{formatDate(x.due_at)}</td></tr>)}{!tasks.length&&<tr><td colSpan={4} className="table-empty">Nenhuma tarefa aberta. A operação começa a ganhar forma por aqui.</td></tr>}</tbody></table></div></section>
  <div className="safety-note"><ShieldAlert size={17}/><p><b>Controle de autonomia:</b> os agentes seguem em rascunho. Publicações, despesas, mudanças de preço e mídia paga continuam condicionadas à aprovação explícita da direção.</p></div>
 </div>;
}
