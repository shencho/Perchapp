# REPORTE FINAL — PR "Remover Profesional"

**Rama:** `feat/remover-profesional`
**Estado:** ✅ **COMPLETO — 11/11 bloques, build verde, sin push (como se pidió)**
**Base:** `ecb29ef` (merge navegación) → **HEAD:** `8790a07`

---

## Tabla de bloques

| # | Bloque | Estado | Commit |
|---|--------|--------|--------|
| 1 | Intérprete: ParsedMovimiento + PromptParams + route + cadena captura | ✅ | `9fa95d0` |
| 2 | Movimientos actions: joins/filtro/campos pro | ✅ | `d59c19a` |
| 3 | Movimientos UI: filtroAmbito, columna/badges, branch pro | ✅ | `f05ecb3` |
| 4 | movimiento-editor: ámbito/cliente/servicio + pago vinculado | ✅ | `1d3235e` |
| 5 | Plantillas: ambito/cliente_id/servicio_id + recurrentes | ✅ | `bdde6b5` |
| 6 | Nav: item Profesional + condicional modo, Balances fijo | ✅ | `61f577f` |
| 7 | Dashboard: bloque profesional, esProf, ámbito | ✅ | `c057273` |
| 8 | Ajustes + onboarding + createProfile | ✅ | `0a99412` |
| 9 | Catálogo semilla: entradas profesionales | ✅ | `9930ce2` |
| 10 | Eliminar archivos pro (rutas/actions/domain/tipos) | ✅ | `f09be0a` |
| 11 | Migration 023 remove profesional data | ✅ | `8790a07` |

---

## Hashes de los 11 commits (orden cronológico)

```
9fa95d0  BLOQUE 1  refactor(interprete)
d59c19a  BLOQUE 2  refactor(movimientos)
f05ecb3  BLOQUE 3  refactor(movimientos-ui)
1d3235e  BLOQUE 4  refactor(editor)
bdde6b5  BLOQUE 5  refactor(plantillas)
61f577f  BLOQUE 6  fix(nav)
c057273  BLOQUE 7  refactor(dashboard)
0a99412  BLOQUE 8  refactor(ajustes/onboarding)
9930ce2  BLOQUE 9  chore(catalogo)
f09be0a  BLOQUE 10 feat(rm-pro)
8790a07  BLOQUE 11 feat(db) migration 023
```

---

## git log --oneline -15

```
8790a07 feat(db): migration 023 remove profesional data
f09be0a feat(rm-pro): eliminar rutas, componentes, actions y domain profesionales
9930ce2 chore(catalogo): eliminar categorías profesionales del catálogo semilla
0a99412 refactor(ajustes/onboarding): quitar modo/profesión y categorías por área
c057273 refactor(dashboard): quitar bloque profesional, esProf y ámbito
61f577f fix(nav): quitar item Profesional y condicional de modo, Balances fijo
bdde6b5 refactor(plantillas): quitar ambito/cliente_id/servicio_id de plantillas y recurrentes
1d3235e refactor(editor): quitar ámbito/cliente/servicio + pago vinculado del movimiento-editor
f05ecb3 refactor(movimientos-ui): quitar filtro/columna/badges ambito y branch pro
d59c19a refactor(movimientos): quitar joins/filtro/campos pro en actions y query
9fa95d0 refactor(interprete): quitar campos pro de ParsedMovimiento/PromptParams y adaptar route + cadena captura
ecb29ef Merge pull request #1 from shencho/feat/navegacion-reformada
63523ee PASO 5.5g: excluir archivos estaticos del middleware (proxy.ts)
4b693c5 PASO 5.5f: agregar items mobile-inaccesibles al NavigationDrawer
e13933d PASO 5.5e: fix overflow horizontal mobile en headers de pagina
```

---

## npm run build (output final)

