"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface TarjetaData {
  nombre: string;
  tipo: "Crédito" | "Débito";
  banco_emisor?: string | null;
  ultimos_cuatro?: string | null;
  cierre_dia?: number | null;
  vencimiento_dia?: number | null;
  limite_ars?: number | null;
  limite_usd?: number | null;
  cuenta_pago_default?: string | null;
}

export async function createTarjeta(data: TarjetaData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("tarjetas").insert({
    user_id: user.id,
    nombre: data.nombre,
    tipo: data.tipo,
    banco_emisor: data.banco_emisor || null,
    ultimos_cuatro: data.ultimos_cuatro || null,
    cierre_dia: data.cierre_dia || null,
    vencimiento_dia: data.vencimiento_dia || null,
    limite_ars: data.limite_ars || null,
    limite_usd: data.limite_usd || null,
    cuenta_pago_default: data.cuenta_pago_default || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function updateTarjeta(id: string, data: TarjetaData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("tarjetas")
    .update({
      nombre: data.nombre,
      tipo: data.tipo,
      banco_emisor: data.banco_emisor || null,
      ultimos_cuatro: data.ultimos_cuatro || null,
      cierre_dia: data.cierre_dia || null,
      vencimiento_dia: data.vencimiento_dia || null,
      limite_ars: data.limite_ars || null,
      limite_usd: data.limite_usd || null,
      cuenta_pago_default: data.cuenta_pago_default || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}

export async function archiveTarjeta(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("tarjetas")
    .update({ archivada: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}
