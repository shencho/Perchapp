-- =============================================
-- 006_ajustes_schema.sql — Completar schema para /ajustes
-- Ejecutar DESPUÉS de 005_profesiones_v2.sql
-- Idempotente: puede correrse aunque la migration haya corrido parcialmente.
-- =============================================

-- ── profiles ──────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists vto_day_default integer default 10;

-- ── cuentas ───────────────────────────────────────────────────────────────────
-- 1. Primero DROP del constraint viejo (para que el UPDATE no lo viole)
alter table public.cuentas drop constraint if exists cuentas_tipo_check;

-- 2. Migrar valores a enum capitalizado (WHERE solo actúa sobre filas con valor viejo)
update public.cuentas set tipo = 'Efectivo'          where tipo = 'efectivo';
update public.cuentas set tipo = 'Banco'             where tipo = 'banco';
update public.cuentas set tipo = 'Billetera virtual' where tipo = 'tarjeta';
update public.cuentas set tipo = 'Inversión'         where tipo = 'otro';

-- 3. Agregar nuevo constraint
alter table public.cuentas add constraint cuentas_tipo_check
  check (tipo in ('Banco', 'Billetera virtual', 'Efectivo', 'Inversión'));

-- 4. Columnas nuevas
alter table public.cuentas add column if not exists orden     integer default 0;
alter table public.cuentas add column if not exists archivada boolean default false;

-- ── tarjetas ──────────────────────────────────────────────────────────────────
-- La columna `limite` existente se conserva (no eliminar para no romper data)
-- Los checks inline se definen separados para ser idempotentes.
alter table public.tarjetas add column if not exists tipo                text;
alter table public.tarjetas add column if not exists banco_emisor        text;
alter table public.tarjetas add column if not exists ultimos_cuatro      text;
alter table public.tarjetas add column if not exists limite_ars          numeric(12,2);
alter table public.tarjetas add column if not exists limite_usd          numeric(12,2);
alter table public.tarjetas add column if not exists cuenta_pago_default uuid references public.cuentas(id) on delete set null;
alter table public.tarjetas add column if not exists archivada           boolean default false;

-- Constraints de tarjetas (drop + add para idempotencia)
alter table public.tarjetas drop constraint if exists tarjetas_tipo_check;
alter table public.tarjetas add constraint tarjetas_tipo_check
  check (tipo in ('Crédito', 'Débito'));

alter table public.tarjetas drop constraint if exists tarjetas_ultimos_cuatro_check;
alter table public.tarjetas add constraint tarjetas_ultimos_cuatro_check
  check (ultimos_cuatro is null or char_length(ultimos_cuatro) = 4);

-- ── categorias ────────────────────────────────────────────────────────────────
-- 1. Primero DROP del constraint viejo
alter table public.categorias drop constraint if exists categorias_tipo_check;

-- 2. Migrar valores a enum capitalizado
update public.categorias set tipo = 'Ingreso' where tipo = 'ingreso';
update public.categorias set tipo = 'Egreso'  where tipo = 'egreso';

-- 3. Agregar nuevo constraint (incluye 'Ambos')
alter table public.categorias add constraint categorias_tipo_check
  check (tipo in ('Ingreso', 'Egreso', 'Ambos'));

-- 4. Columnas nuevas
alter table public.categorias add column if not exists parent_id  uuid references public.categorias(id) on delete set null;
alter table public.categorias add column if not exists orden      integer default 0;
alter table public.categorias add column if not exists archivada  boolean default false;
