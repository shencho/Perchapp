# SPEC_PR_REMOVER_PROFESIONAL_V2.md

## Objetivo

Eliminar completamente la sección Profesional de MANGO, quedando la app 100% personal. Este PR es parte del pivot a producto vendible B2C.

⚠️ **Este spec REEMPLAZA a `SPEC_PR_REMOVER_PROFESIONAL.md`**. La v1 tenía suposiciones incorrectas que el diagnóstico corrigió.

**Alcance**: eliminar código profesional + refactor de tipos + migration compleja (DELETE en orden + DROP columnas). Los datos históricos NO importan.

**Rama**: `feat/remover-profesional`

**Decisión de scope**: TODO junto en 1 PR (~15-20 commits).

⚠️ **Benja decidió NO hacer backup de DB antes de correr la migration. Decisión consciente.**

---

## Decisiones arquitectónicas (ya tomadas, NO cuestionar)

| Decisión | Resolución |
|----------|-----------|
| Alcance de eliminación | A2 — Eliminar del código completamente |
| profile.modo | B2 — UPDATE a "personal", columna queda |
| Estrategia migration DB | A+B — DELETE en orden + DROP columnas FK en movimientos/plantillas_recurrentes |
| Campo `ambito` | α+β — UPDATE todos a "Personal" + DROP columna |
| Categoría "Profesional" del catálogo semilla | P1 — Eliminar entradas |
| Tipo `ParsedMovimiento` | Refactor — quitar 3 campos pro (`ambito`, `cliente_id`, `servicio_id`) |
| Tablas pro-only | Mantener existencia (NO drop tables), solo DELETE de data |
| Slot 4 mobile navbar | Balances fijo |
| Botón MANGO AI desktop | Sin cambios |
| Backup DB previo | NO |

---

## Contexto crítico del diagnóstico (para NO olvidar durante implementación)

### Tablas profesionales (6, no 3 como asumía el spec v1)

1. `clientes`
2. `servicios_cliente` (nombre correcto, NO "servicios")
3. `tarifas_historial`
4. `registros_trabajo`
5. `pagos_cliente` (NO existe tabla "cobros")
6. `registros_pagos` (pivot)

### Foreign keys críticas

**FKs desde tablas personales → profesionales** (estas causan el problema con TRUNCATE):

| Tabla PERSONAL (col) | → Destino PRO | ON DELETE |
|----------------------|---------------|-----------|
| `movimientos.cliente_id` | `clientes(id)` | SET NULL |
| `movimientos.servicio_id` | `servicios_cliente(id)` | SET NULL |
| `plantillas_recurrentes.cliente_id` | `clientes(id)` | SET NULL |
| `plantillas_recurrentes.servicio_id` | `servicios_cliente(id)` | SET NULL |

⚠️ **CRÍTICO**: `TRUNCATE clientes CASCADE` **borraría por completo** `movimientos` y `plantillas_recurrentes` porque en TRUNCATE el CASCADE es agresivo (no respeta SET NULL). Por eso usamos DELETE en orden + DROP columnas.

### Columnas adicionales a dropear

- `movimientos.ambito` (default 'Personal')
- `plantillas_recurrentes.ambito` o `tipo` (si aplica)

### Tipos derivados en `types/supabase.ts` (líneas 962-967)

- `Cliente` → `clientes`
- `ServicioCliente` → `servicios_cliente`
- `TarifaHistorial` → `tarifas_historial`
- `RegistroTrabajo` → `registros_trabajo`
- `PagoCliente` → `pagos_cliente`
- `RegistroPago` → `registros_pagos`

Estos alias van a quedar exportados pero sin uso en el código. Se pueden dejar (dependen de las tablas que quedan) o eliminarlos también. Decisión: dejarlos por consistencia con la tabla.

### Prompt del intérprete (moderadamente acoplado)

Bloques a modificar en `lib/ai/prompts/interpretMovement.ts`:
- Interface `PromptParams` (L3-15): quitar `clientes`, `servicios`
- Interface `ParsedMovimiento` (L17-46): quitar `ambito`, `cliente_id`, `servicio_id`
- Builder `buildInterpretPrompt`:
  - Quitar destructuring de `clientes`, `servicios` (L112-113)
  - Quitar formateo `clientesStr`, `serviciosStr` (L125-131)
  - Quitar variable `profesionCtx` (L133)
  - Quitar bloque "ÁMBITO DEL MOVIMIENTO" (L161-181)
  - Quitar bloques "CLIENTES ACTIVOS" y "SERVICIOS DISPONIBLES" (L194-198)
  - Quitar en el JSON de salida: `ambito`, `cliente_id`, `servicio_id` (L242-244)

