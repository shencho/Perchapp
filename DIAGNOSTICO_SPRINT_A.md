# DIAGNÓSTICO SPRINT A — 4 bugs + reset agosto

> ⚠️ **CHECKPOINT — PARADA (PASO 0).** Diagnóstico read-only; no se tocó código. **Precondición OK:** `main` ya tiene PR2+PR3 mergeados (`49d3724`) y `fix/sprint-a` está creada desde ahí (limpia). **Baseline build:** verde (heredado de main).
>
> 🚩 **Bug 3 contradice la descripción** (ver abajo) → por STOP condition 7 lo dejo pausado para tu confirmación; los otros 3 + el script están listos.

---

## BUG 1 — Saldo inicial de cuenta no editable

**Archivos:** `components/cuentas/cuentas-config-client.tsx`, `lib/supabase/actions/cuentas.ts`.
**Causa raíz (confirmada):** dos capas lo bloquean:
1. Form: el campo "Saldo inicial" está envuelto en `{!editing && (…)}` (línea 218) → **no se muestra al editar**.
2. Action: `updateCuenta(id, data: Omit<CuentaData, "saldo">)` **excluye `saldo`** del update (línea 51, y 62 fuerza `saldo: 0` que ni se persiste).
**Mecanismo de balance (⚠️ pedido):** `cuentas.saldo` es **columna** (saldo inicial). El balance mostrado = `calcularSaldoCuenta(id, saldo, movimientos)` = **saldo + neto de movimientos**. **No hay snapshots** — el balance siempre se deriva en vivo. Por lo tanto editar el saldo inicial **recalcula todo hacia atrás de forma coherente** (corre el balance por el delta). Es exactamente lo esperado y no rompe nada.
**Fix:** mostrar "Saldo inicial" también al editar; agregar `saldo` a `updateCuenta` y persistirlo. Riesgo: bajo.

## BUG 2 — Tarjetas (fecha_vencimiento + FK + débito)

### 2a — fecha_vencimiento `''` → 500 "invalid input syntax for type date"
**Archivo:** `app/(app)/movimientos/_components/movimiento-editor.tsx`.
**Causa raíz (confirmada):** línea 439 `fecha_vencimiento: showFechaVto ? (values.fecha_vencimiento ?? null) : null`. El `?? null` **no captura `''`** (solo null/undefined) → si el campo está vacío se envía `''` como date. Además, al pasar cuenta→tarjeta crédito **no se autocalcula** `fecha_vencimiento` desde `cierre_dia`/`vencimiento_dia` de la tarjeta.
**Fix:** (1) coercionar `''`→`null` (`values.fecha_vencimiento || null`); (2) autocalcular `fecha_vencimiento` al seleccionar tarjeta de crédito reutilizando `getProximoVencimiento`/`getCicloDelProximoVencimiento` (`lib/domain/calcularConsumoTarjeta`) — confirmar que el editor recibe `cierre_dia`/`vencimiento_dia` de la tarjeta seleccionada (viene por props de tarjetas). Riesgo: bajo-medio.

### 2b — FK `movimientos_cuenta_id_fkey` con UUID inválido del intérprete
**Archivo:** `lib/supabase/actions/movimientos.ts` (`createMovimiento`, líneas 82-95).
**Causa raíz (confirmada):** inserta `cuenta_id: parsed.cuenta_id ?? null` / `tarjeta_id` **sin validar** que existan y pertenezcan al usuario → UUID inventado por el intérprete viola la FK → 500.
**Fix:** server-side, antes del insert, verificar que `cuenta_id`/`tarjeta_id` existan para `user.id`; si no, **descartarlos (null)** y devolver señal de "seleccionar manualmente" en vez de 500. Riesgo: bajo.

### 2c — Tarjeta de débito pide cierre/vencimiento
**Archivo:** `components/tarjetas/tarjetas-page-content.tsx`.
**Causa raíz (confirmada):** los inputs "Día cierre" (213) y "Día vto." (218) se muestran **sin condicional por tipo** → aparecen también para Débito (son solo de Crédito).
**Fix:** `useWatch` sobre `tipo` y envolver ambos campos en `tipo === "Crédito"`; para Débito no requerirlos (ya son nullable en el schema). Riesgo: bajo.

## BUG 3 — Gasto compartido: tolerancia de redondeo 🚩 CONTRADICCIÓN

