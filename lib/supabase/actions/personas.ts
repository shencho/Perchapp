"use server";

import { createClient } from "@/lib/supabase/server";
import type { Persona } from "@/types/supabase";

export async function getPersonas(): Promise<Persona[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("personas")
    .select("*")
    .eq("user_id", user.id)
    .eq("archivado", false)
    .order("nombre");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPersona(nombre: string, notas?: string | null): Promise<Persona> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("personas")
    .insert({ user_id: user.id, nombre: nombre.trim(), notas: notas ?? null })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Error al crear persona");
  return data;
}

export async function updatePersona(
  id: string,
  updates: { nombre?: string; notas?: string | null },
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("personas")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function deletePersona(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("personas")
    .update({ archivado: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
