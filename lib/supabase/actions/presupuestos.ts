"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Presupuesto } from "@/types/supabase";

async function getAuthed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, userId: user.id };
}

function mesAnterior(anioMes: string): string {
  const [y, m] = anioMes.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m es 1-based; -2 = mes anterior
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getPresupuestos(anioMes: string): Promise<Presupuesto[]> {
  const { supabase, userId } = await getAuthed();
  const { data, error } = await supabase
    .from("presupuestos")
    .select("*")
    .eq("user_id", userId)
    .eq("anio_mes", anioMes);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Setea el presupuesto de una categoría/mes (monto 0 = borra). */
export async function setPresupuesto(input: {
  categoriaId: string;
  anioMes: string;
  monto: number;
  moneda?: string;
}): Promise<void> {
  const { supabase, userId } = await getAuthed();
  const moneda = input.moneda ?? "ARS";

  if (!input.monto || input.monto <= 0) {
    const { error } = await supabase
      .from("presupuestos")
      .delete()
      .eq("user_id", userId)
      .eq("categoria_id", input.categoriaId)
      .eq("anio_mes", input.anioMes)
      .eq("moneda", moneda);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("presupuestos")
      .upsert(
        { user_id: userId, categoria_id: input.categoriaId, anio_mes: input.anioMes, moneda, monto: input.monto },
        { onConflict: "user_id,categoria_id,anio_mes,moneda" },
      );
    if (error) throw new Error(error.message);
  }
  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
}

/** Copia los presupuestos del mes anterior al mes indicado (no pisa los ya cargados). */
export async function copiarDelMesAnterior(anioMes: string): Promise<{ copiados: number }> {
  const { supabase, userId } = await getAuthed();
  const prev = mesAnterior(anioMes);

  const [{ data: previos }, { data: actuales }] = await Promise.all([
    supabase.from("presupuestos").select("categoria_id, moneda, monto").eq("user_id", userId).eq("anio_mes", prev),
    supabase.from("presupuestos").select("categoria_id, moneda").eq("user_id", userId).eq("anio_mes", anioMes),
  ]);

  const yaHay = new Set((actuales ?? []).map((p) => `${p.categoria_id}|${p.moneda}`));
  const aInsertar = (previos ?? [])
    .filter((p) => !yaHay.has(`${p.categoria_id}|${p.moneda}`))
    .map((p) => ({ user_id: userId, categoria_id: p.categoria_id, anio_mes: anioMes, moneda: p.moneda, monto: p.monto }));

  if (aInsertar.length > 0) {
    const { error } = await supabase.from("presupuestos").insert(aInsertar);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/presupuestos");
  revalidatePath("/dashboard");
  return { copiados: aInsertar.length };
}
