import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CapturaClient } from "./_components/captura-client";

export default async function CapturaPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, cuentasRes, tarjetasRes, categoriasRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("asistente_nombre")
      .eq("id", user.id)
      .single(),
    supabase
      .from("cuentas")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivada", false)
      .order("orden"),
    supabase
      .from("tarjetas")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivada", false),
    supabase
      .from("categorias")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivada", false)
      .order("nombre"),
  ]);

  return (
    <CapturaClient
      asistente_nombre={profileRes.data?.asistente_nombre ?? "Perchita"}
      cuentas={cuentasRes.data ?? []}
      tarjetas={tarjetasRes.data ?? []}
      categorias={categoriasRes.data ?? []}
    />
  );
}
