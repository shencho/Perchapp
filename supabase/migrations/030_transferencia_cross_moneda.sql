-- =============================================
-- 030_transferencia_cross_moneda.sql
-- Compra/venta de dólares: transferencia entre cuentas de distinta moneda.
-- monto (+ moneda) = lo que sale de la cuenta origen; monto_destino = lo que
-- entra en la cuenta destino (en la moneda de esa cuenta).
-- Correr manualmente en Supabase SQL Editor (después de 029).
-- =============================================

alter table public.movimientos
  add column if not exists monto_destino numeric(12,2);
