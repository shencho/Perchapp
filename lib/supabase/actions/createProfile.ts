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

// Categorías adicionales planas por área profesional (se agregan sin duplicar nombres)
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
  const nombresExistentes = new Set<string>(); // para no duplicar con área

  for (const cat of CATEGORIAS_BASE) {
    // Insertar categoría padre
    const { data: insertedParent, error: parentError } = await supabase
      .from("categorias")
      .insert({ user_id: userId, nombre: cat.nombre, tipo: cat.tipo })
      .select("id")
      .single();

    if (parentError) throw new Error(parentError.message);
    nombresExistentes.add(cat.nombre.toLowerCase());

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

  // 4. Agregar categorías del área profesional (solo las que no duplican nombre)
  const categoriasArea = CATEGORIAS_POR_AREA[data.profesion] ?? [];
  const catAreaFiltradas = categoriasArea.filter(
    (c) => !nombresExistentes.has(c.nombre.toLowerCase())
  );

  if (catAreaFiltradas.length > 0) {
    const { error: areaError } = await supabase.from("categorias").insert(
      catAreaFiltradas.map((c) => ({ user_id: userId, nombre: c.nombre, tipo: c.tipo }))
    );
    if (areaError) throw new Error(areaError.message);
  }

  // 5. Crear feature_flags vacío
  const { error: flagsError } = await supabase.from("feature_flags").upsert({
    user_id: userId,
    flags: {},
  });

  if (flagsError) throw new Error(flagsError.message);

  // 6. Redirigir a categorías sugeridas
  redirect("/onboarding/categorias-sugeridas");
}
