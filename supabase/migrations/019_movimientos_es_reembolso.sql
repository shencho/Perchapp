ALTER TABLE movimientos ADD COLUMN es_reembolso boolean NOT NULL DEFAULT false;

CREATE INDEX idx_movimientos_es_reembolso
  ON movimientos(es_reembolso)
  WHERE es_reembolso = true;

UPDATE movimientos m
SET es_reembolso = true
WHERE m.id IN (
  SELECT DISTINCT movimiento_ingreso_id
  FROM gastos_compartidos_participantes
  WHERE movimiento_ingreso_id IS NOT NULL
);
