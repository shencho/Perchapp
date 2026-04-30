-- Migration 011: Add registro_creado_id to pagos_cliente
-- This column tracks which registro_trabajo was auto-created when a payment
-- is registered before the corresponding work registro exists (CASO 2 and 3).
-- ON DELETE SET NULL: if the registro is deleted independently, the reference is cleared.

ALTER TABLE public.pagos_cliente
  ADD COLUMN IF NOT EXISTS registro_creado_id uuid
  REFERENCES public.registros_trabajo(id) ON DELETE SET NULL;
