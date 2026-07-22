# SPEC_PR_REMOVER_PROFESIONAL.md

## Objetivo

Eliminar completamente la sección Profesional de MANGO, quedando la app 100% personal. Este PR es parte de la estrategia de pivot a producto vendible B2C.

**Alcance**: eliminar código profesional + limpiar tablas DB (truncate). Los datos históricos NO importan (el usuario empieza casi de cero en julio).

**Rama**: `feat/remover-profesional`

---

## Decisiones arquitectónicas (ya tomadas, NO cuestionar)

| Decisión | Resolución |
|----------|-----------|
| Alcance de eliminación | A2 — Eliminar del código completamente |
| profile.modo | B2 — UPDATE a "personal", columna queda pero irrelevante |
| Datos profesionales existentes | C3 modificado — Truncate (no migrar) porque no los necesita |
| Tablas DB profesionales | B1 — TRUNCATE CASCADE (limpiar data, tablas quedan por si acaso) |
| Slot 4 mobile navbar | D1 — Balances fijo (ya no depende de modo) |
| Botón MANGO AI desktop | E1 — Sin cambios (sigue siendo dinámico via asistente_nombre) |

---

## PASO 0 obligatorio — Diagnóstico

Antes de tocar código, generar `DIAGNOSTICO_REMOVER_PROFESIONAL.md` en la raíz con:

### 1. Inventario de rutas profesionales

Grep por `app/(app)/clientes`, `app/(app)/importar`, cualquier ruta que sea exclusivamente profesional. Listame:
- Path completo de cada ruta
- Si tiene sub-rutas dinámicas (`[id]`, etc.)
- Cualquier layout específico

### 2. Inventario de componentes profesionales

Grep por directorios/archivos:
- `components/clientes/*`
- `components/registros-tab/*` (verificar si es solo profesional o mixto)
- Cualquier `pro-only`, `profesional-only` en componentes existentes
- Cualquier condicional `modo === "profesional"` o `modo === "ambos"` en componentes

Listame cada archivo con su ubicación y tipo.

### 3. Inventario de server actions profesionales

Grep por `lib/supabase/actions/`:
- `clientes.ts` (o como se llame)
- `cobros.ts`
- `servicios.ts`
- Cualquier action que use tablas profesionales

### 4. Inventario de prompts y catálogos profesionales

Grep por:
- `lib/ai/prompts/` — prompts que detecten cobros, clientes, servicios
- `lib/templates/catalogos.ts` — templates con contexto profesional
- Cualquier lógica del intérprete que sea `pro-only`

### 5. Inventario de referencias a `profile.modo`

Grep global de `profile.modo`, `profile?.modo`, `modo === "profesional"`, `modo === "ambos"`.

Listame cada ocurrencia (archivo + línea + contexto):
- ¿Es un condicional de renderizado?
- ¿Es un filtro de datos?
- ¿Es lógica de negocio?

### 6. Análisis de nav

Verificá:
- `lib/navigation/get-nav-items.ts` — dónde se define el item "Profesional"
- `components/navigation/mobile-bottom-nav.tsx` — lógica del slot 4 según modo
- `components/navigation/desktop-sidebar.tsx` — condicional del item Profesional
- `components/navigation/navigation-drawer.tsx` — condicional de Balances según modo

### 7. Análisis de /ajustes

- ¿Hay un select/toggle de modo (personal/profesional/ambos)?
- ¿Dónde está exactamente el componente?

### 8. Análisis de /onboarding

- ¿Se pregunta el modo durante onboarding?
- ¿Si sí, dónde está y cómo lo simplificamos?

### 9. Tablas DB afectadas

Verificar cuáles tablas son exclusivamente profesionales y candidatas a TRUNCATE:
- `clientes`
- `servicios`
- `cobros`
- Cualquier otra con contexto profesional

⚠️ CRÍTICO: verificar foreign keys. Si `movimientos` tiene FK a `clientes`, hay que ser cuidadoso.

### 10. Plan de implementación propuesto

Orden de operaciones sugerido:
1. Simplificar nav primero
2. Eliminar rutas
3. Eliminar componentes
4. Eliminar server actions
5. Limpiar prompts
6. Quitar toggle de modo en ajustes
7. Simplificar onboarding
8. Migration 023

### ⚠️ STOP CONDITION del PASO 0

**PARAR y reportar** si:
- Hay foreign keys que hagan que TRUNCATE CASCADE afecte tablas personales (movimientos, cuentas)
- Componentes "profesionales" están tan integrados con personales que borrar los primeros rompe los segundos
- Aparecen usos de `profile.modo` que no anticipamos (ej. permisos, features flags, etc.)

**IMPORTANTE**: cuando termines el diagnóstico, PARÁ y esperá luz verde antes de implementar.

---

## Estructura de cambios objetivo

### Archivos a ELIMINAR completamente

**Rutas**:
```
app/(app)/clientes/
app/(app)/importar/ (si es solo profesional)
```

