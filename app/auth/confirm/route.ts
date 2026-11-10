import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes: EmailOtpType[] = ["invite", "recovery"];

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tokenHash = String(formData.get("token_hash") ?? "");
  const submittedType = String(formData.get("type") ?? "");
  const requestedNext = String(formData.get("next") ?? "/reset-password");
  const next = requestedNext === "/dashboard" ? "/dashboard" : "/reset-password";

  if (!tokenHash || !allowedTypes.includes(submittedType as EmailOtpType)) {
    return NextResponse.redirect(new URL("/login?error=callback", request.url), 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: submittedType as EmailOtpType,
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=callback", request.url), 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
