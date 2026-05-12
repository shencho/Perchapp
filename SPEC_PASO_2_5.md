# PASO 2.5 — Correctivo de arquitectura y rebrand del asistente

**Branch**: `feat/navegacion-reformada` (ya en la rama)
**Predecesor**: commit `a325bc4` (PASO 2)
**Modo**: 2 commits separados (2.5a + 2.5b). Validar cada uno antes del siguiente.

⚠️ Si encontrás algo no previsto en este spec, parar y reportar en BLOQUEOS.md. NO inventar workaround.

---

## CONTEXTO

PASO 2 dejó una arquitectura que el usuario decidió cambiar. Este PASO 2.5 reorganiza las rutas y hace rename del asistente de "Perchita" a "MANGO AI" antes de seguir con PASO 3.

### Arquitectura final acordada

**Sidebar desktop (adapta según `profile.modo` del usuario)**:

| Item | Aparece si modo es | URL destino |
|------|---------------------|-------------|
| Inicio | siempre | /dashboard |
| Movimientos | siempre | /movimientos |
| 🥭 Captura | siempre | /captura |
| Balances | siempre | /balances |
| Préstamos | siempre | /prestamos |
| Cash Flow | siempre | /cash-flow |
| Profesional | solo si modo = "profesional" | /clientes (por ahora) |

**Bottom navbar mobile** (siempre 5 items, adapta según modo) — guía conceptual, PASO 5 lo implementa:
- Modo profesional: Inicio / Movimientos / 🥭 FAB / Profesional / Más
- Modo personal: Inicio / Movimientos / 🥭 FAB / Balances / Más

**Drawer (mobile + desktop)**:
- Cuentas, Tarjetas, Personas y grupos, Categorías, Movimientos recurrentes, Ajustes

**Pantalla `/ajustes`**:
- Sección "Tu cuenta": nombre, modo, profesión
- Sección "Personalización": nombre del asistente
- Placeholders en comentarios para futuras secciones: "Apariencia" (dark/light, PR2) y "Seguridad" (cambio contraseña)
- NO incluye `vto_day_default` (se setea por tarjeta individual)

### Arquitectura objetivo de /profesional (NO se construye en este PR)

⚠️ Documentado para PRs futuros — NO IMPLEMENTAR EN ESTE PR:

```
/profesional                  ← landing/dashboard con KPIs (PR futuro)
/profesional/clientes         ← lista de clientes (hoy en /clientes)
/profesional/servicios        ← futuro
/profesional/eerr-economico   ← futuro
/profesional/eerr-financiero  ← futuro
/profesional/metricas         ← futuro
```

Con sub-tabs/sub-nav adentro de la sección. En este PR solo se crea **la etiqueta** "Profesional" en el navbar que linkea directamente a `/clientes`. La URL `/clientes` se mantiene como está. La estructura jerárquica `/profesional/*` se construye cuando se sume la segunda sub-sección.

---

## COMMIT 2.5a — Reorganización de arquitectura de rutas

### Cambios

#### 1. Re-crear `/ajustes` como hub general

- Crear `app/(app)/ajustes/page.tsx` (Server Component) que hace fetch de profile y profesiones y los pasa a `<AjustesPageContent />`
- Crear `components/ajustes/ajustes-page-content.tsx` con estructura visual en secciones (NO tabs):
  - **Sección "Tu cuenta"**: nombre, modo (personal/profesional), profesión (solo si modo profesional)
  - **Sección "Personalización"**: nombre del asistente (label: "Nombre del asistente", default "MANGO AI")
  - Comentario en código: `{/* TODO PR2: Sección "Apariencia" con toggle dark/light */}`
  - Comentario en código: `{/* TODO: Sección "Seguridad" con cambio de contraseña */}`
- Cada sección con header visual claro (h2 o equivalente) y separator entre secciones

#### 2. Eliminar `/perfil` y `/preferencias`

- Borrar `app/(app)/perfil/` y `app/(app)/preferencias/` (carpetas completas)
- Borrar `components/perfil/` y `components/preferencias/` (carpetas completas)
- Mover lo útil (lógica de validación, schema Zod) al nuevo `ajustes-page-content.tsx`

#### 3. Unificar server actions

- En `lib/supabase/actions/ajustes.ts`:
  - Eliminar `updatePerfil` y `updatePreferencias`
  - Crear `updateAjustes` que reciba todos los campos en un solo input y haga un solo UPDATE
  - Schema Zod unificado
  - `revalidatePath("/ajustes")` (eliminar los `/perfil` y `/preferencias`)
