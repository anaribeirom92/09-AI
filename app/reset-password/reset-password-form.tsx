"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (cancelled) return;
      setReady(Boolean(data.user) && !error);
      if (!data.user || error) {
        setFeedback("Este link não é válido ou expirou. Solicite um novo convite ou link de recuperação.");
      }
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    if (password.length < 10) {
      setFeedback("Use uma senha com pelo menos 10 caracteres.");
      return;
    }
    if (password !== confirm) {
      setFeedback("As senhas não coincidem.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setFeedback("Não foi possível salvar a senha. Solicite um novo link e tente novamente.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={submit}>
      {feedback && <div className="form-alert">{feedback}</div>}
      {!checking && ready && <>
        <label htmlFor="new-password">Nova senha</label>
        <input id="new-password" type="password" autoComplete="new-password" placeholder="Pelo menos 10 caracteres" value={password} onChange={event => setPassword(event.target.value)} required minLength={10} />
        <label htmlFor="confirm-password">Confirme a senha</label>
        <input id="confirm-password" type="password" autoComplete="new-password" placeholder="Digite novamente" value={confirm} onChange={event => setConfirm(event.target.value)} required minLength={10} />
        <button className="login-submit" type="submit" disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={18} /> : <>Salvar senha e entrar <ArrowRight size={17} /></>}
        </button>
      </>}
      {checking && <div className="form-alert">Validando seu acesso...</div>}
      {!checking && !ready && <a className="forgot-password" href="/login">Voltar para o login</a>}
    </form>
  );
}