### Archivos consumidores del intérprete a modificar

- `app/api/interpret/route.ts` — quitar queries a `clientes` y `servicios_cliente` (L28, L49-60), quitar parseo (L76-79), quitar `clientes, servicios, profesion` del call al builder (L87-98)
- `components/captura/captura-form.tsx` — quitar uso de `ambito`, `cliente_id`, `servicio_id`
- `app/(app)/captura/_components/revision-modal.tsx` — quitar UI + lógica de `ambito`, `cliente_id`, `servicio_id`

---

## PASO 0 EXTENDIDO — Diagnóstico complementario (ya parcialmente hecho)

El diagnóstico principal ya lo hizo Claude Code en `DIAGNOSTICO_REMOVER_PROFESIONAL.md`. Complementarlo con:

### 1. Inventario de consumidores de tipos pro-only

Grep de cada tipo del punto 9.5 del diagnóstico:

```
grep -rn "Cliente\|ServicioCliente\|TarifaHistorial\|RegistroTrabajo\|PagoCliente\|RegistroPago" --include="*.ts" --include="*.tsx" .
```

Listar imports/usos fuera de:
- `types/supabase.ts`
- Componentes/rutas profesionales que se van a eliminar
- Archivos que están explícitamente en el inventario de eliminación

Si aparece uno en un archivo NO listado como eliminación → **PARÁ y reportá**.

### 2. Verificar consumidores de `movimientos.cliente_id/servicio_id/ambito`

Grep por estos accesos:

```
grep -rn "\.cliente_id\|\.servicio_id\|\.ambito" --include="*.ts" --include="*.tsx" .
```

Filtrar por acceso a movimientos. Listar cada uso con archivo + línea + contexto.

Ejemplo posible: `movimientos-list.tsx` puede filtrar por `mov.ambito === 'Profesional'` para mostrar badge distinto. Si eso pasa, hay que quitar esa lógica.

### 3. Verificar consumidores de `plantillas_recurrentes.cliente_id/servicio_id/ambito`

Mismo enfoque que arriba pero con `plantillas`.

### 4. Verificar componentes que renderizan condicionalmente según `ambito`

Grep de `ambito ===`, `'Profesional'`, `'Personal'` en JSX y lógica.

### 5. Componentes de UI relacionados con profesional

Grep de archivos que contengan:
- `Cliente` como texto en JSX
- `Servicio` como texto en JSX
- `Cobro` (aunque no existe la tabla, puede haber UI que lo mencione)
- `Facturar`

### 6. Prompts + templates

Además de `interpretMovement.ts` (ya analizado), verificar:
- `lib/ai/prompts/catalogoDinamico.ts` — punto 4.3 del diagnóstico dice que es 100% personal, verificar que no filtre por ámbito
- `lib/templates/catalogos.ts` — punto 4.4, identificar líneas exactas a eliminar

### 7. Onboarding + ajustes

- `app/onboarding/*` — buscar pregunta sobre modo/profesión
- `app/(app)/ajustes/*` — buscar toggle de modo, campo profesión

### 8. Plan de implementación paso a paso

Ordenar operaciones:

**Fase A — Código (commits 1-N):**
1. Refactor tipo `ParsedMovimiento` + consumidores (`interpretMovement.ts`, `route.ts`, `captura-form.tsx`, `revision-modal.tsx`)
2. Simplificar nav (`get-nav-items.ts`, `mobile-bottom-nav.tsx`, `desktop-sidebar.tsx`, `navigation-drawer.tsx`)
3. Eliminar rutas `/clientes` y demás pro
4. Eliminar componentes `components/clientes/*`, etc.
5. Eliminar server actions pro
6. Simplificar `/ajustes` (quitar toggle modo)
7. Simplificar onboarding (quitar pregunta modo)
8. Limpiar catálogo semilla (`lib/templates/catalogos.ts`)
9. Cualquier otro archivo del diagnóstico complementario

**Fase B — Migration (commit final):**
10. Escribir `023_remove_profesional_data.sql`
11. Build check
12. Commit final

⚠️ **La migration se ESCRIBE en el PR pero se EJECUTA manualmente por Benja después del merge, en producción.**

### ⚠️ STOP CONDITIONS del PASO 0 extendido

