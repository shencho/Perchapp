-- =============================================
-- 018_plantillas_recurrentes.sql
-- Plantillas de movimientos recurrentes mensuales (egresos).
-- Ejecutar DESPUÉS de 017_gastos_grupales_pagadores.sql
-- =============================================

CREATE TABLE IF NOT EXISTS public.plantillas_recurrentes (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre         text          NOT NULL,
  monto_estimado numeric(12,2) NOT NULL CHECK (monto_estimado >= 0),
  moneda         text          NOT NULL DEFAULT 'ARS',
  dia_mes        int           NOT NULL CHECK (dia_mes BETWEEN 1 AND 31),
  metodo         text          CHECK (metodo IN (
                                 'Efectivo', 'Transferencia', 'Billetera virtual',
                                 'Crédito', 'Débito automático', 'Débito'
                               )),
  debita_de      text          CHECK (debita_de IN ('cuenta', 'tarjeta')),
  cuenta_id      uuid          REFERENCES public.cuentas(id)    ON DELETE SET NULL,
  tarjeta_id     uuid          REFERENCES public.tarjetas(id)   ON DELETE SET NULL,
  categoria_id   uuid          REFERENCES public.categorias(id) ON DELETE SET NULL,
  clasificacion  text          CHECK (clasificacion IN ('Fijo', 'Variable', 'Cuotas')),
  concepto       text,
  activo         boolean       NOT NULL DEFAULT true,
  fecha_inicio   date          NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin      date,
  notas          text,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

-- Trigger updated_at (función handle_updated_at ya existe desde migration 003)
CREATE TRIGGER plantillas_recurrentes_updated_at
  BEFORE UPDATE ON public.plantillas_recurrentes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.plantillas_recurrentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_owns_plantilla" ON public.plantillas_recurrentes;
CREATE POLICY "user_owns_plantilla" ON public.plantillas_recurrentes
  FOR ALL
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plantillas_user_activo
  ON public.plantillas_recurrentes(user_id, activo);

-- FK en movimientos para trackear qué movimientos surgieron de una plantilla
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS plantilla_recurrente_id uuid
    REFERENCES public.plantillas_recurrentes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movimientos_plantilla_fecha
  ON public.movimientos(plantilla_recurrente_id, fecha)
  WHERE plantilla_recurrente_id IS NOT NULL;
