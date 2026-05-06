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

export async function aplicarTemplate(input: {
  items: Array<{
    categoria_nombre: string;
    tipo: "Egreso" | "Ingreso";
    subcategoria_nombre?: string;
    nombre_personalizado?: string;
    estrategia_conflicto: "saltar" | "reemplazar" | "crear_duplicado";
  }>;
}): Promise<{ creadas: number; saltadas: number; reemplazadas: number; errores: string[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const userId = user.id;
  let creadas = 0, saltadas = 0, reemplazadas = 0;
  const errores: string[] = [];
  const parentCache = new Map<string, string>(); // nombre_lower → padre_id

  async function resolveParent(nombre: string, tipo: "Egreso" | "Ingreso"): Promise<string | null> {
    const cacheKey = nombre.toLowerCase();
    if (parentCache.has(cacheKey)) return parentCache.get(cacheKey)!;

    const { data: existing } = await supabase
      .from("categorias")
      .select("id")
      .eq("user_id", userId)
      .ilike("nombre", nombre)
      .is("parent_id", null)
      .eq("archivada", false)
      .maybeSingle();

    if (existing) {
      parentCache.set(cacheKey, existing.id);
      return existing.id;
    }

    const { data: nuevo, error } = await supabase
      .from("categorias")
      .insert({ user_id: userId, nombre, tipo })
      .select("id")
      .single();

    if (error || !nuevo) return null;
    parentCache.set(cacheKey, nuevo.id);
    return nuevo.id;
  }

  // Paso 1: items de categoría padre (sin subcategoria_nombre)
  for (const item of input.items.filter(i => !i.subcategoria_nombre)) {
    const cacheKey = item.categoria_nombre.toLowerCase();
    try {
      const { data: existing } = await supabase
        .from("categorias")
        .select("id")
        .eq("user_id", userId)
        .ilike("nombre", item.categoria_nombre)
        .is("parent_id", null)
        .eq("archivada", false)
        .maybeSingle();

      if (existing) {
        if (item.estrategia_conflicto === "crear_duplicado") {
          const dupNombre = `${item.categoria_nombre} (2)`;
          const { data: dup, error } = await supabase
            .from("categorias")
            .insert({ user_id: userId, nombre: dupNombre, tipo: item.tipo })
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          parentCache.set(cacheKey, dup!.id);
          creadas++;
        } else {
          // saltar (reemplazar no aplica a padres)
          parentCache.set(cacheKey, existing.id);
          saltadas++;
        }
      } else {
        const { data: nuevo, error } = await supabase
          .from("categorias")
          .insert({ user_id: userId, nombre: item.categoria_nombre, tipo: item.tipo })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        parentCache.set(cacheKey, nuevo!.id);
        creadas++;
      }
    } catch (e) {
      errores.push(`${item.categoria_nombre}: ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  // Paso 2: items de subcategoría
  for (const item of input.items.filter(i => !!i.subcategoria_nombre)) {
    try {
      const padreId = await resolveParent(item.categoria_nombre, item.tipo);
      if (!padreId) {
        errores.push(`No se pudo crear la categoría padre "${item.categoria_nombre}"`);
        continue;
      }

      const nombreFinal = item.nombre_personalizado?.trim() || item.subcategoria_nombre!;

      const { data: existingSub } = await supabase
        .from("categorias")
        .select("id")
        .eq("user_id", userId)
        .ilike("nombre", nombreFinal)
        .eq("parent_id", padreId)
        .eq("archivada", false)
        .maybeSingle();

      if (existingSub) {
        if (item.estrategia_conflicto === "saltar") {
          saltadas++;
        } else if (item.estrategia_conflicto === "reemplazar") {
          const { error } = await supabase
            .from("categorias")
            .update({ nombre: nombreFinal })
            .eq("id", existingSub.id)
            .eq("user_id", userId);
          if (error) throw new Error(error.message);
          reemplazadas++;
        } else {
          const { error } = await supabase
            .from("categorias")
            .insert({ user_id: userId, nombre: `${nombreFinal} (2)`, tipo: item.tipo, parent_id: padreId });
          if (error) throw new Error(error.message);
          creadas++;
        }
      } else {
        const { error } = await supabase
          .from("categorias")
          .insert({ user_id: userId, nombre: nombreFinal, tipo: item.tipo, parent_id: padreId });
        if (error) throw new Error(error.message);
        creadas++;
      }
    } catch (e) {
      errores.push(`${item.categoria_nombre} > ${item.subcategoria_nombre}: ${e instanceof Error ? e.message : "Error"}`);
    }
  }

  revalidatePath("/ajustes");
  return { creadas, saltadas, reemplazadas, errores };
}
