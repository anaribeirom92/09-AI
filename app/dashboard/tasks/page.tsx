import { CheckSquare } from "lucide-react";
import { getAgencyContext, formatDate, statusLabel } from "@/lib/agency";
export default async function TasksPage() {
 const {supabase,organization}=await getAgencyContext();
 const {data}=await supabase.from("tasks").select("id,title,description,status,priority,due_at").eq("organization_id",organization!.id).order("due_at",{ascending:true,nullsFirst:false});
 const items=data??[];
 return <div className="dashboard-page"><section className="page-heading"><div><span className="eyebrow">PLANEJAMENTO E ENTREGA</span><h1>Tarefas<span className="heading-dot">.</span></h1><p>Responsáveis, prioridades e prazos visíveis para todo o time.</p></div><span className="count-chip">{items.length} tarefas</span></section>
 <section className="panel list-panel"><div className="panel-heading"><div><span className="eyebrow">QUADRO DE EXECUÇÃO</span><h3>Demandas registradas</h3></div><CheckSquare size={19} className="muted-icon"/></div>{items.length?<div className="table-wrap"><table><thead><tr><th>DEMANDA</th><th>PRIORIDADE</th><th>STATUS</th><th>PRAZO</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td className="task-name"><b>{x.title}</b>{x.description&&<small className="task-description">{x.description}</small>}</td><td><span className={`priority priority-${x.priority}`}>{x.priority??"Normal"}</span></td><td>{statusLabel(x.status)}</td><td>{formatDate(x.due_at)}</td></tr>)}</tbody></table></div>:<div className="empty-panel"><CheckSquare size={26}/><b>Nenhuma tarefa cadastrada</b><p>As demandas da equipe serão organizadas nesta área.</p></div>}</section></div>;
}
