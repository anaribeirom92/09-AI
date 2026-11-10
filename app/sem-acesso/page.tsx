import Link from "next/link";
import { ShieldX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
export default async function NoAccessPage() {
 const supabase=await createClient(); const {data:{claims}}=await supabase.auth.getClaims();
 return <main className="access-denied"><div className="access-card"><span className="access-icon"><ShieldX size={26}/></span><span className="eyebrow">ACESSO RESTRITO</span><h1>Este espaço é reservado.</h1><p>{claims?.sub?"Seu usuário ainda não tem vínculo ativo com a 09 AI Agency ou não possui perfil de liderança.":"Entre com uma conta autorizada para continuar."}</p><Link className="login-submit access-link" href="/login">Voltar ao acesso</Link></div></main>;
}