- NO eliminar la columna `vto_day_default` de la tabla (queda como dato muerto, lo limpiamos en futuro PR)
- Sacar el campo `vto_day_default` del form de UI

#### 4. Renombrar `/plantillas` → `/movimientos-recurrentes`

- Mover `app/(app)/plantillas/` → `app/(app)/movimientos-recurrentes/`
- Mover `components/plantillas/` → `components/movimientos-recurrentes/`
- Actualizar TODOS los imports
- Cambiar `revalidatePath("/plantillas")` → `revalidatePath("/movimientos-recurrentes")` en todas las actions
- **Etiquetas visuales en UI**: "Plantillas" → "Movimientos recurrentes" en TODOS los textos visibles al usuario (drawer, header, mensajes, toasts, modales, labels)
- ⚠️ NO renombrar la tabla `plantillas_recurrentes` en DB
- ⚠️ NO renombrar la server action `generarMovimientosDePlantillas`
- ⚠️ NO renombrar las funciones puras `getPlantillasPendientesDelMes`, `getPlantillasParaAlerta`

#### 5. Etiqueta "Profesional" en navbar (NO renombrar URL)

⚠️ Cambio mínimo, NO mover `/clientes`:

- La URL `/clientes` SE MANTIENE como está
- Solo cambiar la **etiqueta visual** en el navbar/sidebar:
  - "Clientes" → "Profesional"
  - El item linkea a `/clientes` (no a `/profesional`)
- NO crear redirect /clientes → /profesional
- NO mover archivos de /clientes
- NO crear ninguna carpeta /profesional

La estructura `/profesional/*` queda planeada para futuro pero **no se construye ahora**. Esto evita scope creep y retrabajo.

#### 6. Re-crear `/tarjetas` como ruta propia

- Crear `app/(app)/tarjetas/page.tsx` (Server Component) que hace fetch de tarjetas y las pasa a `<TarjetasPageContent />`
- Crear `components/tarjetas/tarjetas-page-content.tsx` con todo el CRUD que se había integrado en `/cuentas` durante PASO 2:
  - Lista de tarjetas con resumen (banco, últimos 4, día cierre, día vencimiento)
  - Botón "+ Nueva tarjeta"
  - Acciones por tarjeta: editar, archivar
  - Forms en modal/sheet
- Sacar de `app/(app)/cuentas/page.tsx` la sección de Tarjetas que PASO 2 había integrado. `/cuentas` vuelve a ser solo cuentas.
- ⚠️ Mantener `components/cuentas/cuentas-config-client.tsx` para la parte de Cuentas (lista + CRUD de cuentas). Solo sacar la parte de Tarjetas.
- Server actions de tarjetas: revalidatePath `/tarjetas` (no `/cuentas`)

#### 7. Helpers de navegación adaptables por modo

Crear `lib/navigation/get-nav-items.ts`:

```tsx
import type { Profile } from "@/types/...";

export type NavItem = {
  label: string;
  href: string;
  icon: string; // nombre del icono de lucide-react
};

export function getMainNavItems(profile: Profile): NavItem[] {
  const items: NavItem[] = [
    { label: "Inicio", href: "/dashboard", icon: "Home" },
    { label: "Movimientos", href: "/movimientos", icon: "ArrowLeftRight" },
    { label: "Captura", href: "/captura", icon: "Sparkles" },
    { label: "Balances", href: "/balances", icon: "Scale" },
    { label: "Préstamos", href: "/prestamos", icon: "Landmark" },
    { label: "Cash Flow", href: "/cash-flow", icon: "LineChart" },
  ];
  if (profile.modo === "profesional") {
    items.push({ label: "Profesional", href: "/clientes", icon: "Briefcase" });
  }
  return items;
}

export function getDrawerItems(): NavItem[] {
  return [
    { label: "Cuentas", href: "/cuentas", icon: "Wallet" },
    { label: "Tarjetas", href: "/tarjetas", icon: "CreditCard" },
    { label: "Personas y grupos", href: "/personas", icon: "Users" },
    { label: "Categorías", href: "/categorias", icon: "Tags" },
    { label: "Movimientos recurrentes", href: "/movimientos-recurrentes", icon: "Repeat" },
    { label: "Ajustes", href: "/ajustes", icon: "Settings" },
  ];
}
```

