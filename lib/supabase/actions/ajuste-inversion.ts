"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function getOrCreateCategoria(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tipo: "ingreso" | "egreso"
): Promise<string> {
  const nombre = "Ajuste de inversión";

  const { data: existing } = await supabase
    .from("categorias")
    .select("id")
    .eq("user_id", userId)
    .eq("nombre", nombre)
    .eq("tipo", tipo)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("categorias")
    .insert({ user_id: userId, nombre, tipo })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Error al crear categoría");
  return created.id;
}

export async function ajustarValorInversion(input: {
  cuentaId: string;
  saldoActual: number;
  nuevoSaldo: number;
  fecha: string;
  notas?: string | null;
}) {
  const { cuentaId, saldoActual, nuevoSaldo, fecha, notas } = input;
  const diferencia = nuevoSaldo - saldoActual;
  if (diferencia === 0) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cuenta } = await supabase
    .from("cuentas")
    .select("nombre, moneda")
    .eq("id", cuentaId)
    .eq("user_id", user.id)
    .single();

  if (!cuenta) throw new Error("Cuenta no encontrada");

  const tipoMov = diferencia > 0 ? "Ingreso" : "Egreso";
  const tipoCat = diferencia > 0 ? "ingreso" : "egreso";
  const categoriaId = await getOrCreateCategoria(supabase, user.id, tipoCat);

  const { error } = await supabase.from("movimientos").insert({
    user_id: user.id,
    tipo: tipoMov,
    ambito: "Personal",
    monto: Math.abs(diferencia),
    moneda: cuenta.moneda,
    fecha,
    concepto: `Ajuste de valor: ${cuenta.nombre}`,
    categoria_id: categoriaId,
    cuenta_id: cuentaId,
    observaciones: notas ?? null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/cuentas/${cuentaId}`);
}
