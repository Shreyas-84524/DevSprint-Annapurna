import { NextResponse } from "next/server";
import { createClient as createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const role = requestUrl.searchParams.get("role");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const origin = requestUrl.origin;

  const targetLogin = role ? `/login/${role}` : "/login";

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}${targetLogin}?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/onboarding`);
    }

    return NextResponse.redirect(
      `${origin}${targetLogin}?error=${encodeURIComponent(error.message || "Failed to verify authentication code.")}`
    );
  }

  return NextResponse.redirect(`${origin}${targetLogin}`);
}
