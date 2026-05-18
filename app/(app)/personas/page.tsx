import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PersonasGruposPageContent } from "@/components/personas/personas-grupos-page-content";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { Persona } from "@/types/supabase";

export default async function PersonasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: personasRaw }, { data: gruposRaw }] = await Promise.all([
    supabase.from("personas").select("*").eq("user_id", user.id).eq("archivado", false).order("nombre"),
    supabase
      .from("grupos")
      .select("*, grupo_miembros(persona_id, personas(*))")
      .eq("user_id", user.id)
      .eq("archivado", false)
      .order("nombre"),
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
    />
  );
}
