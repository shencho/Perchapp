-- ============================================================================
-- RESET AGOSTO 2026 — borra SOLO datos transaccionales de un usuario.
-- ============================================================================
-- ⚠️  NO EJECUTAR AUTOMÁTICAMENTE. Correr a mano en Supabase SQL Editor el 1° de
--     agosto de 2026, DESPUÉS de un backup.
--
-- Qué hace:
--   • Borra movimientos, gastos compartidos + pivotes, préstamos + pagos,
--     alertas silenciadas, conversaciones de IA (y tablas pro legacy vacías).
--   • Resetea cuentas.saldo = 0 (el saldo inicial se recarga por UI con el fix
--     del Sprint A — "editar saldo inicial de cuenta").
--   • Deudas de gastos compartidos quedan en 0 (se borran los pivotes).
--
-- Qué NO toca (estructura):
--   • profiles, cuentas (salvo saldo→0), tarjetas, categorías, personas, grupos,
--     grupo_miembros, plantillas_recurrentes, feature_flags.
--   • Campos inv_* de cuentas de inversión (subtipo, tasa, vencimiento, notas):
--     SE CONSERVAN — describen la cuenta, no son transacciones.
--
-- Técnica: DELETE (nunca TRUNCATE CASCADE), en orden hijos → padres, filtrado
--          por user_id, todo dentro de una transacción (BEGIN/COMMIT).
-- ============================================================================

-- 1) Reemplazar el UUID por el del usuario a resetear (ÚNICO lugar a editar):
--    (podés obtenerlo con: SELECT id, email FROM auth.users;)
BEGIN;

SELECT set_config('app.reset_user', 'REEMPLAZAR_USER_ID', true);
-- A partir de acá, current_setting('app.reset_user')::uuid = usuario objetivo.

-- 2) DELETE en orden hijos → padres -----------------------------------------

-- 2.1 Pivotes de gastos compartidos (referencian movimientos / grupos / personas)
DELETE FROM gastos_grupales_pagadores          WHERE user_id = current_setting('app.reset_user')::uuid;
DELETE FROM gastos_compartidos_participantes   WHERE user_id = current_setting('app.reset_user')::uuid;

-- 2.2 Pagos de préstamos (referencian prestamos)
DELETE FROM prestamos_pagos                    WHERE user_id = current_setting('app.reset_user')::uuid;

-- 2.3 Tablas PRO legacy (vacías desde migration 023; incluidas por prolijidad).
--     Si ya fueron dropeadas, borrá estas 4 líneas.
DELETE FROM registros_pagos                    WHERE user_id = current_setting('app.reset_user')::uuid;
DELETE FROM tarifas_historial                  WHERE user_id = current_setting('app.reset_user')::uuid;
DELETE FROM registros_trabajo                  WHERE user_id = current_setting('app.reset_user')::uuid;
DELETE FROM pagos_cliente                      WHERE user_id = current_setting('app.reset_user')::uuid;

-- 2.4 Movimientos (padre de los pivotes de arriba; referencia cuentas/tarjetas/
--     categorías/préstamos — por eso va antes que préstamos y después de sus hijos)
DELETE FROM movimientos                        WHERE user_id = current_setting('app.reset_user')::uuid;

-- 2.5 Préstamos (padre de prestamos_pagos)
DELETE FROM prestamos                          WHERE user_id = current_setting('app.reset_user')::uuid;

-- 2.6 Resto de tablas PRO legacy (padres). Si ya fueron dropeadas, borrá estas 2.
DELETE FROM servicios_cliente                  WHERE user_id = current_setting('app.reset_user')::uuid;
DELETE FROM clientes                           WHERE user_id = current_setting('app.reset_user')::uuid;

-- 2.7 Estado transaccional suelto
DELETE FROM alertas_silenciadas                WHERE user_id = current_setting('app.reset_user')::uuid;
DELETE FROM conversaciones_ia                  WHERE user_id = current_setting('app.reset_user')::uuid;

-- 3) Resetear saldos de cuentas a 0 (los iniciales se recargan por UI) --------
UPDATE cuentas SET saldo = 0                   WHERE user_id = current_setting('app.reset_user')::uuid;

COMMIT;

-- ============================================================================
-- VERIFICACIÓN (descomentar y correr DESPUÉS del COMMIT; reemplazar el UUID).
-- Todos deben dar 0, salvo el count de cuentas (estructura, se conserva) y sus
-- saldos que deben ser 0.
-- ============================================================================
-- SELECT 'movimientos'                     AS tabla, count(*) FROM movimientos                      WHERE user_id = 'REEMPLAZAR_USER_ID';
-- SELECT 'gastos_compartidos_participantes', count(*) FROM gastos_compartidos_participantes         WHERE user_id = 'REEMPLAZAR_USER_ID';
-- SELECT 'gastos_grupales_pagadores',        count(*) FROM gastos_grupales_pagadores                WHERE user_id = 'REEMPLAZAR_USER_ID';
-- SELECT 'prestamos',                        count(*) FROM prestamos                                WHERE user_id = 'REEMPLAZAR_USER_ID';
-- SELECT 'prestamos_pagos',                  count(*) FROM prestamos_pagos                          WHERE user_id = 'REEMPLAZAR_USER_ID';
-- SELECT 'alertas_silenciadas',              count(*) FROM alertas_silenciadas                      WHERE user_id = 'REEMPLAZAR_USER_ID';
-- SELECT 'conversaciones_ia',                count(*) FROM conversaciones_ia                        WHERE user_id = 'REEMPLAZAR_USER_ID';
-- Estructura conservada + saldos en 0:
-- SELECT nombre, tipo, saldo FROM cuentas    WHERE user_id = 'REEMPLAZAR_USER_ID';   -- saldo debe ser 0
-- SELECT count(*) AS categorias FROM categorias WHERE user_id = 'REEMPLAZAR_USER_ID'; -- se conservan
-- SELECT count(*) AS personas   FROM personas   WHERE user_id = 'REEMPLAZAR_USER_ID'; -- se conservan
-- ============================================================================
