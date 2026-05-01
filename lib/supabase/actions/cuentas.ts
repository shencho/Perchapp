"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type InvSubtipo = "plazo_fijo" | "cripto" | "fci" | "acciones" | "usd_fisico" | "balanz" | "otros";

export interface CuentaData {
  nombre: string;
  tipo: "Banco" | "Billetera virtual" | "Efectivo" | "Inversión";
  moneda: string;
  saldo: number;
  // Solo cuando tipo === 'Inversión'
  inv_subtipo?: InvSubtipo | null;
  inv_fecha_vencimiento?: string | null;
  inv_notas?: string | null;
  inv_tasa_anual?: number | null;
}

function invFields(data: CuentaData) {
  if (data.tipo !== "Inversión") {
    return { inv_subtipo: null, inv_fecha_vencimiento: null, inv_notas: null, inv_tasa_anual: null };
  }
  return {
    inv_subtipo: data.inv_subtipo ?? null,
    inv_fecha_vencimiento: data.inv_fecha_vencimiento ?? null,
    inv_notas: data.inv_notas ?? null,
    inv_tasa_anual: data.inv_tasa_anual ?? null,
  };
}

export async function createCuenta(data: CuentaData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("cuentas").insert({
    user_id: user.id,
    nombre: data.nombre,
    tipo: data.tipo,
    moneda: data.moneda,
    saldo: data.saldo,
    ...invFields(data),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function updateCuenta(id: string, data: Omit<CuentaData, "saldo">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("cuentas")
    .update({
      nombre: data.nombre,
      tipo: data.tipo,
      moneda: data.moneda,
      ...invFields({ ...data, saldo: 0 }),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function archiveCuenta(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("cuentas")
    .update({ archivada: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}
