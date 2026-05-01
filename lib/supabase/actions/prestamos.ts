"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prestamoSchema, type PrestamoInput } from "./prestamos-types";
import type { Prestamo, PrestamoPago } from "@/types/supabase";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

// ── Tipos extendidos ──────────────────────────────────────────────────────────

export type PrestamoConPagos = Prestamo & {
  personas?: { id: string; nombre: string } | null;
  prestamos_pagos?: Pick<PrestamoPago, "id" | "fecha" | "monto" | "cuota_numero" | "movimiento_id" | "notas">[];
};

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPrestamos(): Promise<PrestamoConPagos[]> {
  const { supabase, userId } = await getAuthedUser();
  const { data, error } = await supabase
    .from("prestamos")
    .select("*, personas(id, nombre), prestamos_pagos(id, fecha, monto, cuota_numero, movimiento_id, notas)")
    .eq("user_id", userId)
    .eq("archivado", false)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PrestamoConPagos[];
}

export async function getPrestamo(id: string): Promise<PrestamoConPagos> {
  const { supabase, userId } = await getAuthedUser();
  const { data, error } = await supabase
    .from("prestamos")
    .select("*, personas(id, nombre), prestamos_pagos(id, fecha, monto, cuota_numero, movimiento_id, notas, created_at)")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data as PrestamoConPagos;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createPrestamo(input: PrestamoInput): Promise<Prestamo> {
  const { supabase, userId } = await getAuthedUser();
  const parsed = prestamoSchema.parse(input);
  const { data, error } = await supabase
    .from("prestamos")
    .insert({ ...parsed, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Prestamo;
}

export async function updatePrestamo(id: string, input: Partial<PrestamoInput>): Promise<Prestamo> {
  const { supabase, userId } = await getAuthedUser();
  const parsed = prestamoSchema.partial().parse(input);
  const { data, error } = await supabase
    .from("prestamos")
    .update(parsed)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Prestamo;
}

export async function archivarPrestamo(id: string): Promise<void> {
  const { supabase, userId } = await getAuthedUser();
  const { error } = await supabase
    .from("prestamos")
    .update({ archivado: true })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function cancelarPrestamo(id: string): Promise<void> {
  const { supabase, userId } = await getAuthedUser();
  const { error } = await supabase
    .from("prestamos")
    .update({ estado: "cancelado" })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
