"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Categorías base para todos los usuarios
const CATEGORIAS_BASE = [
  { nombre: "Hogar",          tipo: "egreso"  as const },
  { nombre: "Alimentos",      tipo: "egreso"  as const },
  { nombre: "Transporte",     tipo: "egreso"  as const },
  { nombre: "Salud",          tipo: "egreso"  as const },
  { nombre: "Suscripciones",  tipo: "egreso"  as const },
  { nombre: "Otros gastos",   tipo: "egreso"  as const },
  { nombre: "Honorarios",     tipo: "ingreso" as const },
  { nombre: "Otros ingresos", tipo: "ingreso" as const },
];

// Categorías específicas por profesión (se agregan a las base)
const CATEGORIAS_POR_PROFESION: Record<string, { nombre: string; tipo: "ingreso" | "egreso" }[]> = {
  psicopedagogia: [
    { nombre: "Honorarios Psicopedagógicos", tipo: "ingreso" },
    { nombre: "Informes y Evaluaciones",     tipo: "ingreso" },
    { nombre: "Supervisión Profesional",     tipo: "egreso"  },
    { nombre: "Material Didáctico",          tipo: "egreso"  },
    { nombre: "Formación Continua",          tipo: "egreso"  },
  ],
  coaching: [
    { nombre: "Sesiones de Coaching", tipo: "ingreso" },
    { nombre: "Talleres y Workshops", tipo: "ingreso" },
    { nombre: "Certificaciones",      tipo: "egreso"  },
    { nombre: "Supervisión",          tipo: "egreso"  },
    { nombre: "Marketing Personal",   tipo: "egreso"  },
  ],
  consultoria: [
    { nombre: "Honorarios Consultoría",  tipo: "ingreso" },
    { nombre: "Proyectos",               tipo: "ingreso" },
    { nombre: "Viáticos",                tipo: "egreso"  },
    { nombre: "Software y Herramientas", tipo: "egreso"  },
    { nombre: "Capacitación",            tipo: "egreso"  },
  ],
  profesor: [
    { nombre: "Clases Particulares",    tipo: "ingreso" },
    { nombre: "Clases Grupales",        tipo: "ingreso" },
    { nombre: "Material Educativo",     tipo: "egreso"  },
    { nombre: "Plataformas Educativas", tipo: "egreso"  },
    { nombre: "Formación Docente",      tipo: "egreso"  },
  ],
};

export interface OnboardingData {
  nombre: string;
  profesion: string;
  modo: "personal" | "profesional" | "ambos";
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
      profesion: data.profesion,
      modo: data.modo,
      asistente_nombre: data.asistente_nombre || "Perchita",
      onboarding_completado: true,
    });

  if (profileError) throw new Error(profileError.message);

  // 2. Crear cuenta Efectivo
  const { error: cuentaError } = await supabase.from("cuentas").insert({
    user_id: userId,
    nombre: "Efectivo",
    tipo: "efectivo",
    saldo: 0,
    moneda: "ARS",
  });

  if (cuentaError) throw new Error(cuentaError.message);

  // 3. Crear categorías (base + específicas de la profesión)
  const categoriasEspecificas = CATEGORIAS_POR_PROFESION[data.profesion] ?? [];
  const todasLasCategorias = [...CATEGORIAS_BASE, ...categoriasEspecificas];

  const categoriasConUserId = todasLasCategorias.map((cat) => ({
    ...cat,
    user_id: userId,
  }));

  const { error: categoriasError } = await supabase
    .from("categorias")
    .insert(categoriasConUserId);

  if (categoriasError) throw new Error(categoriasError.message);

  // 4. Crear feature_flags vacío
  const { error: flagsError } = await supabase.from("feature_flags").upsert({
    user_id: userId,
    flags: {},
  });

  if (flagsError) throw new Error(flagsError.message);

  // 5. Redirigir al dashboard
  redirect("/dashboard");
}
