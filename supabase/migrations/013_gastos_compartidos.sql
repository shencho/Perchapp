-- =============================================
-- 013_gastos_compartidos.sql
-- Agenda personal (personas, grupos) + gastos compartidos participantes
-- =============================================

-- 1. Tabla personas (agenda personal del usuario)
CREATE TABLE IF NOT EXISTS public.personas (
  id         uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre     text NOT NULL,
  notas      text NULL,
  archivado  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own personas" ON public.personas;
CREATE POLICY "Users can manage own personas"
  ON public.personas FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Tabla grupos
CREATE TABLE IF NOT EXISTS public.grupos (
  id         uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre     text NOT NULL,
  archivado  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own grupos" ON public.grupos;
CREATE POLICY "Users can manage own grupos"
  ON public.grupos FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Pivot grupo_miembros
CREATE TABLE IF NOT EXISTS public.grupo_miembros (
  grupo_id   uuid NOT NULL REFERENCES public.grupos(id)   ON DELETE CASCADE,
  persona_id uuid NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  PRIMARY KEY (grupo_id, persona_id)
);

ALTER TABLE public.grupo_miembros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own grupo_miembros" ON public.grupo_miembros;
CREATE POLICY "Users can manage own grupo_miembros"
  ON public.grupo_miembros FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.grupos g
      WHERE g.id = grupo_id AND g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grupos g
      WHERE g.id = grupo_id AND g.user_id = auth.uid()
    )
  );

-- 4. Tabla gastos_compartidos_participantes
CREATE TABLE IF NOT EXISTS public.gastos_compartidos_participantes (
  id                   uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id              uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  movimiento_id        uuid NOT NULL REFERENCES public.movimientos(id) ON DELETE CASCADE,
  persona_nombre       text NOT NULL,
  persona_id           uuid NULL REFERENCES public.personas(id) ON DELETE SET NULL,
  monto                numeric(12,2) NOT NULL,
  estado               text NOT NULL DEFAULT 'pendiente'
                         CHECK (estado IN ('pendiente', 'cobrado')),
  cuenta_destino_id    uuid NULL REFERENCES public.cuentas(id) ON DELETE SET NULL,
  movimiento_ingreso_id uuid NULL REFERENCES public.movimientos(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gastos_compartidos_participantes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own gastos_compartidos_participantes" ON public.gastos_compartidos_participantes;
CREATE POLICY "Users can manage own gastos_compartidos_participantes"
  ON public.gastos_compartidos_participantes FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Extender tabla movimientos
ALTER TABLE public.movimientos
  ADD COLUMN IF NOT EXISTS es_compartido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gc_mi_parte   numeric(12,2) NULL;
