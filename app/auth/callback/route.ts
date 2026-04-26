import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Este endpoint recibe al usuario cuando hace click en el link de confirmación
// que Supabase manda por email al registrarse.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si algo falla, mandamos al login
  return NextResponse.redirect(`${origin}/login`);
}