PARAR y reportar si:
- Los tipos pro aparecen en archivos NO listados como eliminación
- `movimientos.cliente_id`, `movimientos.servicio_id`, `movimientos.ambito` se usan para lógica de negocio crítica (no solo mostrar UI)
- Aparecen componentes personales que dependen fuertemente de lógica profesional
- El intérprete rompe test manual básico si se sacan los 3 campos

---

## Migration 023 completa (contenido)

`supabase/migrations/023_remove_profesional_data.sql`:

```sql
-- PR Remover Profesional — Migration 023
-- 
-- CRÍTICO: NO usar TRUNCATE CASCADE en clientes/servicios_cliente
-- porque destruiría movimientos y plantillas_recurrentes por completo.
-- Usar DELETE en orden de dependencias (respeta SET NULL en las FKs).
--
-- Orden: hijas → padres, con ciclo suave entre registros_trabajo↔pagos_cliente
-- resuelto por SET NULL en ambas direcciones.

BEGIN;

-- Paso 1: Setear todos los profiles a modo "personal"
UPDATE profiles SET modo = 'personal' WHERE modo IS NOT NULL;

-- Paso 2: Setear todos los movimientos a ambito "Personal" antes de dropear la columna
UPDATE movimientos SET ambito = 'Personal' WHERE ambito IS DISTINCT FROM 'Personal';

-- Paso 3: DELETE en orden de dependencias (hijas → padres)
DELETE FROM registros_pagos;
DELETE FROM tarifas_historial;
DELETE FROM registros_trabajo;
DELETE FROM pagos_cliente;
DELETE FROM servicios_cliente;
DELETE FROM clientes;

-- Verificar que se borró todo (los COUNT deben dar 0)
-- SELECT count(*) FROM clientes; -- Esperado: 0
-- SELECT count(*) FROM servicios_cliente; -- Esperado: 0
-- SELECT count(*) FROM tarifas_historial; -- Esperado: 0
-- SELECT count(*) FROM registros_trabajo; -- Esperado: 0
-- SELECT count(*) FROM pagos_cliente; -- Esperado: 0
-- SELECT count(*) FROM registros_pagos; -- Esperado: 0

-- Paso 4: DROP columnas FK profesionales de tablas personales
-- movimientos:
ALTER TABLE movimientos DROP COLUMN IF EXISTS cliente_id;
ALTER TABLE movimientos DROP COLUMN IF EXISTS servicio_id;
ALTER TABLE movimientos DROP COLUMN IF EXISTS ambito;

-- plantillas_recurrentes:
ALTER TABLE plantillas_recurrentes DROP COLUMN IF EXISTS cliente_id;
ALTER TABLE plantillas_recurrentes DROP COLUMN IF EXISTS servicio_id;
-- verificar si es 'ambito' o 'tipo' con contexto profesional en 020
ALTER TABLE plantillas_recurrentes DROP COLUMN IF EXISTS ambito;

-- pagos_cliente tiene FKs a cuentas.id y movimientos.id.
-- Como pagos_cliente queda vacía después del DELETE, esas FKs no son problema.
-- La tabla queda como esqueleto por si el día de mañana se quiere revivir profesional.

COMMIT;
```

⚠️ **NO ejecutar desde Claude Code**. Solo escribir el archivo. Benja la corre manualmente en Supabase SQL Editor **después del merge**.

⚠️ **Ejecución envuelta en BEGIN/COMMIT** para que si algo falla en medio, se revierta todo.

---

## Tests mentales (casos de borde)

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Usuario existente con modo="personal" | Sin cambios visibles |
| 2 | Usuario con modo="profesional" o "ambos" | Migration lo pasa a personal. UI = personal |
| 3 | Usuario nuevo | Onboarding sin pregunta de modo. Default personal |
| 4 | Bottom navbar mobile | Balances fijo en slot 4 |
| 5 | Sidebar desktop | Sin item Profesional |
| 6 | Drawer | Sin lógica condicional |
| 7 | `/clientes` por URL directa | 404 |
| 8 | Intérprete con frase "pagué la luz 5000" | Devuelve ParsedMovimiento sin campos pro |
| 9 | Intérprete con frase "cobré 30000 a Juan" | Interpreta como ingreso genérico (sin cliente asociado) |
| 10 | Movimientos existentes con `ambito='Profesional'` pre-migration | Post-migration ya NO tienen esa distinción (columna droppeada) |
| 11 | Plantillas recurrentes con `cliente_id` NOT NULL | Post-migration columna droppeada, plantillas siguen funcionando sin el vínculo |
| 12 | UI de movimientos | No muestra ambito ni cliente/servicio asociado |
| 13 | Build TypeScript | Pasa OK después del refactor de tipos |
| 14 | Nueva creación de movimiento desde `/captura` | Funciona sin campos pro |
| 15 | Creación de movimiento desde el sheet (FAB) | Funciona sin campos pro |

