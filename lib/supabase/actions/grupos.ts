"use server";

import { createClient } from "@/lib/supabase/server";
import type { Grupo, Persona } from "@/types/supabase";

export type GrupoConMiembros = Grupo & { miembros: Persona[] };

export async function getGrupos(): Promise<GrupoConMiembros[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("grupos")
    .select("*, grupo_miembros(persona_id, personas(*))")
    .eq("user_id", user.id)
    .eq("archivado", false)
    .order("nombre");

  if (error) throw new Error(error.message);

  return (data ?? []).map((g) => ({
    ...g,
    miembros: (g.grupo_miembros as { persona_id: string; personas: Persona | null }[])
      .map((m) => m.personas)
      .filter((p): p is Persona => p !== null),
  }));
}

export async function createGrupo(nombre: string, miembro_ids: string[]): Promise<Grupo> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: grupo, error: grupoErr } = await supabase
    .from("grupos")
    .insert({ user_id: user.id, nombre: nombre.trim() })
    .select()
    .single();

  if (grupoErr || !grupo) throw new Error(grupoErr?.message ?? "Error al crear grupo");

  if (miembro_ids.length > 0) {
    const { error: pivotErr } = await supabase
      .from("grupo_miembros")
      .insert(miembro_ids.map((persona_id) => ({ grupo_id: grupo.id, persona_id })));
    if (pivotErr) throw new Error(pivotErr.message);
  }

  return grupo;
}

export async function updateGrupo(
  id: string,
  nombre: string,
  miembro_ids: string[],
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error: nameErr } = await supabase
    .from("grupos")
    .update({ nombre: nombre.trim() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (nameErr) throw new Error(nameErr.message);

  // Replace pivot: delete all + re-insert
  await supabase.from("grupo_miembros").delete().eq("grupo_id", id);

  if (miembro_ids.length > 0) {
    const { error: pivotErr } = await supabase
      .from("grupo_miembros")
      .insert(miembro_ids.map((persona_id) => ({ grupo_id: id, persona_id })));
    if (pivotErr) throw new Error(pivotErr.message);
  }
}

export async function deleteGrupo(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("grupos")
    .update({ archivado: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