⚠️ Notá: el item "Profesional" tiene `href: "/clientes"`. Cuando en futuro se cree `/profesional` como landing, solo se cambia este string.

Estos helpers se van a usar en PASO 5 (sidebar/drawer/bottom navbar). En este commit solo crear los helpers, no integrar en componentes todavía.

#### 8. Redirects de compatibilidad

En `next.config.ts`:
```ts
async redirects() {
  return [
    { source: "/perfil", destination: "/ajustes", permanent: true },
    { source: "/preferencias", destination: "/ajustes", permanent: true },
    { source: "/plantillas", destination: "/movimientos-recurrentes", permanent: true },
    // Eliminar el redirect "/ajustes -> /perfil" que se había creado en PASO 2
    // NO crear redirect /clientes -> /profesional (URL /clientes se mantiene)
  ];
}
```

#### 9. Actualizar el icono Settings del header

- `components/shared/header.tsx`: el icono Settings vuelve a apuntar a `/ajustes`

#### 10. Find & replace en toda la codebase

Reemplazar uno por uno (NO find-and-replace ciego):
- Links a `/perfil` → `/ajustes`
- Links a `/preferencias` → `/ajustes`
- Links a `/plantillas` → `/movimientos-recurrentes`

NO tocar `/clientes` ni la palabra "Clientes" en código de páginas (solo en navbar/sidebar como etiqueta visual).

Buscar con:
```
grep -rn "/perfil\|/preferencias\|/plantillas" --include="*.tsx" --include="*.ts"
```

### Testing manual antes del commit 2.5a

- `pnpm build` pasa limpio
- `/ajustes` carga y muestra las 2 secciones (Tu cuenta + Personalización)
- Editar nombre, modo, profesión, nombre del asistente desde `/ajustes` y los cambios persisten al refrescar
- `/perfil` redirige a `/ajustes`
- `/preferencias` redirige a `/ajustes`
- `/plantillas` redirige a `/movimientos-recurrentes`
- `/clientes` sigue funcionando como antes (NO cambió la URL)
- `/movimientos-recurrentes` carga con TODAS las funcionalidades de la antigua /plantillas (crear, editar, generar pendientes)
- `/tarjetas` carga con CRUD funcional
- `/cuentas` ya NO muestra Tarjetas (solo cuentas)
- Icono Settings del header lleva a `/ajustes`

### Mensaje de commit 2.5a

```
fix(paso-2.5a): reorganizar arquitectura de rutas

- Re-crear /ajustes como hub de config del usuario (Tu cuenta + Personalización)
- Eliminar /perfil y /preferencias (fusionados en /ajustes)
- Renombrar /plantillas a /movimientos-recurrentes
- Re-crear /tarjetas como ruta propia (sacar de /cuentas)
- Etiqueta "Profesional" en navbar (linkea a /clientes, sin renombrar URL)
- Unificar updatePerfil + updatePreferencias en updateAjustes
- Eliminar vto_day_default del form (se setea por tarjeta)
- Helpers de navegación adaptables por modo (get-nav-items.ts)
- Redirects de compatibilidad para URLs viejas
- Actualizar icono Settings, todos los links internos

[Cierre 008]
```

---

## COMMIT 2.5b — Rebrand del asistente "Perchita" → "MANGO AI"

⚠️ Este commit se hace DESPUÉS de que el usuario valide 2.5a.

### Cambios

#### 1. Microcopy nueva en `/captura`

Reemplazar la sección de saludo de la pantalla por:

```tsx
<div className="text-center mb-6">
  <h1 className="text-2xl md:text-3xl font-semibold">¿Qué cargamos?</h1>
  <p className="text-muted-foreground mt-2">
    Contame tus movimientos y nos ordenamos.
  </p>
</div>
```

(Ajustar tamaños/estilos a la convención visual actual del proyecto)

#### 2. Frases sugeridas rotativas

Reemplazar la lista actual de frases sugeridas por estas 4 exactas:

```ts
const FRASES_SUGERIDAS_INICIALES = [
  "Pagué la luz 65 lucas con la Master.",
  "Salí a comer y gasté 35000 con transferencia desde Mercado Pago.",
  "Se debitó Netflix de mi tarjeta VISA $7000.",
  "Cargué nafta y pagué 100000 en efectivo.",
];
```

⚠️ La lógica futura de "frases que se adaptan según movimientos pasados del usuario" queda para PR futuro. Por ahora estas 4 son las iniciales/fallback.

