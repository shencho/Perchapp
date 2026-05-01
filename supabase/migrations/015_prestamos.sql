-- Migration 015: Sistema de préstamos
-- Tablas: prestamos, prestamos_pagos
-- Columnas en movimientos: prestamo_id, prestamo_pago_id
-- Orden: prestamos → prestamos_pagos → ALTER movimientos (evita FK circular)

-- ── Tabla: prestamos ──────────────────────────────────────────────────────────

CREATE TABLE public.prestamos (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo                  text        NOT NULL CHECK (tipo IN ('otorgado', 'recibido', 'bancario')),
  persona_id            uuid        NULL REFERENCES public.personas(id) ON DELETE SET NULL,
  institucion_nombre    text        NULL,
  monto_inicial         numeric(12,2) NOT NULL,
  moneda                text        NOT NULL DEFAULT 'ARS',
  fecha_inicio          date        NOT NULL DEFAULT current_date,
  fecha_vencimiento     date        NULL,
  cantidad_cuotas       integer     NULL,
  tasa_interes_anual    numeric(8,4) NULL,
  cuota_mensual         numeric(12,2) NULL,
  dia_vencimiento_cuota integer     NULL CHECK (dia_vencimiento_cuota BETWEEN 1 AND 31),
  estado                text        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cancelado')),
  notas                 text        NULL,
  archivado             boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- ── Tabla: prestamos_pagos ────────────────────────────────────────────────────
-- movimientos ya existe (migration 007), se puede referenciar directamente.

CREATE TABLE public.prestamos_pagos (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id   uuid        NOT NULL REFERENCES public.prestamos(id) ON DELETE CASCADE,
  fecha         date        NOT NULL DEFAULT current_date,
  monto         numeric(12,2) NOT NULL,
  cuota_numero  integer     NULL,
  movimiento_id uuid        NULL REFERENCES public.movimientos(id) ON DELETE SET NULL,
  notas         text        NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── ALTER movimientos: agregar FK a prestamos y prestamos_pagos ───────────────
-- prestamos_pagos ya existe en este punto, por lo que la FK no es circular.

ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS prestamo_id      uuid NULL REFERENCES public.prestamos(id)      ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prestamo_pago_id uuid NULL REFERENCES public.prestamos_pagos(id) ON DELETE SET NULL;

-- ── RLS: prestamos ────────────────────────────────────────────────────────────

ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_prestamos" ON public.prestamos
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── RLS: prestamos_pagos ──────────────────────────────────────────────────────
-- Sin user_id propio; acceso delegado a través de prestamos.user_id.

ALTER TABLE public.prestamos_pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_prestamos_pagos" ON public.prestamos_pagos
  FOR ALL
  USING (
    prestamo_id IN (
      SELECT id FROM public.prestamos WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    prestamo_id IN (
      SELECT id FROM public.prestamos WHERE user_id = auth.uid()
    )
  );
