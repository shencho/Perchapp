import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AjustesClient } from "./_components/ajustes-client";
import { getPlantillas } from "@/lib/supabase/actions/plantillas";
import type { GrupoConMiembros } from "@/lib/supabase/actions/grupos-types";
import type { Persona } from "@/types/supabase";

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
    { data: personasRaw },
    { data: gruposRaw },
    plantillas,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("cuentas").select("*").eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase.from("tarjetas").select("*").eq("user_id", user.id).eq("archivada", false).order("created_at"),
    supabase.from("categorias").select("*").eq("user_id", user.id).eq("archivada", false).order("orden"),
    supabase.from("profesiones_templates").select("nombre, slug").order("nombre"),
    supabase.from("personas").select("*").eq("user_id", user.id).eq("archivado", false).order("nombre"),
    supabase
      .from("grupos")
      .select("*, grupo_miembros(persona_id, personas(*))")
      .eq("user_id", user.id)
      .eq("archivado", false)
      .order("nombre"),
    getPlantillas(),
  ]);

  const grupos: GrupoConMiembros[] = (gruposRaw ?? []).map((g) => ({
    ...g,
    miembros: (g.grupo_miembros as { persona_id: string; personas: Persona | null }[])
      .map((m) => m.personas)
      .filter((p): p is Persona => p !== null),
  }));

  return (
    <AjustesClient
      profile={profile}
      cuentas={cuentas ?? []}
      tarjetas={tarjetas ?? []}
      categorias={categorias ?? []}
      profesiones={profesiones ?? []}
      personas={personasRaw ?? []}
      grupos={grupos}
      plantillas={plantillas}
    />
  );
}