⚠️ Confirmar que el bug de hidratación SSR de frases rotativas (mencionado en BUGS_DETECTADOS.md) sigue presente o no — si está, NO arreglarlo en este PR, dejar nota.

#### 3. Rename "Perchita" → "MANGO AI" en código

Hacer `grep -rni "perchita" --include="*.tsx" --include="*.ts" --include="*.md"` y reportar TODAS las apariciones.

Para cada aparición decidir:
- **Strings visibles al usuario** (UI, toasts, labels, mensajes de error, alt text, aria-label, placeholders): reemplazar por "MANGO AI"
- **Prompts del AI** (lib/ai/prompts/): reemplazar por "MANGO AI"
- **Comentarios de código**: dejar el original o reemplazar, da igual, no afecta runtime
- **Nombres de variables/funciones internas** (ej: `PerchitaFAB`, `perchita-bottom-sheet.tsx`): **NO renombrar en este commit**. Es scope creep. Anotar en TODO para futuro refactor.
- **Tests** (si existen): reemplazar strings literales que sean del UI

⚠️ La variable `PerchitaFAB` y archivos como `perchita-bottom-sheet.tsx` se renombran en un PR posterior (es solo nombre de variable interna, no afecta lo que el usuario ve).

#### 4. UPDATE en DB para usuarios existentes

El usuario confirmó: "solo yo, hacer UPDATE masivo".

Crear migration `022_rename_asistente_perchita_to_mango_ai.sql`:

```sql
-- Migration 022: rename default asistente_nombre from "Perchita" to "MANGO AI"
-- Aplica solo a usuarios que tienen el default viejo. Respeta nombres personalizados.

UPDATE profiles
SET asistente_nombre = 'MANGO AI'
WHERE asistente_nombre = 'Perchita';

-- Actualizar también el default de la columna si está hardcodeado
-- (verificar primero con \d profiles si existe DEFAULT 'Perchita')
-- Si existe, hacer:
-- ALTER TABLE profiles ALTER COLUMN asistente_nombre SET DEFAULT 'MANGO AI';
```

⚠️ Esta migration NO se corre automáticamente. Solo creala. El usuario va a correrla manualmente en Supabase SQL Editor después del commit.

#### 5. Default en código para nuevos usuarios

Buscar donde se setea `asistente_nombre = "Perchita"` como default al crear un nuevo profile (en server actions de signup, en lib/supabase/actions/auth.ts, en triggers de DB si los hay) y cambiarlo a `"MANGO AI"`.

### Testing manual antes del commit 2.5b

- `pnpm build` pasa limpio
- `/captura` muestra el saludo "¿Qué cargamos? Contame tus movimientos y nos ordenamos."
- Las 4 frases sugeridas rotan correctamente
- En `/ajustes`, el campo "Nombre del asistente" muestra "MANGO AI" (o lo que tenga el usuario seteado)
- Cambiar el nombre desde `/ajustes` y ver que persiste
- En `/captura`, mensajes del intérprete usan "MANGO AI" (o el nombre que tenga el usuario)
- NO quedan strings visibles "Perchita" en la UI

### Mensaje de commit 2.5b

```
feat(paso-2.5b): rebrand asistente Perchita -> MANGO AI

- Microcopy nueva en /captura: saludo "¿Qué cargamos?"
- 4 frases sugeridas iniciales (lógica adaptativa queda para PR futuro)
- Strings visibles al usuario actualizados de "Perchita" a "MANGO AI"
- Prompts internos del AI actualizados
- Migration 022 (manual): UPDATE profiles SET asistente_nombre = 'MANGO AI' WHERE = 'Perchita'
- Default para nuevos usuarios: "MANGO AI"
- NO renombrar variables/archivos internos (PerchitaFAB, etc.) — scope creep, queda para PR futuro

[Cierre 008]
```

---

## Reporte al usuario al finalizar

Cuando termines AMBOS commits, mostrar:

1. Lista de los 2 commits con su hash
2. `git log --stat HEAD~2..HEAD` para ver impacto
3. Resultado de `pnpm build`
4. Lista de redirects nuevos
5. Lista de migraciones manuales pendientes (la 022 SQL)
6. Lista de strings "Perchita" que quedaron en código (deberían ser solo nombres de variables y archivos internos)
7. Cualquier ⚠️ que detectes

Esperar visto bueno del usuario antes de arrancar PASO 3.
