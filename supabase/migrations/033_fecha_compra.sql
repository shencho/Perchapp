-- =============================================
-- 033_fecha_compra.sql
-- Fecha de la compra original en los movimientos en cuotas.
--
-- Al generar las cuotas la app usaba la fecha de registro para calcular el
-- primer vencimiento y después la descartaba: cada fila quedaba con la fecha
-- de SU cuota y no había registro de cuándo se hizo la compra. Sin ese dato
-- las cuotas no se podían auditar ni recalcular.
-- =============================================

alter table public.movimientos
  add column if not exists fecha_compra date;

comment on column public.movimientos.fecha_compra is
  'Fecha de la compra original (cuotas). En un movimiento simple queda null.';