**Componentes**:
```
components/clientes/
components/servicios/ (si existe)
components/cobros/ (si existe)
```

**Server actions**:
```
lib/supabase/actions/clientes.ts
lib/supabase/actions/cobros.ts
lib/supabase/actions/servicios.ts
```

**Prompts** (parcial — solo los pro-only):
```
Trozos específicos de lib/ai/prompts/*
```

### Archivos a MODIFICAR

**Nav**:
- `lib/navigation/get-nav-items.ts` — quitar item Profesional. Balances queda como item normal. Simplificar tipos si tenían lógica de modo.
- `components/navigation/mobile-bottom-nav.tsx` — slot 4 fijo en Balances. Quitar lógica condicional del modo.
- `components/navigation/desktop-sidebar.tsx` — quitar item Profesional. El botón MANGO AI queda igual.
- `components/navigation/navigation-drawer.tsx` — simplificar filtros (ya no hay que agregar Balances condicionalmente).
- `components/navigation/mango-ai-button.tsx` — sin cambios (asistente_nombre sigue funcionando).

**Ajustes**:
- `app/(app)/ajustes/` — quitar el select/toggle de modo. El resto queda igual.

**Onboarding**:
- `app/onboarding/` — quitar pregunta de modo. Simplificar para asumir personal.

**Layout**:
- `app/(app)/layout.tsx` — el select de `profile.modo` puede simplificarse (o eliminarse si nadie más lo lee).

**Otros archivos que usan profile.modo**:
- Cualquier archivo detectado en el diagnóstico paso 5. Eliminar los condicionales, dejar el path de "personal" como default.

**Catálogos del intérprete**:
- `lib/ai/prompts/*` — quitar contexto profesional. Simplificar templates.
- `lib/templates/catalogos.ts` — quitar templates profesionales.

**Types**:
- `src/lib/types/database.ts` o donde estén los tipos: dejar las tablas clientes/servicios/cobros si van a quedar en DB (no drop), pero quitar cualquier tipo derivado que ya no se use.

### Migration 023 nueva

`supabase/migrations/023_remove_profesional_data.sql`:

```sql
-- PR Remover Profesional
-- 1. Setear todos los profiles a modo "personal"
UPDATE profiles SET modo = 'personal' WHERE modo IS NOT NULL;

-- 2. Truncate tablas profesionales (data no importa, empezamos de cero en julio)
-- Nota: TRUNCATE CASCADE por si hay FKs
TRUNCATE TABLE cobros CASCADE;
TRUNCATE TABLE servicios CASCADE;
TRUNCATE TABLE clientes CASCADE;

-- 3. Verificar: SELECT count(*) de cada tabla debe ser 0.
-- Ejecutar manualmente:
-- SELECT count(*) FROM clientes; -- Esperado: 0
-- SELECT count(*) FROM servicios; -- Esperado: 0
-- SELECT count(*) FROM cobros; -- Esperado: 0
```

⚠️ **NO correr esta migration desde Claude Code**. Solo escribir el archivo. La ejecución la hace Benja manualmente en Supabase.

⚠️ **CRÍTICO — Antes de correr la migration**:
- Benja hace **backup completo de la DB en Supabase** (dashboard → Database → Backups)
- Aunque no necesita los datos, es política estándar antes de un TRUNCATE

---

## Tests mentales (casos de borde)

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Usuario con modo="personal" antes del PR | Sigue funcionando igual, sin cambios visibles salvo que ya no hay opción Profesional |
| 2 | Usuario con modo="profesional" antes del PR | Después de migration: modo pasa a "personal". UI = personal |
| 3 | Usuario con modo="ambos" antes del PR | Después de migration: modo pasa a "personal". UI = personal |
| 4 | Usuario nuevo en onboarding post-PR | No se le pregunta modo. Default = "personal" |
| 5 | Navegación mobile | Slot 4 = Balances fijo. Sin lógica condicional |
| 6 | Navegación desktop | Sin item Profesional. Sidebar más simple |
| 7 | Drawer | Sin Balances condicional (Balances ya está en bottom slot 4) |
| 8 | /clientes por URL directa | 404 (ruta eliminada) |
| 9 | Ajustes | Sin select de modo |
| 10 | Intérprete | Ya no interpreta cobros profesionales. Solo movimientos personales |

---

## Validación local (Benja, post Claude Code)

| # | Test | Esperado |
|---|------|----------|
| 1 | `npm run build` | OK, sin errores TypeScript |
| 2 | 23 rutas → ver cuántas quedan | Menos que 23 (por eliminación de /clientes, etc.) |
| 3 | Abrir /dashboard | Se ve normal, sin item Profesional en sidebar |
| 4 | Abrir /movimientos | Se ve normal |
| 5 | Mobile DevTools: bottom navbar | Balances fijo en slot 4 |
| 6 | Abrir /ajustes | Sin select de modo |
| 7 | Abrir /clientes por URL directa | 404 |
| 8 | Abrir /captura y probar intérprete con frase profesional (ej "cobré 50000 a Juan por su clase") | Interpreta como ingreso genérico (sin cliente) |
| 9 | Correr migration 023 en SQL Editor manualmente | UPDATE + TRUNCATE ejecutan OK |
| 10 | Post-migration: verificar profiles con `SELECT modo, count(*) FROM profiles GROUP BY modo` | Todos "personal" |
| 11 | Post-migration: verificar tablas vacías `SELECT count(*) FROM clientes` | 0 |
| 12 | DevTools Console | Sin errores rojos ni warnings de props/hidratación |

