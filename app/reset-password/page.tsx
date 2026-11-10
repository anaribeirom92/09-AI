import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="brand-lockup"><span className="brand-mark">09</span><span>COMUNICAÇÃO<br />INTEGRADA</span></div>
        <div className="login-manifesto">
          <span className="eyebrow">AGENCY OPERATING SYSTEM</span>
          <h1>Seu acesso.<br /><em>Seu espaço de comando.</em></h1>
          <p>Defina uma senha segura para acessar a operação da 09.</p>
        </div>
        <div className="login-footer">09 AI AGENCY <span>•</span> GOIÂNIA, BRASIL</div>
      </section>
      <section className="login-form-panel"><div className="login-card">
        <div className="mobile-brand"><span className="brand-mark">09</span><b>09 AI AGENCY</b></div>
        <span className="eyebrow">CONFIGURAÇÃO DE ACESSO</span>
        <h2>Crie sua senha.</h2>
        <p className="muted">Use uma senha exclusiva para proteger sua conta administrativa.</p>
        <ResetPasswordForm />
        <p className="login-security">Acesso protegido • Somente pessoas autorizadas</p>
      </div></section>
    </main>
  );
}
