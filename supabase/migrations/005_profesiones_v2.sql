-- =============================================
-- 005_profesiones_v2.sql — 6 áreas genéricas + columna modalidades
-- Ejecutar DESPUÉS de 004_seed.sql
-- =============================================

-- Agregar columna modalidades (array de strings: sesion, hora, abono, proyecto)
alter table public.profesiones_templates
  add column if not exists modalidades jsonb default '[]';

-- Borrar las 5 profesiones anteriores
delete from public.profesiones_templates;

-- Insertar las 6 nuevas áreas
insert into public.profesiones_templates (nombre, slug, modalidades, categorias_sugeridas) values
(
  'Salud y bienestar',
  'salud-bienestar',
  '["sesion", "abono", "proyecto"]'::jsonb,
  '[
    {"nombre": "Sesión individual",       "tipo": "ingreso"},
    {"nombre": "Sesión pareja/familia",   "tipo": "ingreso"},
    {"nombre": "Evaluación",              "tipo": "ingreso"},
    {"nombre": "Taller",                  "tipo": "ingreso"},
    {"nombre": "Plan mensual",            "tipo": "ingreso"},
    {"nombre": "Material profesional",    "tipo": "egreso"},
    {"nombre": "Capacitaciones",          "tipo": "egreso"},
    {"nombre": "Supervisiones",           "tipo": "egreso"},
    {"nombre": "Suscripciones",           "tipo": "egreso"},
    {"nombre": "Alquiler de consultorio", "tipo": "egreso"}
  ]'::jsonb
),
(
  'Educación',
  'educacion',
  '["sesion", "abono", "proyecto"]'::jsonb,
  '[
    {"nombre": "Clase individual",         "tipo": "ingreso"},
    {"nombre": "Clase grupal",             "tipo": "ingreso"},
    {"nombre": "Curso completo",           "tipo": "ingreso"},
    {"nombre": "Material didáctico",       "tipo": "ingreso"},
    {"nombre": "Material didáctico",       "tipo": "egreso"},
    {"nombre": "Plataformas (Zoom, Teams)","tipo": "egreso"},
    {"nombre": "Certificaciones",          "tipo": "egreso"},
    {"nombre": "Libros",                   "tipo": "egreso"}
  ]'::jsonb
),
(
  'Servicios profesionales',
  'servicios-profesionales',
  '["hora", "proyecto", "abono"]'::jsonb,
  '[
    {"nombre": "Honorarios",              "tipo": "ingreso"},
    {"nombre": "Asesoría puntual",        "tipo": "ingreso"},
    {"nombre": "Proyecto",                "tipo": "ingreso"},
    {"nombre": "Retainer mensual",        "tipo": "ingreso"},
    {"nombre": "Software profesional",    "tipo": "egreso"},
    {"nombre": "Capacitaciones",          "tipo": "egreso"},
    {"nombre": "Networking",              "tipo": "egreso"},
    {"nombre": "Almuerzos comerciales",   "tipo": "egreso"}
  ]'::jsonb
),
(
  'Creatividad y digital',
  'creatividad-digital',
  '["proyecto", "hora", "abono"]'::jsonb,
  '[
    {"nombre": "Proyecto",                    "tipo": "ingreso"},
    {"nombre": "Iguala mensual",              "tipo": "ingreso"},
    {"nombre": "Licencias / Royalties",       "tipo": "ingreso"},
    {"nombre": "Software (Adobe, Figma...)",  "tipo": "egreso"},
    {"nombre": "Hardware",                    "tipo": "egreso"},
    {"nombre": "Cursos",                      "tipo": "egreso"},
    {"nombre": "Stock fotográfico",           "tipo": "egreso"}
  ]'::jsonb
),
(
  'Belleza y cuidado personal',
  'belleza-cuidado',
  '["sesion", "abono", "proyecto"]'::jsonb,
  '[
    {"nombre": "Servicio individual",     "tipo": "ingreso"},
    {"nombre": "Paquete",                 "tipo": "ingreso"},
    {"nombre": "Membresía",               "tipo": "ingreso"},
    {"nombre": "Insumos",                 "tipo": "egreso"},
    {"nombre": "Equipamiento",            "tipo": "egreso"},
    {"nombre": "Alquiler de espacio",     "tipo": "egreso"},
    {"nombre": "Capacitaciones",          "tipo": "egreso"}
  ]'::jsonb
),
(
  'Otro / Genérico',
  'generico',
  '["sesion", "hora", "abono", "proyecto"]'::jsonb,
  '[
    {"nombre": "Ingresos por servicios",  "tipo": "ingreso"},
    {"nombre": "Otros ingresos",          "tipo": "ingreso"},
    {"nombre": "Gastos operativos",       "tipo": "egreso"},
    {"nombre": "Herramientas y software", "tipo": "egreso"},
    {"nombre": "Otros gastos",            "tipo": "egreso"}
  ]'::jsonb
);
