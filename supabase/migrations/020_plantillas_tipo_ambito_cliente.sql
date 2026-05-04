ALTER TABLE plantillas_recurrentes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'Egreso'
    CHECK (tipo IN ('Egreso', 'Ingreso')),
  ADD COLUMN IF NOT EXISTS ambito text NOT NULL DEFAULT 'Personal'
    CHECK (ambito IN ('Personal', 'Profesional')),
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS servicio_id uuid REFERENCES servicios_cliente(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plantillas_tipo_user
  ON plantillas_recurrentes(user_id, tipo, activo);

-- Las plantillas existentes quedan con tipo='Egreso' y ambito='Personal' (correcto).