---

## Validación local (Benja, post Claude Code)

### Fase A — Antes de correr migration 023

| # | Test | Esperado |
|---|------|----------|
| 1 | `npm run build` | OK, sin errores TypeScript |
| 2 | Levantar dev server | OK |
| 3 | `/dashboard` | Sin item Profesional en sidebar |
| 4 | `/movimientos` | Movimientos existentes se muestran (aunque tengan ambito='Profesional' en DB, la UI no lo distingue) |
| 5 | Mobile DevTools bottom navbar | Slot 4 = Balances fijo |
| 6 | `/ajustes` | Sin select de modo |
| 7 | `/clientes` URL directa | 404 |
| 8 | Intérprete con frase compleja | Devuelve JSON sin ambito/cliente_id/servicio_id |
| 9 | Crear movimiento desde sheet | Funciona, se guarda con `cliente_id=null`, `servicio_id=null`, `ambito='Personal'` |
| 10 | DevTools Console | Sin errores rojos |

### Fase B — Después de correr migration 023

| # | Test | Esperado |
|---|------|----------|
| 11 | Correr migration 023 en Supabase SQL Editor | Ejecuta sin errores dentro del BEGIN/COMMIT |
| 12 | Verificar SELECT count(*) de cada tabla pro | Todos = 0 |
| 13 | Verificar columnas droppeadas | `\d movimientos` NO muestra cliente_id/servicio_id/ambito |
| 14 | Verificar columnas droppeadas | `\d plantillas_recurrentes` NO muestra cliente_id/servicio_id/ambito |
| 15 | Verificar profiles | Todos con `modo='personal'` |
| 16 | `/movimientos` post-migration | Sigue funcionando, movimientos existentes visibles |
| 17 | Crear movimiento nuevo | Funciona, se guarda OK sin los campos pro (porque ya no existen) |
| 18 | Plantillas recurrentes | Siguen funcionando sin campos pro |

⚠️ **Si el test 11 falla**, la migration queda revertida por BEGIN/COMMIT. Sin daños.

---

## Stop conditions para Claude Code

PARAR y reportar si:

1. En el diagnóstico complementario aparecen tipos pro en archivos NO anticipados
2. Existen componentes personales que **crashean** al quitar los campos pro (no solo dependen visualmente)
3. Build falla y no se puede arreglar en <30 min
4. El intérprete rompe funcionalidad básica personal al quitar campos pro
5. Aparecen tablas o entidades profesionales no detectadas en el diagnóstico principal
6. `profile.modo` se usa en más de 15 lugares con lógica de negocio compleja
7. Cualquiera de los 15 tests mentales falla
8. Durante el refactor del tipo ParsedMovimiento se necesita cambiar la firma de una función del intérprete o del API que rompe consumidores no listados

---

## Reglas para Claude Code (no negociables)

| Regla | Detalle |
|-------|---------|
| ❌ NO push automático | Solo commit local en `feat/remover-profesional` |
| ❌ NO correr migrations | Solo escribir archivo `.sql`, Benja corre manualmente |
| ❌ NO tocar `.env.local` | Fuera de scope |
| ❌ NO renombrar archivos con "perchita" | Backlog futuro |
| ❌ NO modificar UI personal | Solo eliminar profesional, no rediseñar |
| ❌ NO drop tablas | Solo DELETE + DROP columnas |
| ❌ NO tocar backup de DB | Benja decidió no hacer, no insistir |
| ❌ NO usar TRUNCATE CASCADE | Rompe data personal, ver diagnóstico 9.3 |
| ✅ Build debe pasar antes de cada commit atómico | `npm run build` verde |
| ✅ Reportar antes/después con tabla por cada commit | Mismo formato que PR Navegación |
| ✅ Generar diagnóstico complementario primero | Antes de tocar código productivo |
| ✅ Envolver migration en BEGIN/COMMIT | Para reversibilidad si falla |
| ✅ Si dudás | Parar y preguntar |
| ✅ Commits atómicos ordenados | Uno por fase del plan de implementación |

---

## Estructura sugerida de commits (referencia, no rígida)

