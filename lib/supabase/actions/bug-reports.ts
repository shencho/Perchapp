"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BugReport } from "@/types/supabase";

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

export async function getBugReports(): Promise<BugReport[]> {
  const { supabase } = await getAuthed();
  const { data, error } = await supabase
    .from("bug_reports")
    .select("*")
    .order("estado", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createBugReport(input: {
  sector: string;
  titulo: string;
  descripcion?: string | null;
}): Promise<void> {
  const { supabase, userId } = await getAuthed();
  const { data: perfil } = await supabase.from("profiles").select("nombre").eq("id", userId).single();
  const { error } = await supabase.from("bug_reports").insert({
    sector: input.sector,
    titulo: input.titulo.trim(),
    descripcion: input.descripcion?.trim() || null,
    estado: "nuevo",
    autor_id: userId,
    autor_nombre: perfil?.nombre?.split(" ")[0] ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/control");
}

export async function updateBugReport(
  id: string,
  updates: Partial<{
    sector: string;
    titulo: string;
    descripcion: string | null;
    diagnostico: string | null;
    fix_descripcion: string | null;
    estado: string;
    fecha_resolucion: string | null;
  }>,
): Promise<void> {
  const { supabase } = await getAuthed();
  // Al pasar a resuelto, sellar la fecha si no viene explícita.
  const payload: Record<string, unknown> = { ...updates };
  if (updates.estado === "resuelto" && updates.fecha_resolucion === undefined) {
    payload.fecha_resolucion = new Date().toISOString().slice(0, 10);
  }
  const { error } = await supabase.from("bug_reports").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/control");
}

export async function deleteBugReport(id: string): Promise<void> {
  const { supabase } = await getAuthed();
  const { error } = await supabase.from("bug_reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/control");
}
