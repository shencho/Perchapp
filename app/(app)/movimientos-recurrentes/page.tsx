import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MovimientosRecurrentesPageContent } from "@/components/movimientos-recurrentes/movimientos-recurrentes-page-content";
import { getPlantillas } from "@/lib/supabase/actions/plantillas";

export default async function MovimientosRecurrentesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: cuentas },
    { data: tarjetas },
    { data: categorias },
    plantillas,
  ] = await Promise.all([
    supabase.from("cuentas").select("*").eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase.from("tarjetas").select("*").eq("user_id", user.id).eq("archivada", false).order("created_at"),
    supabase.from("categorias").select("*").eq("user_id", user.id).eq("archivada", false).order("orden"),
    getPlantillas(),
  ]);

  return (
    <MovimientosRecurrentesPageContent
      plantillas={plantillas}
      cuentas={cuentas ?? []}
      tarjetas={tarjetas ?? []}
      categorias={categorias ?? []}
    />
  );
}
