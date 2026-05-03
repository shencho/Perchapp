-- ============================================================
-- 017_gastos_grupales_pagadores.sql
-- Splitwise mode: múltiples pagadores por gasto compartido
-- ============================================================

-- 1. Nueva tabla: quiénes pusieron dinero en el gasto
CREATE TABLE IF NOT EXISTS public.gastos_grupales_pagadores (
  id           uuid          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid          NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  gasto_id     uuid          NOT NULL REFERENCES public.movimientos(id) ON DELETE CASCADE,
  persona_id   uuid              NULL REFERENCES public.personas(id)  ON DELETE SET NULL,
  -- persona_id NULL = el propio usuario registrador
  monto_pagado numeric(12,2) NOT NULL CHECK (monto_pagado > 0),
  created_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ggp_gasto_id ON public.gastos_grupales_pagadores(gasto_id);
CREATE INDEX IF NOT EXISTS idx_ggp_user_id  ON public.gastos_grupales_pagadores(user_id);

-- 2. Row Level Security
ALTER TABLE public.gastos_grupales_pagadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_gastos_grupales_pagadores" ON public.gastos_grupales_pagadores;

CREATE POLICY "rls_gastos_grupales_pagadores"
  ON public.gastos_grupales_pagadores
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Deprecar gc_mi_parte (columna se mantiene para retrocompatibilidad de lectura)
-- DROP en migration 018 una vez confirmado que ningún query activo la lee.
COMMENT ON COLUMN public.movimientos.gc_mi_parte
  IS 'DEPRECATED desde 017. No escribir desde la app. Reemplazado por gastos_grupales_pagadores. DROP en 018.';
