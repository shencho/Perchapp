"use server";

import { createClient } from "@/lib/supabase/server";

export async function silenciarAlerta(input: {
  alerta_tipo: "plantilla_pendiente" | "plantilla_atrasada";
  alerta_referencia: string;
  silenciada_hasta: string; // YYYY-MM-DD
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("alertas_silenciadas")
    .upsert(
      {
        user_id:           user.id,
        alerta_tipo:       input.alerta_tipo,
        alerta_referencia: input.alerta_referencia,
        silenciada_hasta:  input.silenciada_hasta,
      },
      { onConflict: "user_id,alerta_referencia" },
    );

  if (error) throw new Error(error.message);
}

export async function getAlertasSilenciadasVigentes(): Promise<{ alerta_referencia: string }[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const hoy = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("alertas_silenciadas")
    .select("alerta_referencia")
    .eq("user_id", user.id)
    .gte("silenciada_hasta", hoy);

  if (error) throw new Error(error.message);
  return data ?? [];
}
