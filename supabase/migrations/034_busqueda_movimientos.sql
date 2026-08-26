-- 034 · Búsqueda de movimientos insensible a acentos
--
-- Problema: `ilike` en Postgres es insensible a mayúsculas pero NO a acentos.
-- Buscar "cafe" devuelve 0 resultados aunque existan "Café Shell", "Café YPF",
-- "Carga tarjeta café" y "Expendedora de café". Peor: los datos conviven con las
-- dos grafías ("comision" x4, "comisión" x1), así que ninguna de las dos búsquedas
-- trae el total y el usuario cree que lo que ve es todo lo que hay.
--
-- Normalizar del lado del cliente no alcanza: concepto/descripcion/observaciones
-- se filtran en la base. Hace falta una columna normalizada.

create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- `unaccent(text)` es STABLE, no IMMUTABLE, así que no se puede usar en una
-- columna generada ni en un índice. La forma soportada es fijar el diccionario
-- explícitamente, que sí es inmutable.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
strict
parallel safe
set search_path = public, pg_catalog
as $$
  select public.unaccent('public.unaccent', $1)
$$;

-- Columna generada: todo el texto libre del movimiento, sin acentos y en
-- minúscula. Al ser STORED se mantiene sola en cada insert/update.
alter table public.movimientos
  add column if not exists busqueda text
  generated always as (
    public.f_unaccent(lower(
      coalesce(concepto, '') || ' ' ||
      coalesce(descripcion, '') || ' ' ||
      coalesce(observaciones, '')
    ))
  ) stored;

-- Índice trigram: hace que `busqueda ilike '%algo%'` no sea un scan completo.
create index if not exists movimientos_busqueda_trgm_idx
  on public.movimientos using gin (busqueda public.gin_trgm_ops);

-- No hace falta tocar RLS: la columna vive en `movimientos`, que ya está
-- protegida por auth.uid() = user_id.