```
✓ Compiled successfully in 10.4s
  Running TypeScript ...
  Finished TypeScript in 9.2s ...
  Collecting page data using 11 workers ...
✓ Generating static pages using 11 workers (22/22) in 351ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /ajustes
├ ƒ /api/interpret
├ ƒ /auth/callback
├ ƒ /balances
├ ƒ /captura
├ ƒ /cash-flow
├ ƒ /categorias
├ ƒ /cuentas
├ ƒ /cuentas/[id]
├ ƒ /cuentas/tarjetas/[id]
├ ƒ /dashboard
├ ○ /login
├ ƒ /movimientos
├ ƒ /movimientos-recurrentes
├ ○ /onboarding
├ ƒ /onboarding/categorias-sugeridas
├ ƒ /personas
├ ƒ /prestamos
├ ƒ /prestamos/[id]
├ ○ /signup
└ ƒ /tarjetas

ƒ Proxy (Middleware)
```

**`/clientes` y `/clientes/[id]` ya no existen** (22 rutas vs 24 en el baseline). Build **verde en los 11 commits** (cada bloque se buildeó antes de commitear).

---

## Archivos eliminados (BLOQUE 10) — 18 archivos

**Rutas** (`app/(app)/clientes/**`):
- `clientes/page.tsx`, `clientes/_components/clientes-client.tsx`, `clientes/_components/cliente-editor.tsx`
- `clientes/[id]/page.tsx`, `clientes/[id]/_components/{cliente-detalle-client,saldo-tab,servicios-tab,pagos-tab,registros-tab}.tsx`

**Componente:** `movimientos/_components/registrar-pago-modal.tsx`

**Server actions:** `lib/supabase/actions/{clientes,servicios,pagos,registros}.ts`

**Domain:** `lib/domain/{calcularSaldoCliente,calcularTarifaVigente,calcularMontoRegistro,asignarPagoFIFO}.ts`

## Archivos creados — 2
- `supabase/migrations/023_remove_profesional_data.sql`
- `REPORTE_FINAL.md`

## Archivos modificados — ~25
interpretMovement.ts, api/interpret/route.ts, revision-modal, captura-form, captura-form-page, captura/page, captura-sheet-content, movimientos.ts, movimientos-types.ts, movimientos/page, movimientos-client, generar-pendientes-modal, movimiento-editor, plantillas.ts, movimientos-recurrentes-page-content, movimientos-recurrentes/page, get-nav-items, mobile-bottom-nav, navigation-drawer, desktop-sidebar, layout, dashboard/page, dashboard-client, ajustes-page-content, ajustes.ts, ajustes/page, onboarding/page, createProfile.ts, catalogos.ts, types/supabase.ts.

---

## Deviations del plan (todas menores, ninguna disparó stop condition)

1. **`DIAGNOSTICO_REMOVER_PROFESIONAL_COMPLEMENTARIO.md` no existía** en el repo. No fue bloqueante: el prompt traía el plan de 11 bloques con líneas exactas y el diagnóstico principal (`DIAGNOSTICO_REMOVER_PROFESIONAL.md`) + SPEC v2 tenían el contexto. Se procedió con esos.

2. **Orden schema pro (AMBITOS + ambito/cliente_id/servicio_id de `movimientos-types.ts`):** el plan lo ubicaba en BLOQUE 2, pero `movimiento-editor` (BLOQUE 4) todavía consumía esos símbolos. Para no romper builds intermedios se movió ese recorte a BLOQUE 4, junto con el editor que los usa. BLOQUE 2 sí quitó `MovimientosFiltros.ambito`, joins y campos del insert.

3. **Fixes temporales con TODO** (permitidos por el modo de trabajo), ambos ya resueltos:
   - `revision-modal.tsx`: `ambito: "Personal"` temporal en BLOQUE 1 → removido en BLOQUE 4.
   - `pagos.ts`: cast temporal por campos pro removidos de `MovimientoInput` en BLOQUE 4 → el archivo completo se eliminó en BLOQUE 10.

