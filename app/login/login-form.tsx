"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export function LoginForm({ error, message }: { error?: string; message?: string }) {
  const [email,setEmail] = useState(""); const [password,setPassword] = useState("");
  const [show,setShow] = useState(false); const [busy,setBusy] = useState(false);
  const [feedback,setFeedback] = useState(message ?? ""); const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setFeedback("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setFeedback("Não foi possível entrar. Confira seu e-mail e senha."); return; }
    router.replace("/dashboard"); router.refresh();
  }
  async function recover() {
    if (!email.trim()) { setFeedback("Digite seu e-mail para receber o link de recuperação."); return; }
    setBusy(true); const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/auth/callback?next=/login",
    });
    setBusy(false);
    setFeedback(error ? "Não foi possível enviar o link agora." : "Se o e-mail estiver cadastrado, você receberá um link de recuperação.");
  }
  return <form className="login-form" onSubmit={submit}>
    {error === "callback" && <div className="form-alert">O link expirou ou não pôde ser validado. Entre novamente.</div>}
    {feedback && <div className="form-alert">{feedback}</div>}
    <label htmlFor="email">E-mail</label>
    <input id="email" type="email" autoComplete="email" placeholder="voce@09comunicacao.com.br" value={email} onChange={e=>setEmail(e.target.value)} required/>
    <label htmlFor="password">Senha</label>
    <div className="password-field">
      <input id="password" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} required/>
      <button type="button" className="password-toggle" aria-label={show ? "Ocultar senha" : "Mostrar senha"} onClick={()=>setShow(v=>!v)}>{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button>
    </div>
    <button className="login-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : <>Entrar na operação <ArrowRight size={17}/></>}</button>
    <button className="forgot-password" type="button" onClick={recover} disabled={busy}>Esqueci minha senha</button>
  </form>;
}
