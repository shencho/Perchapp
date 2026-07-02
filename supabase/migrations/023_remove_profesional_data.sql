-- Migration 023 — Remover Profesional (data)
--
-- Parte del pivot de MANGO a producto 100% personal.
--
-- CRÍTICO: NO usar TRUNCATE CASCADE en clientes/servicios_cliente.
-- En PostgreSQL TRUNCATE ... CASCADE trunca por completo cualquier tabla que
-- referencie (movimientos, plantillas_recurrentes) ignorando el ON DELETE SET NULL,
-- lo que borraría la contabilidad personal. Por eso: UPDATE para desvincular las FKs
-- + DELETE en orden de dependencias (hijas → padres).
--
-- Esta migration solo elimina DATA. NO dropea tablas ni columnas — las tablas
-- profesionales quedan como esqueleto vacío por si algún día se revive Profesional.
--
-- Envuelto en BEGIN/COMMIT: si algo falla en el medio, se revierte todo.
--
-- ⚠️ Ejecutar manualmente en Supabase SQL Editor DESPUÉS del merge.

BEGIN;

-- Paso 1: Todos los perfiles a modo "personal"
UPDATE profiles SET modo = 'personal' WHERE modo IS NOT NULL;

-- Paso 2: Desvincular columnas FK personales → profesionales (evita cascada destructiva)
UPDATE movimientos            SET cliente_id = NULL, servicio_id = NULL, ambito = 'Personal';
UPDATE plantillas_recurrentes SET cliente_id = NULL, servicio_id = NULL, ambito = 'Personal';

-- Paso 3: Cortar el ciclo pagos_cliente → movimientos antes de vaciar
UPDATE pagos_cliente SET movimiento_id = NULL;

-- Paso 4: Vaciar tablas profesionales en orden de dependencias (hijas → padres), SIN CASCADE
DELETE FROM registros_pagos;
DELETE FROM tarifas_historial;
DELETE FROM registros_trabajo;
DELETE FROM pagos_cliente;
DELETE FROM servicios_cliente;
DELETE FROM clientes;

-- Verificación (opcional, todos deben dar 0):
-- SELECT count(*) FROM clientes;          -- Esperado: 0
-- SELECT count(*) FROM servicios_cliente; -- Esperado: 0
-- SELECT count(*) FROM tarifas_historial; -- Esperado: 0
-- SELECT count(*) FROM registros_trabajo; -- Esperado: 0
-- SELECT count(*) FROM pagos_cliente;     -- Esperado: 0
-- SELECT count(*) FROM registros_pagos;   -- Esperado: 0

COMMIT;