4. **`movimientos-recurrentes-page-content.tsx` + `movimientos-recurrentes/page.tsx`** no estaban listados literalmente en BLOQUE 5 pero sí en el diagnóstico principal (componentes mixtos). Se integraron a BLOQUE 5 porque son la UI de plantillas.

5. **`.next` stale cache:** tras eliminar `/clientes` (BLOQUE 10), el validador de tipos generado de Next.js referenciaba la ruta borrada. Se limpió `.next` y el rebuild pasó. No es un problema de código.

6. **4 inserts residuales `ambito: "Personal"`** en `ajuste-inversion.ts`, `gastos-compartidos.ts` (x2) y `prestamos-pagos.ts`. Escriben en `movimientos` directamente (no vía `movimientoSchema`). **Se dejaron a propósito:** la migration 023 **no** dropea la columna `ambito` (solo limpia data), así que estos inserts siguen siendo válidos y setean explícitamente "Personal", que es la realidad post-pivot. Fuera del scope de los bloques. Si en el futuro se dropea la columna, habrá que quitarlos.

---

## Migration 023 — recordatorio

⚠️ **NO se ejecutó** (solo se escribió el archivo, como se pidió).
- Usa **UPDATE (desvincular FKs) + DELETE en orden hijas→padres**, envuelto en **BEGIN/COMMIT**.
- **NO usa TRUNCATE CASCADE** (borraría movimientos/plantillas personales).
- **NO dropea tablas ni columnas** — las 6 tablas pro quedan como esqueleto vacío.
- Correr manualmente en **Supabase SQL Editor después del merge**.

---

## Test manual sugerido para validar en la mañana

**Fase A — antes de correr la migration (con `npm run dev`):**

1. `npm run build` → verde (ya confirmado).
2. `/dashboard` → sin item "Profesional" en sidebar desktop; sin bloque Profesional; análisis del mes sin "Por ámbito".
3. Bottom navbar mobile (DevTools responsive) → **slot 4 = Balances** (fijo, ya no Profesional).
4. `/movimientos` → sin filtro "Ámbito", sin columna "Ámbito", sin badges cliente/servicio; los movimientos existentes se ven bien.
5. `/clientes` por URL directa → **404**.
6. `/ajustes` → solo Nombre + Nombre del asistente; **sin select de Modo ni Área profesional**.
7. `/onboarding` (usuario nuevo) → **2 pasos** (Nombre → Asistente); sin pregunta de profesión/modo.
8. Crear movimiento desde `/captura`: frase "pagué la luz 5000" → modal de revisión sin Ámbito/Cliente; confirmar → se guarda OK.
9. Crear movimiento desde el FAB (sheet) → editor sin campo Ámbito/Cliente/Servicio; guardar OK.
10. `/movimientos-recurrentes` → alta de plantilla sin Ámbito/Cliente/Servicio; guardar OK.
11. DevTools console → sin errores rojos.

**Fase B — correr la migration:**

12. Ejecutar `supabase/migrations/023_remove_profesional_data.sql` en Supabase SQL Editor.
13. Verificar los `SELECT count(*)` comentados → todos **0** (clientes, servicios_cliente, tarifas_historial, registros_trabajo, pagos_cliente, registros_pagos).
14. `SELECT modo, count(*) FROM profiles GROUP BY modo;` → todo **personal**.
15. `/movimientos` post-migration → sigue funcionando, movimientos visibles.
16. Crear un movimiento nuevo post-migration → OK.

Si el paso 12 fallara, el `BEGIN/COMMIT` revierte todo sin daños.

---

## Reglas respetadas ✅
❌ Sin push · ❌ Migration NO ejecutada · ❌ `.env.local` intacto · ❌ zona gris del catálogo (Fiscales/Comisiones/Ventas) intacta · ❌ sin TRUNCATE CASCADE · ❌ sin DROP de tablas/columnas desde código · ✅ build verde antes de cada commit · ✅ 1 commit por bloque · ✅ mensajes descriptivos.
