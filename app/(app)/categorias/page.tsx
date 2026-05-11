import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CategoriasPageContent } from "@/components/categorias/categorias-page-content";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .eq("user_id", user.id)
    .eq("archivada", false)
    .order("orden");

  return <CategoriasPageContent categorias={categorias ?? []} />;
}
