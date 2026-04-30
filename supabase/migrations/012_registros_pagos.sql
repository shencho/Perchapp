-- =============================================
-- 012_registros_pagos.sql
-- Tabla pivot para asignación parcial de pagos a registros de trabajo.
-- Reemplaza el campo pago_id (one-to-one) con relación many-to-many con monto.
-- =============================================

-- 1. Crear tabla
CREATE TABLE IF NOT EXISTS public.registros_pagos (
  id          uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  registro_id uuid NOT NULL REFERENCES public.registros_trabajo(id) ON DELETE CASCADE,
  pago_id     uuid NOT NULL REFERENCES public.pagos_cliente(id) ON DELETE CASCADE,
  monto_asignado numeric(12,2) NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (id)
);

-- 2. RLS
ALTER TABLE public.registros_pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own registros_pagos" ON public.registros_pagos;
CREATE POLICY "Users can manage own registros_pagos"
  ON public.registros_pagos FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Seed: migrar asignaciones existentes (pago_id en registros_trabajo) usando FIFO
-- Para cada registro asignado a un pago, calcula el monto real cubierto por ese pago
-- aplicando FIFO (registros más antiguos primero dentro del mismo pago).
WITH fifo AS (
  SELECT
    r.user_id,
    r.id        AS registro_id,
    r.pago_id,
    GREATEST(0::numeric,
      LEAST(
        r.monto,
        p.monto - COALESCE(
          SUM(r.monto) OVER (
            PARTITION BY r.pago_id
            ORDER BY r.fecha, r.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ), 0::numeric
        )
      )
    ) AS monto_asignado
  FROM public.registros_trabajo r
  JOIN public.pagos_cliente p ON p.id = r.pago_id
  WHERE r.pago_id IS NOT NULL
)
INSERT INTO public.registros_pagos (user_id, registro_id, pago_id, monto_asignado)
SELECT user_id, registro_id, pago_id, monto_asignado
FROM fifo
WHERE monto_asignado > 0
ON CONFLICT DO NOTHING;
