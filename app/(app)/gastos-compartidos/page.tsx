import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProyectos } from "@/lib/supabase/actions/proyectos";
import { getDeudasComoDeudor, getDeudasComoAcreedor } from "@/lib/supabase/actions/deudas";
import { HubClient } from "./_components/hub-client";
import type { Persona } from "@/types/supabase";

export default async function GastosCompartidosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const proyectos = await getProyectos().catch(() => []);
  const debo = await getDeudasComoDeudor().catch(() => []);
  const meDeben = await getDeudasComoAcreedor().catch(() => []);

  const [{ data: cuentasRaw }, { data: personasRaw }] = await Promise.all([
    supabase.from("cuentas").select("id, nombre").eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase
      .from("personas")
      .select("*")
      .eq("user_id", user.id)
      .eq("archivado", false)
      .not("usuario_vinculado_id", "is", null)
      .order("nombre"),
  ]);

  return (
    <HubClient
      proyectos={proyectos}
      debo={debo}
      meDeben={meDeben}
      cuentas={(cuentasRaw ?? []) as { id: string; nombre: string }[]}
      personasConectadas={(personasRaw ?? []) as Persona[]}
    />
  );
}
