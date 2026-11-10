import { createClient } from "@/lib/supabase/server";
export const ORGANIZATION_ID = "b980beb2-ded8-46aa-beb4-ebde0bfb79c2";
export async function getAgencyContext() {
  const supabase = await createClient();
  const { data: { claims }, error } = await supabase.auth.getClaims();
  if (error || !claims?.sub) return { supabase, userId: null, membership: null, organization: null };
  const userId = String(claims.sub);
  const { data: membership } = await supabase.from("organization_members")
    .select("id,organization_id,role,status").eq("organization_id", ORGANIZATION_ID)
    .eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!membership) return { supabase, userId, membership: null, organization: null };
  const { data: organization } = await supabase.from("organizations")
    .select("id,name,slug").eq("id", membership.organization_id).maybeSingle();
  return { supabase, userId, membership, organization };
}
export function formatDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value)) : "Sem prazo";
}
export function statusLabel(status?: string | null) {
  const labels: Record<string,string> = {
    draft:"Rascunho",active:"Ativo",paused:"Pausado",archived:"Arquivado",
    queued:"Na fila",running:"Em execução",succeeded:"Concluído",failed:"Falhou",
    needs_approval:"Aguardando aprovação",pending:"Pendente",approved:"Aprovado",
    rejected:"Rejeitado",cancelled:"Cancelado",completed:"Concluído",
    in_progress:"Em andamento",todo:"A fazer",blocked:"Bloqueado",
  };
  return status ? labels[status] ?? status.replaceAll("_"," ") : "—";
}
