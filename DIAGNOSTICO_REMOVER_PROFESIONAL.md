# DIAGNÓSTICO — Remover Profesional (PASO 0)

> Generado antes de tocar código productivo, según `SPEC_PR_REMOVER_PROFESIONAL.md`.
> **Rama:** `feat/remover-profesional` (creada desde `main` actualizado a `ecb29ef`).
> **Estado:** 🔴 **PARADO — múltiples stop conditions disparadas. NO se implementó nada.**

---

## ⚠️ TL;DR — Por qué paré

El spec asumía que "Profesional" era un módulo aislado (rutas `/clientes` + tablas `clientes`/`servicios`/`cobros` que se limpian con `TRUNCATE CASCADE`). **La realidad es distinta en 4 puntos que disparan stop conditions:**

1. 🔴 **`TRUNCATE clientes CASCADE` borraría TODOS tus movimientos personales.** `movimientos` y `plantillas_recurrentes` tienen foreign keys hacia `clientes`/`servicios_cliente`. En Postgres, `TRUNCATE ... CASCADE` **trunca toda tabla que referencia**, no respeta el `ON DELETE SET NULL`. Resultado: pérdida total de datos personales. Esto contradice directamente la instrucción "Migration 023 debe usar TRUNCATE CASCADE".
2. 🔴 **Componentes PERSONALES importan código profesional.** Borrar los módulos pro rompe la compilación de `dashboard/page.tsx`, `movimiento-editor.tsx`, `movimientos-client.tsx`, `registrar-pago-modal.tsx` — páginas/componentes centrales del flujo personal.
3. 🔴 **El modelo de datos no es el que dice el spec.** No existe tabla `cobros` ni `servicios`. Las tablas reales son 6: `clientes`, `servicios_cliente`, `tarifas_historial`, `registros_trabajo`, `pagos_cliente`, `registros_pagos`. Y existe un eje adicional `movimientos.ambito = "Personal"|"Profesional"` que el spec no menciona.
4. 🟠 **`profile.modo` se usa en >15 lugares** (stop condition #6 del spec).

Todas estas son stop conditions explícitas del spec (líneas 114, 249-255) y de tus reglas críticas. Necesito tu decisión antes de seguir.

---

## 1. Inventario de rutas profesionales

Única rama de rutas exclusivamente profesional: **`app/(app)/clientes/`**. **No existen** rutas `importar/`, `cobros/` ni `servicios/`.

| Path | Tipo | Qué hace |
|------|------|----------|
| `app/(app)/clientes/page.tsx` | Server page | `getClientes(true)` → lista de clientes |
| `app/(app)/clientes/_components/clientes-client.tsx` | Client | Grid, archivar/desarchivar, editor |
| `app/(app)/clientes/_components/cliente-editor.tsx` | Client | Form crear/editar cliente + sub-clientes |
| `app/(app)/clientes/[id]/page.tsx` | Server page (**ruta dinámica `[id]`**) | `getCliente` + `getServicios` + `cuentas` |
| `app/(app)/clientes/[id]/_components/cliente-detalle-client.tsx` | Client | Contenedor de tabs |
| `app/(app)/clientes/[id]/_components/saldo-tab.tsx` | Client | `getRegistros`, `getPagos` |
| `app/(app)/clientes/[id]/_components/servicios-tab.tsx` | Client | CRUD servicios |
| `app/(app)/clientes/[id]/_components/pagos-tab.tsx` | Client | Gestión de pagos |
| `app/(app)/clientes/[id]/_components/registros-tab.tsx` | Client | Registros de trabajo |

No hay `layout.tsx` propio en `clientes/`; usa el layout compartido `app/(app)/layout.tsx`.

## 2. Inventario de componentes profesionales

- **No existen** `components/clientes/*`, `components/servicios/*`, `components/cobros/*`, ni `components/registros-tab/*`. Todos los componentes pro viven co-localizados bajo `app/(app)/clientes/_components/` y `app/(app)/clientes/[id]/_components/` (9 archivos, listados arriba).
- No hay archivos marcados `pro-only`/`profesional-only`.

**Componentes MIXTOS** (personales con ramas profesionales embebidas — NO se pueden borrar, hay que editarlos):

| Archivo | Líneas con lógica pro |
|---------|----------------------|
| `app/(app)/movimientos/_components/movimiento-editor.tsx` | L16,21 (imports pro), L81-88, L156, L315-383, L506-514, L612-613, L660-664, L724-763 |
| `app/(app)/movimientos/_components/movimientos-client.tsx` | L11, L33-45, L484-497, L663-830 (badges cliente/servicio) |
| `app/(app)/movimientos/_components/registrar-pago-modal.tsx` | L11,14 (imports `pagos.ts`) — modal de cobro |
| `app/(app)/movimientos/_components/generar-pendientes-modal.tsx` | L19, L132-134 |
| `app/(app)/captura/_components/revision-modal.tsx` | L21, L94-96, L170-172, L237-238, L326 |
| `app/(app)/captura/_components/captura-form-page.tsx` | L12, L17, L26 (prop `clientes`) |
| `components/captura/captura-form.tsx` | L52, L65, L298 (prop `clientes`) |
| `components/movimientos-recurrentes/movimientos-recurrentes-page-content.tsx` | L32-42, L59-165, L298-362 |
| `app/(app)/dashboard/_components/dashboard-client.tsx` | L110, L319-353 (`BloqueProfesional`), L510-551, L724-727 |

## 3. Inventario de server actions profesionales

En `lib/supabase/actions/`:

| Archivo | Tablas | Ámbito |
|---------|--------|--------|
| `clientes.ts` | `clientes`, `registros_trabajo`, `pagos_cliente` | Profesional puro |
| `servicios.ts` | `servicios_cliente`, `tarifas_historial` | Profesional puro |
| `registros.ts` | `registros_trabajo`, `servicios_cliente`, `pagos_cliente` | Profesional puro |
| `pagos.ts` | `pagos_cliente`, `registros_trabajo`, **`movimientos`**, `cuentas` | 🟠 **MIXTO** — escribe en `movimientos` con `ambito:"Profesional"`; lo usa el flujo personal |

**No existe `cobros.ts`** (los "cobros" = `pagos.ts` + tabla `pagos_cliente`).

Actions personales con lógica pro embebida (editar, no borrar):
- `movimientos.ts` — L34-35 (join clientes/servicios), L52, L74, L94-95 (persiste `ambito`/`cliente_id`/`servicio_id`)
- `movimientos-types.ts` — L13 (`AMBITOS`), L19, L39-40, L52
- `plantillas.ts` — L14-16, L192-194

**Módulos `lib/domain/` exclusivamente profesionales (eliminar completos):**
- `lib/domain/calcularSaldoCliente.ts`
- `lib/domain/calcularTarifaVigente.ts`
- `lib/domain/calcularMontoRegistro.ts`
- `lib/domain/asignarPagoFIFO.ts` (usado por `registrar-pago-modal.tsx`)

**Componente que vive en carpeta personal pero es 100% pro (eliminar):** `app/(app)/movimientos/_components/registrar-pago-modal.tsx` — solo lo usa `movimiento-editor.tsx` en el branch Profesional.

## 4. Inventario de prompts y catálogos profesionales

Solo 3 archivos en `lib/ai/`: `prompts/interpretMovement.ts`, `prompts/catalogoDinamico.ts`, `config.ts`.

- **`interpretMovement.ts`** — entrelazado **MODERADO**. Bloques de texto pro son extraíbles (L161-181 "ÁMBITO DEL MOVIMIENTO", L194-198 "CLIENTES ACTIVOS"/"SERVICIOS"), pero el tipo de salida `ParsedMovimiento` (L17-46) tiene 3 campos pro **interleaved** con los personales: `ambito` (L19), `cliente_id` (L20), `servicio_id` (L21), replicados en el JSON de salida (L242-244). Esos campos los consumen `captura-form.tsx` y `revision-modal.tsx` → tocar el tipo se propaga. No es rewrite total, pero toca tipo + 2 componentes + la ruta.
- **`catalogoDinamico.ts`** — 100% personal, sin cambios.
- **`app/api/interpret/route.ts`** — L28, L49-60, L76-98 cargan `clientes`/`servicios_cliente` para el prompt (quirúrgicamente removible).
- **`lib/templates/catalogos.ts`** — categorías seed pro: L147-156 "Profesional" (Egreso) + subcategorías, L178-180 "Honorarios profesionales" (Ingreso). Recorte local de array. (Ambiguas, NO pro-only: "Fiscales", "Comisiones", "Ventas" — las usa también un personal/monotributista.)

**Valoración:** el intérprete NO requiere rewrite total, pero sí toca tipos compartidos + 2 componentes. Alcance moderado.

## 5. Inventario de referencias a `profile.modo`

**🟠 Stop condition #6 del spec (>15 lugares) — SE SUPERA.** ~15 sitios de lógica/UI + ~11 sitios de tipo/definición, en ~15 archivos.

**Lógica/UI (branches reales):**

| # | Archivo:línea | Uso |
|---|--------------|-----|
| 1 | `lib/navigation/get-nav-items.ts:37-39` | push item "Profesional" si prof/ambos |
| 2 | `lib/navigation/get-nav-items.ts:26-27` | entrada `modo` |
| 3 | `components/navigation/mobile-bottom-nav.tsx:19-22` | slot 4 = clientes vs balances |
| 4 | `components/navigation/navigation-drawer.tsx:16-21` | Balances va al drawer si prof/ambos |
| 5 | `components/navigation/desktop-sidebar.tsx:18` | filtra items (indirecto) |
| 6 | `app/(app)/layout.tsx:33` | `const modo = profile.modo ?? "personal"` |
| 7 | `app/(app)/dashboard/page.tsx:34-35` | `esProf = modo === "profesional"\|"ambos"` |
| 8 | `app/(app)/dashboard/page.tsx:85` | `if (esProf)` fetch clientes |
| 9 | `app/(app)/dashboard/page.tsx:226` | `if (esProf)` bloque profesional |
| 10 | `dashboard/_components/dashboard-client.tsx:647` | `esProf = perfil.modo !== "personal"` |
| 11 | `dashboard/_components/dashboard-client.tsx:668,725-727` | render `BloqueProfesional` |
| 12 | `components/ajustes/ajustes-page-content.tsx:57-58` | `showProfesion` |
| 13 | `app/onboarding/page.tsx:73,167-192` | Step 3 pregunta modo |

**Tipos/definiciones del enum** (~11): `types/supabase.ts:21,32,43`; `get-nav-items.ts:26`; `mobile-bottom-nav.tsx:9`; `desktop-sidebar.tsx:12`; `navigation-drawer.tsx:11`; `ajustes.ts:9`; `createProfile.ts:75`; `ajustes-page-content.tsx:23`; `dashboard-client.tsx:51`.

**Defaults/escritura:** onboarding default = **`"ambos"`** (¡no personal!) en `onboarding/page.tsx:58`. Constraint DB `001_schema.sql:11` es nullable **sin default** (perfiles viejos pueden ser NULL → código lo trata como personal).

## 6. Análisis de navegación

- `get-nav-items.ts:32` — **"Balances" ya está siempre en `main`**. La única dependencia de modo es L37-39 (item "Profesional" → `/clientes`).
- `mobile-bottom-nav.tsx:19-22` — slot 4: si prof/ambos → `/clientes`, si no → `/balances`.
- `navigation-drawer.tsx:20` — cuando prof/ambos, "Balances" se mueve al drawer (porque el slot lo ocupa Profesional).
- `desktop-sidebar.tsx:18` — sin condicional directo; depende de `getNavItems`.
- `mango-ai-button.tsx` — ✅ CONFIRMADO no usa `modo`, solo `asistenteNombre`. **No se toca** (coincide con decisión E1).

## 7. Análisis de /ajustes

**SÍ hay select de modo.** `components/ajustes/ajustes-page-content.tsx`:
- L15-19 `MODOS = [personal, profesional, ambos]`, L23 schema zod, L51 default, L57-58 `showProfesion`.
- **L101-116 el `<NamedSelect>` "Modo de uso"**; L118-137 bloque "Área profesional" (condicionado).
- Persiste vía `lib/supabase/actions/ajustes.ts:9,25`.
- `app/(app)/ajustes/page.tsx:10-18` hace fetch de `profesiones_templates` para poblar el select → ya no necesario al remover.

## 8. Análisis de /onboarding

**Wizard de 4 pasos** (`TOTAL_STEPS = 4`). `app/onboarding/page.tsx`:
- Paso 1: nombre. **Paso 2: Profesión** (L138-165, lista `PROFESIONES`). **Paso 3: Modo** (L167-192, `MODOS` L42-46). Paso 4: asistente.
- **L58 default `modo:"ambos"`** + `profesion:""` (L57); L72-73 validación de avance.
- Escribe vía `createProfile` (L82) → `createProfile.ts:74-75,98-99`.
- ⚠️ `createProfile.ts` además agrega **categorías profesionales por área** (`CATEGORIAS_POR_AREA` L23-48, aplicadas L144-145).
- Simplificación: eliminar pasos 2 y 3, `TOTAL_STEPS`→2, forzar `modo:"personal"`/`profesion:""`, quitar `CATEGORIAS_POR_AREA`.

## 9. Tablas DB afectadas — 🔴 EL PROBLEMA CRÍTICO

**No existe tabla `cobros`.** Las 6 tablas exclusivamente profesionales son:
`clientes`, `servicios_cliente`, `tarifas_historial`, `registros_trabajo`, `pagos_cliente`, `registros_pagos`.
Migration más alta actual: **`022`** → la próxima libre es **`023`** ✅.

### Grafo de foreign keys

**🔴 FKs desde tablas PERSONALES → PROFESIONALES (el bloqueo):**

| Tabla PERSONAL | → PRO | ON DELETE | Migration |
|----------------|-------|-----------|-----------|
| `movimientos.cliente_id` | `clientes(id)` | SET NULL | `007:41` |
| `movimientos.servicio_id` | `servicios_cliente(id)` | SET NULL | `010:20` |
| `plantillas_recurrentes.cliente_id` | `clientes(id)` | SET NULL | `020:6` |
| `plantillas_recurrentes.servicio_id` | `servicios_cliente(id)` | SET NULL | `020:7` |

**Por qué `TRUNCATE CASCADE` es catastrófico:** en PostgreSQL, `TRUNCATE clientes CASCADE` **trunca por completo cualquier tabla que la referencie** — ignora el `ON DELETE SET NULL` (eso solo aplica a `DELETE`). Por lo tanto:

```
TRUNCATE clientes CASCADE
  → trunca movimientos (FK cliente_id)          ← TODOS tus movimientos personales
  → trunca plantillas_recurrentes (FK cliente_id) ← todas tus plantillas
```

**Esto borra tu contabilidad personal completa.** Es exactamente la stop condition #1 del spec (líneas 114, 249) y tu regla crítica #6.

**FKs pro → personal (dirección inversa, no problemática para el truncate):** `pagos_cliente.cuenta_destino_id → cuentas` (SET NULL, 009:150), `pagos_cliente.movimiento_id → movimientos` (SET NULL, 009:152). Truncar las pro NO afecta cuentas/movimientos.

**Columnas profesionales injertadas en tablas personales** (a limpiar con cuidado, NO truncate): `movimientos.cliente_id`, `movimientos.servicio_id`, `movimientos.ambito`, `plantillas_recurrentes.cliente_id/servicio_id/ambito/tipo`.

### Tipos derivados en `types/supabase.ts` (L962-967)

Aliases exportados: `Cliente` (L962), `ServicioCliente` (L963), `TarifaHistorial` (L964), `RegistroTrabajo` (L965), `RegistroPago` (L966), `PagoCliente` (L967). (No hay `Cobro` ni `Servicio`.) Antes de borrarlos hay que grepear consumidores.

## 10. Plan de implementación propuesto (REVISADO respecto del spec)

El orden del spec sigue siendo válido, pero la migration cambia radicalmente y hay refactors de componentes mixtos que el spec no contemplaba. Ver "Opciones" abajo.

---

## 🔴 STOP CONDITIONS DISPARADAS — resumen

| # | Stop condition (spec/reglas) | ¿Disparada? | Detalle |
|---|------------------------------|-------------|---------|
| 1 | FKs de tablas personales → profesionales | ✅ **SÍ** | `movimientos` y `plantillas_recurrentes` → `clientes`/`servicios_cliente` |
| 2 | Componentes personales importan profesional | ✅ **SÍ** | `dashboard/page.tsx`, `movimiento-editor.tsx`, `movimientos-client.tsx`, `registrar-pago-modal.tsx` |
| 3 | Intérprete entretejido | 🟠 Parcial | Moderado: tipo compartido + 2 componentes, no rewrite total |
| 5 | Entidades pro no anticipadas | ✅ **SÍ** | 6 tablas reales (no `cobros`/`servicios`); eje `movimientos.ambito` |
| 6 | `profile.modo` en >15 lugares | ✅ **SÍ** | ~15 lógica + ~11 tipos |
| — | `TRUNCATE CASCADE` seguro (premisa del spec) | ❌ **FALSA** | Borraría datos personales |

---

## Decisiones que necesito de vos antes de implementar

### A) Migration 023 — el TRUNCATE CASCADE NO se puede usar tal cual

Tu instrucción fue "TRUNCATE CASCADE, no drop tables". Pero con las FKs actuales, `TRUNCATE clientes CASCADE` **borra tus movimientos personales**. Opciones seguras (todas respetan "no drop tables"):

- **A1:** primero `ALTER TABLE movimientos DROP COLUMN cliente_id, servicio_id, ambito;` y lo mismo en `plantillas_recurrentes` (elimina las FKs entrantes), luego `TRUNCATE` de las tablas pro en orden hoja→raíz. Limpio pero requiere regenerar `types/supabase.ts`.
- **A2:** dropear solo las 4 constraints FK (dejando las columnas), setear a NULL, y `TRUNCATE`. Deja columnas huérfanas en movimientos.
- **A3 (recomendada):** `UPDATE ... SET NULL` para desvincular + `DELETE FROM` en orden hoja→raíz, sin `TRUNCATE` ni `DROP`. Respeta la regla "no drop tables/columns", no toca el schema (no hay que regenerar tipos), y es 100% seguro. Draft:

```sql
-- supabase/migrations/023_remove_profesional_data.sql
-- 1. Todos los perfiles a personal
UPDATE profiles SET modo = 'personal' WHERE modo IS NOT NULL;

-- 2. Desvincular columnas FK personales → pro (evita cascada destructiva)
UPDATE movimientos            SET cliente_id = NULL, servicio_id = NULL, ambito = 'Personal';
UPDATE plantillas_recurrentes SET cliente_id = NULL, servicio_id = NULL, ambito = 'Personal';
UPDATE pagos_cliente          SET movimiento_id = NULL;  -- corta el ciclo pro→personal

-- 3. Vaciar tablas pro en orden hijas→padres (SIN CASCADE)
DELETE FROM registros_pagos;
DELETE FROM tarifas_historial;
DELETE FROM registros_trabajo;
DELETE FROM pagos_cliente;
DELETE FROM servicios_cliente;
DELETE FROM clientes;
```

### B) `movimientos.ambito` — eje que el spec no anticipó

¿Eliminamos el concepto de ámbito de movimientos (todo pasa a implícitamente personal, se dropea la columna `ambito` y los campos cliente/servicio), o lo dejamos como está y solo removemos la sección de gestión de clientes? Esto define cuánto refactor de `movimiento-editor.tsx`/`movimientos-client.tsx`/dashboard hay que hacer.

### C) Alcance del refactor de componentes mixtos

Borrar `pagos.ts`, `clientes.ts`, `servicios.ts` rompe compilación de componentes personales. ¿Refactorizamos esos componentes para quitar las ramas pro (más trabajo, más limpio), en este mismo PR? Confirma que sí, dado que es inevitable para que `npm run build` pase.

**No toco nada más hasta tu luz verde sobre A, B y C.**
