"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface UpdateAjustesData {
  nombre: string;
  asistente_nombre: string;
}

export async function updateAjustes(data: UpdateAjustesData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      nombre: data.nombre,
      asistente_nombre: data.asistente_nombre,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/ajustes");
}
