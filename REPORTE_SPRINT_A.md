# REPORTE FINAL — Sprint A (4 bugs + reset agosto)

**Rama:** `fix/sprint-a` (desde `main` con PR2+PR3 mergeados, `49d3724`)
**HEAD:** `9d1c482` · **Estado:** ✅ 6 fixes + script + docs · build verde en cada commit · **sin push**
**Bug 3:** resuelto según tu decisión (umbral $1 + absorber en tu parte).

---

## 1. `npm run build` (última corrida, literal)
```
✓ Compiled successfully · Finished TypeScript
✓ Generating static pages (22/22)   ·   EXIT 0
ƒ Proxy (Middleware)
```
Build **verde antes de cada commit** (los 8).

## 2. Tabla de archivos por bug/bloque
| Bug/Bloque | Commit | Archivos |
|---|---|---|
| 1 · saldo inicial editable | `ab55e5e` | `lib/supabase/actions/cuentas.ts`, `components/cuentas/cuentas-config-client.tsx` |
| 2c · débito sin cierre/vto | `c315a75` | `components/tarjetas/tarjetas-page-content.tsx` |
| 2b · validar cuenta/tarjeta | `1a192c8` | `lib/supabase/actions/movimientos.ts` |
| 2a · fecha_vencimiento | `4a16916` | `app/(app)/movimientos/_components/movimiento-editor.tsx` |
| 3 · tolerancia gasto compartido | `e159dce` | `app/(app)/movimientos/_components/movimiento-editor.tsx` |
| 4 · drawer cierra al navegar | `9edab6e` | `components/navigation/navigation-drawer.tsx` |
| docs | `a323a5c` | `DIAGNOSTICO_SPRINT_A.md` |
| 5 · script reset | `9d1c482` | `scripts/reset_agosto_2026.sql` |

**Total:** 8 archivos (2 nuevos, 6 modificados), **+278 / −28**.

## 3. Dependencias nuevas
**Ninguna.**

## 4. `git log --oneline` (Sprint A) y `git status`
```
9d1c482 chore(reset): script reset agosto 2026 (escribir, NO ejecutar)
a323a5c docs(sprint-a): diagnostico de los 4 bugs + inventario de tablas
9edab6e fix(nav): cerrar drawer mobile al navegar
e159dce fix(gasto-compartido): tolerancia de redondeo <= $1 (absorbe en tu parte)
4a16916 fix(movimientos): fecha_vencimiento autocalculada al elegir tarjeta + no enviar ''
1a192c8 fix(movimientos): validar pertenencia de cuenta/tarjeta antes del insert
c315a75 fix(tarjetas): ocultar cierre/vencimiento en tarjetas de debito
ab55e5e fix(cuentas): permitir editar saldo inicial post-creacion
```
`git status`: working tree limpio (solo `.md` de specs/reportes untracked a propósito).

## 5. Confirmaciones STOP
❌ Sin `git push` · ❌ Sin migrations ni script de reset **ejecutados** (solo escritos) · ❌ `.env.local` intacto · ✅ fix de raíz en los 6 (ningún workaround) · ✅ build verde antes de cada commit · ✅ 1 commit por bug.

## 6. Causa raíz confirmada de cada bug
1. **Saldo inicial no editable:** campo oculto en edición (`{!editing}`) **y** `updateCuenta` tipado `Omit<…,"saldo">` (no lo persistía). → mostrar el campo al editar + persistir `saldo`. Balance = `saldo + movimientos` (derivado, sin snapshots) → recalcula coherente.
2a. **fecha_vencimiento 500:** `values.fecha_vencimiento ?? null` no captura `''` → enviaba `''` como date; y no se autocalculaba al pasar a crédito. → coerción `|| null` + autocálculo con `getCicloDelProximoVencimiento`/`getProximoVencimiento` al elegir tarjeta (si el campo está vacío).
2b. **FK `movimientos_cuenta_id_fkey`:** `createMovimiento` insertaba `cuenta_id`/`tarjeta_id` sin validar. → validación server-side de pertenencia; si el UUID no existe/no es del usuario, error claro ("seleccionala manualmente") en vez de 500.
2c. **Débito pedía cierre/vto:** los inputs se mostraban sin condicional. → ocultos salvo `tipo === "Crédito"` y forzados a `null` al guardar débito.
3. **Gasto compartido:** eran **soft warnings** a $0.01 (no bloqueaban). → umbral a **$1**; delta ≤$1 se **absorbe en `gc_mi_parte`** (tu parte) para cerrar exacto; >$1 mantiene el warning. (Mismo umbral para el warning de pagadores, por consistencia de redondeo.)
4. **Drawer no cerraba:** `<Sheet>` no controlado. → Sheet controlado (`useState`) + `useEffect` que cierra al cambiar `usePathname()`. Mobile only, no afecta desktop.

## 7. Decisiones del Bloque 5 (documentadas en el script)
- **Saldo:** `cuentas.saldo` es **columna** → el script hace `UPDATE cuentas SET saldo = 0` (el founder recarga los iniciales por UI con el fix del Bug 1).
- **`inv_*`:** **se conservan** (config de la cuenta, no transacciones).
- **Deudas compartidas → 0:** al borrar `gastos_compartidos_participantes` + `gastos_grupales_pagadores`.
- **Orden de DELETE (hijos→padres):** pivotes gc → prestamos_pagos → (pro legacy hijos) → movimientos → prestamos → (pro legacy padres) → alertas_silenciadas → conversaciones_ia. Todo `WHERE user_id = current_setting('app.reset_user')::uuid` dentro de `BEGIN/COMMIT`. UUID en **un solo lugar** (`set_config`). Counts de verificación comentados. **NUNCA TRUNCATE.**
- Tablas **pro legacy** (clientes/servicios/etc., vacías post-migration 023) incluidas por prolijidad, con nota "si ya fueron dropeadas, borrá esas líneas".

## 8. Validación para el founder (por bug, `npm run dev`)
| # | Test | Esperado |
|---|------|----------|
| 1 | Editar una cuenta → cambiar "Saldo inicial" → guardar | Persiste; el balance se corre por el delta |
| 2 | Captura por intérprete "débito automático" → cambiar a tarjeta crédito → guardar | `fecha_vencimiento` autocompletada; sin 500 |
| 3 | Forzar un `cuenta_id` inválido (intérprete) | Mensaje "seleccionala manualmente", sin error FK |
| 4 | Crear tarjeta de **Débito** | No aparecen Día cierre / Día vto. |
| 5 | Gasto compartido con partes que difieren **$0,50** | Guarda sin warning; tu parte absorbe los centavos (suma exacta) |
| 6 | Gasto compartido con diferencia **$5** | Warning visible (como antes); guarda igual (no hay bloqueo duro) |
| 7 | Mobile: abrir drawer "Más" → tocar "Cuentas" | Navega **y** el drawer se cierra; desktop sin cambios |
| 8 | `scripts/reset_agosto_2026.sql` (lectura) | Solo DELETEs filtrados por user_id, orden correcto, `saldo=0`, BEGIN/COMMIT, sin ejecutar |

**Nota:** el warning de pagadores (quién pagó) también pasó de $0.01 a $1 por consistencia — no estaba explícito en el spec, lo documento acá.

---

## Pendiente / próximos
- Validación local tuya (checklist §8).
- Push + merge de `fix/sprint-a`.
- **1° de agosto:** backup → reemplazar el UUID en `scripts/reset_agosto_2026.sql` → correr a mano en Supabase SQL Editor → verificar counts.

**PARO acá (checkpoint final). Sin push, script NO ejecutado.**
