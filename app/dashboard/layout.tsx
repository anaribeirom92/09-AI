import Link from "next/link";
import { redirect } from "next/navigation";
import { Bot, CheckSquare, ClipboardList, LayoutDashboard, ShieldCheck, Sparkles } from "lucide-react";
import { getAgencyContext } from "@/lib/agency";
import { SignOutButton } from "@/components/sign-out-button";
const nav = [
  {href:"/dashboard",label:"Visão geral",icon:LayoutDashboard},
  {href:"/dashboard/agents",label:"Agentes",icon:Bot},
  {href:"/dashboard/projects",label:"Projetos",icon:ClipboardList},
  {href:"/dashboard/tasks",label:"Tarefas",icon:CheckSquare},
  {href:"/dashboard/approvals",label:"Aprovações",icon:ShieldCheck},
];
export default async function DashboardLayout({children}:{children:React.ReactNode}) {
  const {userId,membership,organization} = await getAgencyContext();
  if (!userId) redirect("/login");
  if (!membership || !organization || !["owner","director","manager"].includes(membership.role)) redirect("/sem-acesso");
  return <div className="app-shell">
    <aside className="sidebar">
      <Link className="sidebar-brand" href="/dashboard"><span className="brand-mark">09</span><span><b>AI AGENCY</b><small>OPERATING SYSTEM</small></span></Link>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-name"><span className="workspace-dot"/>{organization.name}</div>
      <nav className="side-nav" aria-label="Navegação principal">{nav.map(item=>{const Icon=item.icon;return <Link key={item.href} href={item.href} className="nav-item"><Icon size={17}/><span>{item.label}</span></Link>;})}</nav>
      <div className="sidebar-bottom"><div className="system-status"><span className="status-pulse"/><span><b>Sistema operacional</b><small>Infraestrutura conectada</small></span></div><SignOutButton/></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="topbar-context"><Sparkles size={15}/><span>Central de comando</span><span className="topbar-slash">/</span><span className="topbar-current">09 AI Agency</span></div>
        <div className="topbar-user"><span className="user-avatar">09</span><span><b>Administração</b><small>{membership.role==="owner"?"Proprietária":membership.role==="director"?"Direção":"Gestão"}</small></span></div>
      </header>
      <div className="page-content">{children}</div>
      <footer className="app-footer"><span>09 AI AGENCY</span><span>ESTRATÉGIA • CRIAÇÃO • PERFORMANCE</span></footer>
    </main>
  </div>;
}
