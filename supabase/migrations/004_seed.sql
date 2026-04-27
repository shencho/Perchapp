-- =============================================
-- 004_seed.sql — Datos iniciales: profesiones
-- Ejecutar DESPUÉS de 003_triggers.sql
-- =============================================

insert into public.profesiones_templates (nombre, slug, categorias_sugeridas) values
(
  'Psicopedagogía',
  'psicopedagogia',
  '[
    {"nombre": "Honorarios Psicopedagógicos", "tipo": "ingreso"},
    {"nombre": "Informes y Evaluaciones",      "tipo": "ingreso"},
    {"nombre": "Supervisión Profesional",      "tipo": "egreso"},
    {"nombre": "Material Didáctico",           "tipo": "egreso"},
    {"nombre": "Formación Continua",           "tipo": "egreso"}
  ]'::jsonb
),
(
  'Coaching',
  'coaching',
  '[
    {"nombre": "Sesiones de Coaching",   "tipo": "ingreso"},
    {"nombre": "Talleres y Workshops",   "tipo": "ingreso"},
    {"nombre": "Certificaciones",        "tipo": "egreso"},
    {"nombre": "Supervisión",            "tipo": "egreso"},
    {"nombre": "Marketing Personal",     "tipo": "egreso"}
  ]'::jsonb
),
(
  'Consultoría',
  'consultoria',
  '[
    {"nombre": "Honorarios Consultoría",  "tipo": "ingreso"},
    {"nombre": "Proyectos",               "tipo": "ingreso"},
    {"nombre": "Viáticos",                "tipo": "egreso"},
    {"nombre": "Software y Herramientas", "tipo": "egreso"},
    {"nombre": "Capacitación",            "tipo": "egreso"}
  ]'::jsonb
),
(
  'Profesor',
  'profesor',
  '[
    {"nombre": "Clases Particulares",    "tipo": "ingreso"},
    {"nombre": "Clases Grupales",        "tipo": "ingreso"},
    {"nombre": "Material Educativo",     "tipo": "egreso"},
    {"nombre": "Plataformas Educativas", "tipo": "egreso"},
    {"nombre": "Formación Docente",      "tipo": "egreso"}
  ]'::jsonb
),
(
  'Genérico',
  'generico',
  '[
    {"nombre": "Servicios Profesionales", "tipo": "ingreso"},
    {"nombre": "Otros Ingresos",          "tipo": "ingreso"},
    {"nombre": "Gastos Operativos",       "tipo": "egreso"},
    {"nombre": "Herramientas y Software", "tipo": "egreso"},
    {"nombre": "Otros Gastos",            "tipo": "egreso"}
  ]'::jsonb
);
