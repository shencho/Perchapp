CREATE TABLE alertas_silenciadas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alerta_tipo      text NOT NULL CHECK (alerta_tipo IN ('plantilla_pendiente', 'plantilla_atrasada')),
  alerta_referencia uuid NOT NULL,
  silenciada_hasta date NOT NULL,
  created_at       timestamptz DEFAULT now(),
  CONSTRAINT alertas_silenciadas_user_alerta_uq UNIQUE (user_id, alerta_referencia)
);

ALTER TABLE alertas_silenciadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_owns_alerta_silenciada" ON alertas_silenciadas
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_alertas_silenciadas_lookup
  ON alertas_silenciadas(user_id, silenciada_hasta);
