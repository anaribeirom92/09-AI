import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function HomePage() {
  const supabase = await createClient();
  const { data: authClaims } = await supabase.auth.getClaims();
  redirect(authClaims?.claims?.sub ? "/dashboard" : "/login");
}
