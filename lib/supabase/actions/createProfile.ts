"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Categorías base con subcategorías para todos los usuarios
const CATEGORIAS_BASE: {
  nombre: string;
  tipo: "Ingreso" | "Egreso";
  subs: string[];
}[] = [
  { nombre: "Servicios del hogar", tipo: "Egreso",  subs: ["Internet", "Luz", "Gas", "Agua", "Expensas"] },
  { nombre: "Suscripciones",       tipo: "Egreso",  subs: ["Streaming", "Software", "Apps"] },
  { nombre: "Alimentos",           tipo: "Egreso",  subs: ["Supermercado", "Carnicería", "Verdulería", "Delivery"] },
  { nombre: "Transporte",          tipo: "Egreso",  subs: ["Combustible", "Peajes", "Uber", "Estacionamiento"] },
  { nombre: "Salud",               tipo: "Egreso",  subs: ["Prepaga", "Medicina", "Farmacia", "Consultas"] },
  { nombre: "Esparcimiento",       tipo: "Egreso",  subs: ["Salidas", "Cine", "Viajes", "Hobbies"] },
  { nombre: "Hogar",               tipo: "Egreso",  subs: ["Alquiler", "Mantenimiento"] },
  { nombre: "Trabajo",             tipo: "Ingreso", subs: ["Honorarios", "Comisiones", "Sueldo"] },
  { nombre: "Otros ingresos",      tipo: "Ingreso", subs: ["Reintegros", "Regalos"] },
];

export interface OnboardingData {
  nombre: string;
  asistente_nombre: string;
}

export async function createProfile(data: OnboardingData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userId = user.id;

  // 1. Crear / actualizar perfil
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      nombre: data.nombre,
      modo: "personal",
      asistente_nombre: data.asistente_nombre || "MANGO AI",
      onboarding_completado: true,
    });

  if (profileError) throw new Error(profileError.message);

  // 2. Crear cuenta Efectivo
  const { error: cuentaError } = await supabase.from("cuentas").insert({
    user_id: userId,
    nombre: "Efectivo",
    tipo: "Efectivo",
    saldo: 0,
    moneda: "ARS",
  });

  if (cuentaError) throw new Error(cuentaError.message);

  // 3. Crear categorías base (jerárquicas: padres + subcategorías)
  for (const cat of CATEGORIAS_BASE) {
    // Insertar categoría padre
    const { data: insertedParent, error: parentError } = await supabase
      .from("categorias")
      .insert({ user_id: userId, nombre: cat.nombre, tipo: cat.tipo })
      .select("id")
      .single();

    if (parentError) throw new Error(parentError.message);

    // Insertar subcategorías
    if (cat.subs.length > 0) {
      const subcats = cat.subs.map((s) => ({
        user_id: userId,
        nombre: s,
        tipo: cat.tipo,
        parent_id: insertedParent.id,
      }));
      const { error: subsError } = await supabase.from("categorias").insert(subcats);
      if (subsError) throw new Error(subsError.message);
    }
  }

  // 4. Crear feature_flags vacío
  const { error: flagsError } = await supabase.from("feature_flags").upsert({
    user_id: userId,
    flags: {},
  });

  if (flagsError) throw new Error(flagsError.message);

  // 5. Redirigir a categorías sugeridas
  redirect("/onboarding/categorias-sugeridas");
}
