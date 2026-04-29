import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AjustesClient } from "./_components/ajustes-client";

export default async function AjustesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: cuentas },
    { data: tarjetas },
    { data: categorias },
    { data: profesiones },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
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
      .eq("archivada", false)
      .order("created_at"),
    supabase
      .from("categorias")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivada", false)
      .order("orden"),
    supabase
      .from("profesiones_templates")
      .select("nombre, slug")
      .order("nombre"),
  ]);

  return (
    <AjustesClient
      profile={profile}
      cuentas={cuentas ?? []}
      tarjetas={tarjetas ?? []}
      categorias={categorias ?? []}
      profesiones={profesiones ?? []}
    />
  );
}
