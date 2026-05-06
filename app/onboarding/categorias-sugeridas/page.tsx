import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CategoriasSuperidasClient } from "./client";

export default async function CategoriasSuperidasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, nombre, tipo, parent_id, archivada, created_at, color, icono, orden, user_id")
    .eq("user_id", user.id)
    .eq("archivada", false);

  return <CategoriasSuperidasClient categorias={categorias ?? []} />;
}
