"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Validando seu convite...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function accept() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const errorCode = hash.get("error_code") ?? query.get("error_code");
      const errorDescription = hash.get("error_description") ?? query.get("error_description");

      if (errorCode || errorDescription) {
        if (!cancelled) {
          setFailed(true);
          setMessage("Este convite expirou ou já foi utilizado. Solicite o reenvio do convite.");
        }
        return;
      }

      const supabase = createClient();
      let authError: Error | null = null;

      // Supabase's default invitation email uses the hosted verification link.
      // That flow can return the session tokens in the URL fragment.
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        authError = error;
      } else {
        // Also support PKCE links and token-hash links in case the email flow
        // is changed later, without requiring a custom SMTP template today.
        const code = query.get("code");
        const tokenHash = query.get("token_hash");
        const type = query.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          authError = error;
        } else if (tokenHash && (type === "invite" || type === "recovery")) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          authError = error;
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data.session) {
            authError = null;
          } else {
            authError = error ?? new Error("No valid invitation session was found.");
          }
        }
      }

      if (cancelled) return;

      if (authError) {
        setFailed(true);
        setMessage("Não foi possível validar este convite. Solicite o reenvio e abra o novo link.");
        return;
      }

      // Remove authentication material from the address bar before navigating.
      window.history.replaceState({}, document.title, window.location.pathname);
      setMessage("Convite confirmado. Vamos configurar sua senha...");
      router.replace("/reset-password");
      router.refresh();
    }

    void accept();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="login-shell">
      <section className="login-brand-panel">
        <div className="brand-lockup"><span className="brand-mark">09</span><span>COMUNICAÇÃO<br />INTEGRADA</span></div>
        <div className="login-manifesto">
          <span className="eyebrow">AGENCY OPERATING SYSTEM</span>
          <h1>Seu acesso.<br /><em>Seu centro de comando.</em></h1>
          <p>Estamos validando seu convite para a operação da 09 Comunicação Integrada.</p>
        </div>
        <div className="login-footer">09 AI AGENCY <span>•</span> GOIÂNIA, BRASIL</div>
      </section>
      <section className="login-form-panel">
        <div className="login-card">
          <div className="mobile-brand"><span className="brand-mark">09</span><b>09 AI AGENCY</b></div>
          <span className="eyebrow">PRIMEIRO ACESSO</span>
          <h2>{failed ? "Convite não validado." : "Só um instante."}</h2>
          <p className="muted">{message}</p>
          {failed ? (
            <a className="login-submit" href="/login">Voltar para o login</a>
          ) : (
            <div className="login-security"><LoaderCircle className="spin" size={18} /> Validando acesso seguro</div>
          )}
          <p className="login-security"><ShieldCheck size={14} /> Acesso protegido • Somente pessoas autorizadas</p>
        </div>
      </section>
    </main>
  );
}
