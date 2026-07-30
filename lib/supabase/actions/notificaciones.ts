"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Notificacion } from "@/types/supabase";

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

/** Notificaciones del usuario, más nuevas primero. */
export async function getNotificaciones(limit = 30): Promise<Notificacion[]> {
  const { supabase, userId } = await getAuthed();
  const { data, error } = await supabase
    .from("notificaciones")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Cantidad de notificaciones no leídas (para el contador de la campana). */
export async function contarNoLeidas(): Promise<number> {
  const { supabase, userId } = await getAuthed();
  const { count, error } = await supabase
    .from("notificaciones")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("leida", false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function marcarNotificacionLeida(id: string): Promise<void> {
  const { supabase, userId } = await getAuthed();
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function marcarTodasLeidas(): Promise<void> {
  const { supabase, userId } = await getAuthed();
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("user_id", userId)
    .eq("leida", false);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