---

## Stop conditions para Claude Code

**PARAR y reportar a Benja** si:

1. El diagnóstico revela FKs desde tablas personales (movimientos, cuentas, categorías) a tablas profesionales (clientes, cobros)
2. Componentes eliminan importaciones que rompen otros componentes personales
3. El intérprete tiene lógica tan entretejida que separar profesional/personal requiere rewrite grande
4. Build falla y no se puede arreglar en <30min
5. Aparecen tablas o entidades profesionales que no anticipamos
6. `profile.modo` se usa en más de 15 lugares (sugiere que hay refactor mayor a hacer)
7. Cualquiera de los 10 tests mentales NO funciona

---

## Reglas para Claude Code (no negociables)

| Regla | Detalle |
|-------|---------|
| ❌ NO push automático | Solo commit local en `feat/remover-profesional` |
| ❌ NO correr migrations | Solo escribir archivo `.sql`, Benja las corre |
| ❌ NO tocar `.env.local` | Fuera de scope |
| ❌ NO renombrar archivos con "perchita" | Backlog futuro |
| ❌ NO modificar UI personal | Solo eliminar profesional, no rediseñar |
| ❌ NO tocar backup de DB | Benja hace el backup manualmente antes |
| ❌ NO drop tablas | Solo TRUNCATE. DROP queda para futuro si Benja quiere |
| ✅ Build debe pasar antes de commitear | `npm run build` verde |
| ✅ Reportar antes/después con tabla | Mismo formato que PRs anteriores |
| ✅ Generar diagnóstico primero | Antes de tocar código productivo |
| ✅ Si dudás | Parar y preguntar |

---

## Commit final

Cuando Claude Code termine la validación interna:

```
feat: remover Profesional para pivot a producto 100% personal

Parte de la estrategia de convertir MANGO en producto vendible B2C.
Elimina completamente la sección Profesional de la app:

Código eliminado:
- Rutas: /clientes, /clientes/[id], /importar (si aplica)
- Componentes: components/clientes/, components/cobros/, etc.
- Server actions: clientes, cobros, servicios
- Prompts profesionales del intérprete
- Templates de catálogo profesional

Nav simplificada:
- Slot 4 mobile navbar: Balances fijo (ya no depende de modo)
- Sidebar desktop: sin item Profesional
- Drawer: sin lógica condicional de Balances según modo
- Ajustes: sin select de modo

DB:
- Migration 023: UPDATE profiles SET modo='personal' + TRUNCATE
  tablas clientes/servicios/cobros CASCADE
- Tablas quedan (por si acaso), data limpia

profile.modo: columna se mantiene pero código la ignora. Todos los
users quedan con modo="personal".

Fase 1 del pivot. Próximas fases:
- Continuar mejorando MANGO AI (intérprete)
- WhatsApp bot con n8n (más adelante)
- Sistema de planes/suscripciones (cuando esté maduro)

PASO 0: DIAGNOSTICO_REMOVER_PROFESIONAL.md generado
```

---

## Riesgos no obvios ⚠️

| Riesgo | Mitigación |
|--------|-----------|
| Foreign keys de tablas personales a profesionales | Diagnóstico paso 9 debería detectarlo. Si aparece, decidir antes de TRUNCATE |
| Componentes personales importan cosas de profesional | Búsqueda de imports antes de eliminar. Refactor si hace falta |
| El intérprete se rompe si eliminamos catálogo profesional | Test 8 valida. Si falla, ajustar prompts para que funcionen sin contexto pro |
| Usuarios con modo="profesional" o "ambos" en producción | Migration 023 los pasa a "personal" limpio. No pierden data personal, solo pierden acceso a profesional |
| Onboarding rompe si quitamos pregunta de modo | Verificar que el default sea "personal" sin bug |
| Después de mergear vas a ver rutas huérfanas en historial de browser | Es normal, no bug. Le decís al browser que borre historial si te molesta |

---

## Próximos pasos post-merge

- **Fase 2**: Continuar mejorando MANGO AI (intérprete v2 con streaming, Haiku para frases simples, pegar lista de personas, etc.)
- **Fase 3**: WhatsApp bot con n8n
- **PR2 Visual**: aplicable en cualquier momento post-remover profesional
- Sprint A de bugs chicos (tarjeta débito, monto inicial, sidebar mobile, gasto compartido) — hacer antes o después de este PR según preferencia
