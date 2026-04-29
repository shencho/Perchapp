"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Categorías base para todos los usuarios (tipos capitalizados según migration 006)
const CATEGORIAS_BASE = [
  { nombre: "Hogar",          tipo: "Egreso"  as const },
  { nombre: "Alimentos",      tipo: "Egreso"  as const },
  { nombre: "Transporte",     tipo: "Egreso"  as const },
  { nombre: "Salud",          tipo: "Egreso"  as const },
  { nombre: "Suscripciones",  tipo: "Egreso"  as const },
  { nombre: "Otros gastos",   tipo: "Egreso"  as const },
  { nombre: "Honorarios",     tipo: "Ingreso" as const },
  { nombre: "Otros ingresos", tipo: "Ingreso" as const },
];

// Categorías específicas por área (6 áreas genéricas de migration 005)
const CATEGORIAS_POR_AREA: Record<string, { nombre: string; tipo: "Ingreso" | "Egreso" }[]> = {
  "salud-bienestar": [
    { nombre: "Sesión individual",       tipo: "Ingreso" },
    { nombre: "Sesión pareja/familia",   tipo: "Ingreso" },
    { nombre: "Evaluación",              tipo: "Ingreso" },
    { nombre: "Plan mensual",            tipo: "Ingreso" },
    { nombre: "Material profesional",    tipo: "Egreso"  },
    { nombre: "Capacitaciones",          tipo: "Egreso"  },
    { nombre: "Supervisiones",           tipo: "Egreso"  },
    { nombre: "Alquiler de consultorio", tipo: "Egreso"  },
  ],
  "educacion": [
    { nombre: "Clase individual",          tipo: "Ingreso" },
    { nombre: "Clase grupal",              tipo: "Ingreso" },
    { nombre: "Curso completo",            tipo: "Ingreso" },
    { nombre: "Material didáctico",        tipo: "Egreso"  },
    { nombre: "Plataformas (Zoom, Teams)", tipo: "Egreso"  },
    { nombre: "Certificaciones",           tipo: "Egreso"  },
  ],
  "servicios-profesionales": [
    { nombre: "Honorarios profesionales", tipo: "Ingreso" },
    { nombre: "Asesoría puntual",         tipo: "Ingreso" },
    { nombre: "Proyecto",                 tipo: "Ingreso" },
    { nombre: "Retainer mensual",         tipo: "Ingreso" },
    { nombre: "Software profesional",     tipo: "Egreso"  },
    { nombre: "Capacitaciones",           tipo: "Egreso"  },
    { nombre: "Almuerzos comerciales",    tipo: "Egreso"  },
  ],
  "creatividad-digital": [
    { nombre: "Proyecto",                   tipo: "Ingreso" },
    { nombre: "Iguala mensual",             tipo: "Ingreso" },
    { nombre: "Licencias / Royalties",      tipo: "Ingreso" },
    { nombre: "Software (Adobe, Figma...)", tipo: "Egreso"  },
    { nombre: "Hardware",                   tipo: "Egreso"  },
    { nombre: "Cursos",                     tipo: "Egreso"  },
    { nombre: "Stock fotográfico",          tipo: "Egreso"  },
  ],
  "belleza-cuidado": [
    { nombre: "Servicio individual", tipo: "Ingreso" },
    { nombre: "Paquete",             tipo: "Ingreso" },
    { nombre: "Membresía",           tipo: "Ingreso" },
    { nombre: "Insumos",             tipo: "Egreso"  },
    { nombre: "Equipamiento",        tipo: "Egreso"  },
    { nombre: "Alquiler de espacio", tipo: "Egreso"  },
  ],
  "generico": [],
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

  // 2. Crear cuenta Efectivo (tipo capitalizado según migration 006)
  const { error: cuentaError } = await supabase.from("cuentas").insert({
    user_id: userId,
    nombre: "Efectivo",
    tipo: "Efectivo",
    saldo: 0,
    moneda: "ARS",
  });

  if (cuentaError) throw new Error(cuentaError.message);

  // 3. Crear categorías (base + específicas del área)
  const categoriasEspecificas = CATEGORIAS_POR_AREA[data.profesion] ?? [];
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
