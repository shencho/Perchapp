-- =============================================
-- 010_modalidad_comision.sql
-- Agrega modalidad 'comision' a servicios/registros
-- y columna servicio_id en movimientos
-- Idempotente.
-- =============================================

-- 1. Ampliar constraint de modalidad en servicios_cliente
ALTER TABLE public.servicios_cliente DROP CONSTRAINT IF EXISTS servicios_modalidad_check;
ALTER TABLE public.servicios_cliente ADD CONSTRAINT servicios_modalidad_check
  CHECK (modalidad IN ('sesion', 'hora', 'abono', 'proyecto', 'comision'));

-- 2. Ampliar constraint de tipo en registros_trabajo
ALTER TABLE public.registros_trabajo DROP CONSTRAINT IF EXISTS registros_tipo_check;
ALTER TABLE public.registros_trabajo ADD CONSTRAINT registros_tipo_check
  CHECK (tipo IN ('sesion', 'hora', 'hito', 'comision'));

-- 3. Agregar servicio_id a movimientos (vinculación profesional)
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS servicio_id uuid REFERENCES public.servicios_cliente(id) ON DELETE SET NULL;
