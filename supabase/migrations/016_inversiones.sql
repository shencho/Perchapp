-- Migration 016: extensión de cuentas para inversiones
-- El tipo 'Inversión' ya existe en el CHECK de cuentas.tipo (migration 006).
-- Solo agregamos las 4 columnas inv_* para metadata extra.

ALTER TABLE public.cuentas
  ADD COLUMN IF NOT EXISTS inv_subtipo text NULL
    CHECK (
      inv_subtipo IN ('plazo_fijo', 'cripto', 'fci', 'acciones', 'usd_fisico', 'balanz', 'otros')
      OR inv_subtipo IS NULL
    ),
  ADD COLUMN IF NOT EXISTS inv_fecha_vencimiento date NULL,
  ADD COLUMN IF NOT EXISTS inv_notas text NULL,
  ADD COLUMN IF NOT EXISTS inv_tasa_anual numeric(8,4) NULL;
