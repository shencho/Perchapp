-- Migration 014: agregar columna modo a gastos_compartidos_participantes

ALTER TABLE public.gastos_compartidos_participantes
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'a_repartir'
  CHECK (modo IN ('fijo', 'a_repartir'));
