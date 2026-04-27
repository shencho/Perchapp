-- =============================================
-- 001_schema.sql — Todas las tablas de Perchapp
-- Ejecutar en: Supabase → SQL Editor → New query
-- =============================================

-- Perfiles de usuario (1 por auth.user)
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  nombre                text,
  profesion             text,
  modo                  text check (modo in ('personal', 'profesional', 'ambos')),
  asistente_nombre      text default 'Perchita',
  onboarding_completado boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Cuentas (efectivo, banco, etc.)
create table public.cuentas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  nombre     text not null,
  tipo       text not null check (tipo in ('efectivo', 'banco', 'tarjeta', 'otro')),
  saldo      numeric(12,2) default 0,
  moneda     text default 'ARS',
  created_at timestamptz default now()
);

-- Tarjetas de crédito / débito
create table public.tarjetas (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  cuenta_id        uuid references public.cuentas(id) on delete set null,
  nombre           text not null,
  limite           numeric(12,2),
  cierre_dia       int check (cierre_dia between 1 and 31),
  vencimiento_dia  int check (vencimiento_dia between 1 and 31),
  created_at       timestamptz default now()
);

-- Categorías de ingresos y egresos
create table public.categorias (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  nombre     text not null,
  tipo       text not null check (tipo in ('ingreso', 'egreso')),
  color      text,
  icono      text,
  created_at timestamptz default now()
);

-- Clientes
create table public.clientes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  nombre     text not null,
  email      text,
  telefono   text,
  notas      text,
  activo     boolean default true,
  created_at timestamptz default now()
);

-- Servicios contratados por cliente
create table public.servicios_cliente (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  nombre         text not null,
  descripcion    text,
  tarifa_actual  numeric(12,2),
  moneda         text default 'ARS',
  frecuencia     text check (frecuencia in ('mensual', 'semanal', 'por_sesion', 'otro')),
  activo         boolean default true,
  created_at     timestamptz default now()
);

-- Historial de cambios de tarifa
create table public.tarifas_historial (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  servicio_id uuid not null references public.servicios_cliente(id) on delete cascade,
  tarifa      numeric(12,2) not null,
  moneda      text default 'ARS',
  fecha_desde date not null default current_date,
  created_at  timestamptz default now()
);

-- Registros de trabajo / sesiones realizadas
create table public.registros_trabajo (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  cliente_id         uuid references public.clientes(id) on delete set null,
  servicio_id        uuid references public.servicios_cliente(id) on delete set null,
  fecha              date not null default current_date,
  duracion_minutos   int,
  notas              text,
  cobrado            boolean default false,
  monto              numeric(12,2),
  created_at         timestamptz default now()
);

-- Pagos recibidos de clientes
create table public.pagos_cliente (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  monto      numeric(12,2) not null,
  moneda     text default 'ARS',
  fecha      date not null default current_date,
  metodo     text,
  notas      text,
  created_at timestamptz default now()
);

-- Movimientos financieros (ingresos / egresos)
create table public.movimientos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  cuenta_id    uuid references public.cuentas(id) on delete set null,
  categoria_id uuid references public.categorias(id) on delete set null,
  tipo         text not null check (tipo in ('ingreso', 'egreso')),
  monto        numeric(12,2) not null,
  descripcion  text,
  fecha        date not null default current_date,
  created_at   timestamptz default now()
);

-- Conversaciones con el asistente IA
create table public.conversaciones_ia (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  mensajes   jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Templates de profesión (datos globales, no por usuario)
create table public.profesiones_templates (
  id                   uuid primary key default gen_random_uuid(),
  nombre               text not null,
  slug                 text unique not null,
  categorias_sugeridas jsonb default '[]',
  created_at           timestamptz default now()
);

-- Feature flags por usuario
create table public.feature_flags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid unique not null references public.profiles(id) on delete cascade,
  flags      jsonb default '{}',
  created_at timestamptz default now()
);