**Archivo:** `app/(app)/movimientos/_components/movimiento-editor.tsx` (líneas 983-996 pagadores, 1312-1335 partes).
**Lo que dice el spec:** "la validación exige match exacto y **falla** con centavos".
**Lo que encontré:** las dos validaciones son **soft warnings** (solo muestran un `<div>` de aviso), umbral `> 0.01` (1 centavo). **No bloquean el guardado** (revisado: los `disabled` del submit no dependen del delta; no hay `throw` server-side por suma≠total). Es decir: hoy **guarda igual**, solo muestra una advertencia amarilla si difiere >1 centavo.
**Por qué paro (STOP 7):** el bug descrito ("falla") no coincide con el comportamiento real (advertencia no-bloqueante). Antes de tocar, necesito confirmar:
- ¿El problema es solo el **aviso molesto** para redondeos sub-$1? → fix simple: subir umbral a `$1` en ambos warnings.
- ¿Querés además **absorber** el delta ≤$1 en la parte del pagador? → ¿dónde: en `gc_mi_parte` (tu parte) o en el primer pagador? (documentar).
- ¿Y para >$1 querés un **bloqueo duro** (hoy NO existe, sería nuevo)? El spec dice "error como hoy", pero hoy es soft.
**Fix propuesto (a confirmar):** umbral ≤$1 → sin warning + absorber delta en `gc_mi_parte`; >$1 → warning (o bloqueo, si lo confirmás). Riesgo: bajo, pero **no avanzo sin tu OK** en este bug.

## BUG 4 — Drawer mobile no cierra al navegar

**Archivo:** `components/navigation/navigation-drawer.tsx`.
**Causa raíz (confirmada):** el `<Sheet>` es **no controlado** (no tiene `open`/`onOpenChange`). Los `NavItemComponent` navegan pero nada cierra el Sheet.
**Fix:** hacer el Sheet **controlado** (`useState open`) y cerrarlo al navegar — vía `onClick` en cada item o un `useEffect` sobre `usePathname()`. El drawer es `md:hidden` / mobile, así que no afecta desktop. Riesgo: bajo.

---

## BLOQUE 5 — Inventario de tablas (transaccional vs estructural) + orden de deletes

**23 tablas.** Clasificación:

### Estructural — NO borrar
`profiles`, `cuentas`, `tarjetas`, `categorias`, `personas`, `grupos`, `grupo_miembros`, `plantillas_recurrentes`, `feature_flags`, `profesiones_templates` (global, sin user_id).

### Transaccional — DELETE (filtrado por user_id)
`movimientos`, `gastos_compartidos_participantes`, `gastos_grupales_pagadores`, `prestamos`, `prestamos_pagos`, `alertas_silenciadas`, `conversaciones_ia`.

### Pro legacy (vacías post-PR1, incluir por prolijidad)
`clientes`, `servicios_cliente`, `tarifas_historial`, `registros_trabajo`, `pagos_cliente`, `registros_pagos` — ya vacías (migration 023). Se incluyen igual en orden hijos→padres.

### Orden de DELETE (hijos → padres)
1. `gastos_grupales_pagadores` (→ movimientos, grupos)
2. `gastos_compartidos_participantes` (→ movimientos, personas)
3. `prestamos_pagos` (→ prestamos)
4. `registros_pagos` · 5. `tarifas_historial` · 6. `registros_trabajo` · 7. `pagos_cliente` (pro)
8. `movimientos` (→ cuentas/tarjetas/categorias/prestamos/personas)
9. `prestamos` (→ personas) · 10. `servicios_cliente` (pro) · 11. `clientes` (pro)
12. `alertas_silenciadas` · 13. `conversaciones_ia`

### Decisiones del Bloque 5 (a documentar en el script)
- **Saldos:** `cuentas.saldo` es **columna** (saldo inicial). Tras borrar movimientos, el balance = saldo. El spec pide **resetear a 0** → `UPDATE cuentas SET saldo = 0 WHERE user_id = …` (el founder recarga los iniciales por UI con el fix del Bloque 1). ✅ incluir.
- **Campos `inv_*` de cuentas:** son **config de la cuenta** (subtipo, tasa, vencimiento, notas), no transacciones. **Propongo conservarlos** (describen la cuenta, no un movimiento). Documentar en el script como decisión.
- **Deudas de gastos compartidos:** quedan en **0** al borrar `gastos_compartidos_participantes` (pendientes) + `gastos_grupales_pagadores`. ✅
- Envuelto en `BEGIN; … COMMIT;` con placeholder `:user_id` (o bloque `DO`), y `SELECT count(*)` de verificación comentados. **NO ejecutar.**

---

## Resumen para el checkpoint
| Bug | Estado |
|---|---|
| 1 · saldo inicial editable | ✅ root cause claro, listo |
| 2a · fecha_vencimiento '' + autocalc | ✅ listo |
| 2b · FK cuenta/tarjeta inválida | ✅ listo |
| 2c · débito pide cierre/vto | ✅ listo |
| 3 · tolerancia gasto compartido | 🚩 **pausado** (contradice descripción — necesito tu confirmación) |
| 4 · drawer no cierra | ✅ listo |
| 5 · script reset (escribir) | ✅ inventario y orden listos |

**PARO acá. Necesito tu OK para arrancar (y la aclaración del Bug 3).**
