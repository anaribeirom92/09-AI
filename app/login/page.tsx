import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const supabase = await createClient();
  const { data: { claims } } = await supabase.auth.getClaims();
  if (claims?.sub) redirect("/dashboard");
  const params = await searchParams;
  return <main className="login-shell">
    <section className="login-brand-panel">
      <div className="brand-lockup"><span className="brand-mark">09</span><span>COMUNICAÇÃO<br/>INTEGRADA</span></div>
      <div className="login-manifesto"><span className="eyebrow">AGENCY OPERATING SYSTEM</span>
        <h1>Estratégia em movimento.<br/><em>Operação sob controle.</em></h1>
        <p>Um centro de comando para conectar pessoas, projetos e inteligência.</p>
      </div>
      <div className="login-footer">09 AI AGENCY <span>•</span> GOIÂNIA, BRASIL</div>
    </section>
    <section className="login-form-panel"><div className="login-card">
      <div className="mobile-brand"><span className="brand-mark">09</span><b>09 AI AGENCY</b></div>
      <span className="eyebrow">ACESSO RESTRITO</span><h2>Bom ter você de volta.</h2>
      <p className="muted">Entre com seu e-mail e senha para acessar a operação.</p>
      <LoginForm error={params.error} message={params.message}/>
      <p className="login-security">Acesso protegido • Somente pessoas autorizadas</p>
    </div></section>
  </main>;
}
