-- =============================================
-- 029_cuotas.sql
-- Soporte para gastos en cuotas prorrateados: un movimiento por cuota.
-- Correr manualmente en Supabase SQL Editor (después de 028).
-- =============================================

alter table public.movimientos
  add column if not exists cuota_numero   int,
  add column if not exists cuota_grupo_id uuid;

-- Agrupa las N cuotas de una misma compra (para editar/borrar en conjunto).
create index if not exists movimientos_cuota_grupo_idx
  on public.movimientos (cuota_grupo_id) where cuota_grupo_id is not null;
