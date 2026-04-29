"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface CuentaData {
  nombre: string;
  tipo: "Banco" | "Billetera virtual" | "Efectivo" | "Inversión";
  moneda: string;
  saldo: number;
}

export async function createCuenta(data: CuentaData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("cuentas").insert({
    user_id: user.id,
    nombre: data.nombre,
    tipo: data.tipo,
    moneda: data.moneda,
    saldo: data.saldo,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function updateCuenta(
  id: string,
  data: Omit<CuentaData, "saldo">
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("cuentas")
    .update({ nombre: data.nombre, tipo: data.tipo, moneda: data.moneda })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function archiveCuenta(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("cuentas")
    .update({ archivada: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}
