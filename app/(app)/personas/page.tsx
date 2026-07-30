import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PersonasGruposPageContent } from "@/components/personas/personas-grupos-page-content";
import { getConexiones, getInvitacionesPendientes } from "@/lib/supabase/actions/conexiones";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { Persona } from "@/types/supabase";

export default async function PersonasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Conexiones/invitaciones son defensivas: si la migración 024 aún no corrió,
  // la página sigue funcionando (agenda de personas y grupos) sin conexiones.
  const conexionesSafe = getConexiones().catch(() => []);
  const invitacionesSafe = getInvitacionesPendientes().catch(() => ({
    recibidas: [],
    enviadas: [],
  }));

  const [{ data: personasRaw }, { data: gruposRaw }, conexiones, invitaciones] =
    await Promise.all([
      supabase.from("personas").select("*").eq("user_id", user.id).eq("archivado", false).order("nombre"),
      supabase
        .from("grupos")
        .select("*, grupo_miembros(persona_id, personas(*))")
        .eq("user_id", user.id)
        .eq("archivado", false)
        .order("nombre"),
      conexionesSafe,
      invitacionesSafe,
    ]);

  const grupos: GrupoConMiembros[] = (gruposRaw ?? []).map((g) => ({
    ...g,
    miembros: (g.grupo_miembros as { persona_id: string; personas: Persona | null }[])
      .map((m) => m.personas)
      .filter((p): p is Persona => p !== null),
  }));

  return (
    <PersonasGruposPageContent
      personas={personasRaw ?? []}
      grupos={grupos}
      conexiones={conexiones}
      invitacionesRecibidas={invitaciones.recibidas}
      invitacionesEnviadas={invitaciones.enviadas}
    />
  );
}
