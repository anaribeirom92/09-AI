export default async function ConfirmAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const params = await searchParams;
  const validType = params.type === "invite" || params.type === "recovery";
  const validToken = typeof params.token_hash === "string" && params.token_hash.length > 10;

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="brand-lockup"><span className="brand-mark">09</span><span>COMUNICAÇÃO<br />INTEGRADA</span></div>
        <div className="login-manifesto">
          <span className="eyebrow">AGENCY OPERATING SYSTEM</span>
          <h1>Um convite para<br /><em>fazer acontecer.</em></h1>
          <p>Confirme seu acesso para entrar no centro de comando da 09.</p>
        </div>
        <div className="login-footer">09 AI AGENCY <span>•</span> GOIÂNIA, BRASIL</div>
      </section>
      <section className="login-form-panel"><div className="login-card">
        <div className="mobile-brand"><span className="brand-mark">09</span><b>09 AI AGENCY</b></div>
        <span className="eyebrow">VALIDAÇÃO DE ACESSO</span>
        <h2>{validToken && validType ? "Confirme seu acesso." : "Link inválido."}</h2>
        {validToken && validType ? (
          <>
            <p className="muted">Clique no botão abaixo para validar o link e continuar para a configuração da sua senha.</p>
            <form className="login-form" action="/auth/confirm/submit" method="post">
              <input type="hidden" name="token_hash" value={params.token_hash} />
              <input type="hidden" name="type" value={params.type} />
              <input type="hidden" name="next" value={params.next === "/dashboard" ? "/dashboard" : "/reset-password"} />
              <button className="login-submit" type="submit">Confirmar e continuar <span aria-hidden="true">→</span></button>
            </form>
          </>
        ) : (
          <>
            <p className="muted">Este link está incompleto ou não é válido. Solicite um novo convite ou link de recuperação.</p>
            <a className="forgot-password" href="/login">Voltar para o login</a>
          </>
        )}
        <p className="login-security">Acesso protegido • Somente pessoas autorizadas</p>
      </div></section>
    </main>
  );
}
