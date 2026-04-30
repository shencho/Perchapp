-- =============================================
-- 009_profesional_schema.sql
-- Extender tablas profesionales para Sesión 5
-- Ejecutar DESPUÉS de 008_seed_categorias.sql
-- Idempotente: puede correrse aunque haya corrido parcialmente.
-- =============================================

-- ── clientes ──────────────────────────────────────────────────────────────────

-- 1. RENAME activo → archivado + invertir valores (solo si activo existe y archivado no)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'activo'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clientes' AND column_name = 'archivado'
  ) THEN
    ALTER TABLE public.clientes RENAME COLUMN activo TO archivado;
    UPDATE public.clientes SET archivado = NOT archivado;
    ALTER TABLE public.clientes ALTER COLUMN archivado SET DEFAULT false;
  END IF;
END $$;

-- 2. Nuevas columnas
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo              text NOT NULL DEFAULT 'Persona',
  ADD COLUMN IF NOT EXISTS parent_cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp          text;

-- 3. Constraint de tipo (drop + add para idempotencia)
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_tipo_check;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_tipo_check
  CHECK (tipo IN ('Persona', 'Empresa', 'Familia'));

-- ── servicios_cliente ─────────────────────────────────────────────────────────

-- 1. RENAME activo → archivado + invertir valores
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'servicios_cliente' AND column_name = 'activo'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'servicios_cliente' AND column_name = 'archivado'
  ) THEN
    ALTER TABLE public.servicios_cliente RENAME COLUMN activo TO archivado;
    UPDATE public.servicios_cliente SET archivado = NOT archivado;
    ALTER TABLE public.servicios_cliente ALTER COLUMN archivado SET DEFAULT false;
  END IF;
END $$;

-- 2. Nuevas columnas
ALTER TABLE public.servicios_cliente
  ADD COLUMN IF NOT EXISTS modalidad             text,
  ADD COLUMN IF NOT EXISTS ciclo_facturacion     text NOT NULL DEFAULT 'mensual',
  ADD COLUMN IF NOT EXISTS tarifa_moneda         text NOT NULL DEFAULT 'ARS',
  ADD COLUMN IF NOT EXISTS dia_cierre_ciclo      integer,
  ADD COLUMN IF NOT EXISTS tope_unidades_periodo integer,
  ADD COLUMN IF NOT EXISTS tarifa_unidad_extra   numeric(12,2),
  ADD COLUMN IF NOT EXISTS proyecto_total        numeric(12,2),
  ADD COLUMN IF NOT EXISTS proyecto_estado       text NOT NULL DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS notas                 text;

-- 3. Migrar frecuencia → modalidad + ciclo_facturacion para filas existentes
UPDATE public.servicios_cliente
SET
  modalidad = CASE frecuencia
    WHEN 'mensual'    THEN 'abono'
    WHEN 'semanal'    THEN 'sesion'
    WHEN 'por_sesion' THEN 'sesion'
    WHEN 'otro'       THEN 'proyecto'
    ELSE 'sesion'
  END,
  ciclo_facturacion = CASE frecuencia
    WHEN 'mensual'    THEN 'mensual'
    WHEN 'semanal'    THEN 'al_cierre'
    WHEN 'por_sesion' THEN 'inmediato'
    WHEN 'otro'       THEN 'inmediato'
    ELSE 'mensual'
  END
WHERE modalidad IS NULL;

-- Cualquier fila sin frecuencia también recibe un default
UPDATE public.servicios_cliente
SET modalidad = 'sesion'
WHERE modalidad IS NULL;

-- 4. Constraints
ALTER TABLE public.servicios_cliente DROP CONSTRAINT IF EXISTS servicios_modalidad_check;
ALTER TABLE public.servicios_cliente ADD CONSTRAINT servicios_modalidad_check
  CHECK (modalidad IN ('sesion', 'hora', 'abono', 'proyecto'));

ALTER TABLE public.servicios_cliente DROP CONSTRAINT IF EXISTS servicios_ciclo_facturacion_check;
ALTER TABLE public.servicios_cliente ADD CONSTRAINT servicios_ciclo_facturacion_check
  CHECK (ciclo_facturacion IN ('mensual', 'quincenal', 'al_cierre', 'por_hito', 'inmediato'));

ALTER TABLE public.servicios_cliente DROP CONSTRAINT IF EXISTS servicios_proyecto_estado_check;
ALTER TABLE public.servicios_cliente ADD CONSTRAINT servicios_proyecto_estado_check
  CHECK (proyecto_estado IN ('activo', 'finalizado', 'pausado'));

-- DEPRECATED: frecuencia no se usa más. Usar modalidad + ciclo_facturacion.
COMMENT ON COLUMN public.servicios_cliente.frecuencia IS 'DEPRECATED — usar modalidad + ciclo_facturacion en su lugar';

-- ── tarifas_historial ─────────────────────────────────────────────────────────

-- 1. RENAME fecha_desde → vigente_desde
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tarifas_historial' AND column_name = 'fecha_desde'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tarifas_historial' AND column_name = 'vigente_desde'
  ) THEN
    ALTER TABLE public.tarifas_historial RENAME COLUMN fecha_desde TO vigente_desde;
  END IF;
END $$;

-- 2. Agregar vigente_hasta
ALTER TABLE public.tarifas_historial
  ADD COLUMN IF NOT EXISTS vigente_hasta date;

-- ── registros_trabajo ─────────────────────────────────────────────────────────

ALTER TABLE public.registros_trabajo
  ADD COLUMN IF NOT EXISTS tipo            text,
  ADD COLUMN IF NOT EXISTS cantidad        numeric(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS tarifa_aplicada numeric(12,2),
  ADD COLUMN IF NOT EXISTS monto_override  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS facturado       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pago_id         uuid REFERENCES public.pagos_cliente(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origen          text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS origen_ref      text;

ALTER TABLE public.registros_trabajo DROP CONSTRAINT IF EXISTS registros_tipo_check;
ALTER TABLE public.registros_trabajo ADD CONSTRAINT registros_tipo_check
  CHECK (tipo IN ('sesion', 'hora', 'hito'));

ALTER TABLE public.registros_trabajo DROP CONSTRAINT IF EXISTS registros_origen_check;
ALTER TABLE public.registros_trabajo ADD CONSTRAINT registros_origen_check
  CHECK (origen IN ('manual', 'voz', 'google_calendar', 'api'));

-- ── pagos_cliente ─────────────────────────────────────────────────────────────

ALTER TABLE public.pagos_cliente
  ADD COLUMN IF NOT EXISTS cuenta_destino_id uuid REFERENCES public.cuentas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS observaciones     text,
  ADD COLUMN IF NOT EXISTS movimiento_id     uuid REFERENCES public.movimientos(id) ON DELETE SET NULL;