| Commit | Descripción |
|--------|-------------|
| 1 | docs: agregar spec y diagnóstico complementario del PR |
| 2 | refactor(interprete): quitar campos pro de ParsedMovimiento y PromptParams |
| 3 | refactor(interprete): adaptar route.ts, captura-form.tsx, revision-modal.tsx |
| 4 | fix(nav): balances fijo en slot 4 mobile, sin condicional de modo |
| 5 | fix(nav): quitar item Profesional del sidebar y drawer |
| 6 | feat(rm-pro): eliminar rutas /clientes y afines |
| 7 | feat(rm-pro): eliminar componentes profesionales |
| 8 | feat(rm-pro): eliminar server actions profesionales |
| 9 | fix(ajustes): quitar toggle de modo |
| 10 | fix(onboarding): quitar pregunta de modo |
| 11 | chore(catalogo): limpiar entradas profesionales del catálogo semilla |
| 12 | chore: DIAGNOSTICO_REMOVER_PROFESIONAL_COMPLEMENTARIO.md |
| 13 | feat(db): migration 023 remove profesional data |

---

## Commit final (mensaje del PR)

```
feat: remover Profesional (pivot a producto 100% personal)

Fase 1 del pivot estratégico de MANGO a producto vendible B2C.

Código eliminado:
- Rutas: /clientes, /clientes/[id], /importar (si aplica)
- Componentes: components/clientes/, etc.
- Server actions: clientes, cobros, servicios profesionales
- Prompts profesionales del intérprete (bloques ámbito, clientes, servicios)
- Templates de catálogo profesional

Refactor:
- ParsedMovimiento: quitar campos ambito/cliente_id/servicio_id
- PromptParams: quitar clientes/servicios
- Consumidores del intérprete (route.ts, captura-form, revision-modal)
  adaptados al nuevo tipo

Nav simplificada:
- Slot 4 mobile navbar: Balances fijo
- Sidebar desktop: sin item Profesional
- Drawer: sin lógica condicional de Balances según modo
- Ajustes: sin select de modo
- Onboarding: sin pregunta de modo

DB (migration 023):
- UPDATE profiles SET modo='personal'
- UPDATE movimientos SET ambito='Personal' antes de DROP
- DELETE en orden de las 6 tablas profesionales (respeta ON DELETE SET NULL)
- DROP columnas movimientos.cliente_id/servicio_id/ambito
- DROP columnas plantillas_recurrentes.cliente_id/servicio_id/ambito
- Tablas profesionales quedan (sin data) por si acaso
- Envuelto en BEGIN/COMMIT para reversibilidad

profile.modo: columna queda pero código la ignora.

Próximas fases:
- Fase 2: mejoras de MANGO AI (intérprete v2)
- Fase 3: WhatsApp bot con n8n
- Sistema de planes/suscripciones (cuando esté maduro)

PASO 0: DIAGNOSTICO_REMOVER_PROFESIONAL.md +
DIAGNOSTICO_REMOVER_PROFESIONAL_COMPLEMENTARIO.md generados.
```

---

## Riesgos no obvios ⚠️

| Riesgo | Mitigación |
|--------|-----------|
| **Data personal en movimientos con `ambito='Profesional'`** | La distinción se pierde. Los movimientos siguen existiendo pero ya no distinguibles. Decisión asumida por Benja |
| **Sin backup de DB** | Sin protección si algo raro pasa. BEGIN/COMMIT en migration mitiga parcialmente |
| **Tipos pro en archivos no listados** | El diagnóstico complementario debería detectarlos. Stop condition #1 |
| **Componentes personales que rompen sin campos pro** | Stop condition #2. Diagnóstico complementario ayuda |
| **Intérprete devuelve JSON con estructura vieja pero API espera nueva** | Tests mentales 8, 9, 14, 15 lo validan |
| **Migration se ejecuta a mitad de camino** | BEGIN/COMMIT hace rollback si algo falla. Mitigación técnica |
| **Onboarding rompe si quitamos pregunta de modo** | Test mental 3 valida |
| **Plantillas recurrentes con FK NOT NULL pre-migration** | El DELETE de clientes se rechazaría por RESTRICT. Verificar en diagnóstico complementario si algún FK es NOT NULL o si todas son SET NULL |

---

## Próximos pasos post-merge

- Correr migration 023 manualmente en Supabase SQL Editor
- Validación fase B
- Fase 2 del pivot: mejoras MANGO AI (intérprete v2, streaming, Haiku para frases simples)
- Fase 3: WhatsApp bot con n8n
- PR2 Visual (paleta navy/crema, Manrope, dark/light)
- Sprint A de bugs chicos (tarjeta débito, monto inicial, sidebar mobile, gasto compartido)
