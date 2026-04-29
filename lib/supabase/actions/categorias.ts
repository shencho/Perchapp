"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CategoriaData {
  nombre: string;
  tipo: "Ingreso" | "Egreso" | "Ambos";
  parent_id?: string | null;
}

export async function createCategoria(data: CategoriaData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("categorias").insert({
    user_id: user.id,
    nombre: data.nombre,
    tipo: data.tipo,
    parent_id: data.parent_id || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function updateCategoria(id: string, data: CategoriaData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("categorias")
    .update({
      nombre: data.nombre,
      tipo: data.tipo,
      parent_id: data.parent_id || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function createCategoriaInline(data: {
  nombre: string;
  tipo: "Ingreso" | "Egreso";
  parent_id?: string | null;
}): Promise<{ id: string; alreadyExisted: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nombre = data.nombre.trim();

  let dupeQuery = supabase
    .from("categorias")
    .select("id")
    .eq("user_id", user.id)
    .ilike("nombre", nombre)
    .eq("tipo", data.tipo);

  if (data.parent_id) {
    dupeQuery = dupeQuery.eq("parent_id", data.parent_id);
  } else {
    dupeQuery = dupeQuery.is("parent_id", null);
  }

  const { data: existing } = await dupeQuery.maybeSingle();
  if (existing) return { id: existing.id, alreadyExisted: true };

  const { data: created, error } = await supabase
    .from("categorias")
    .insert({ user_id: user.id, nombre, tipo: data.tipo, parent_id: data.parent_id ?? null })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return { id: created.id, alreadyExisted: false };
}

export async function archiveCategoria(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // No archivar si tiene subcategorías activas
  const { data: hijos } = await supabase
    .from("categorias")
    .select("id")
    .eq("parent_id", id)
    .eq("archivada", false)
    .eq("user_id", user.id)
    .limit(1);

  if (hijos && hijos.length > 0) {
    throw new Error(
      "No podés archivar una categoría que tiene subcategorías activas. Archivá las subcategorías primero."
    );
  }

  const { error } = await supabase
    .from("categorias")
    .update({ archivada: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}
