import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TarjetasPageContent } from "@/components/tarjetas/tarjetas-page-content";

export default async function TarjetasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tarjetas }, { data: cuentas }] = await Promise.all([
    supabase.from("tarjetas").select("*").eq("user_id", user.id).eq("archivada", false).order("created_at"),
    supabase.from("cuentas").select("*").eq("user_id", user.id).eq("archivada", false).order("orden"),
  ]);

  return (
    <TarjetasPageContent
      tarjetas={tarjetas ?? []}
      cuentas={cuentas ?? []}
    />
  );
}
