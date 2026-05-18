# DIAGNOSTICO_NAV.md — PASO 0

**Fecha**: 2026-05-10  
**Branch**: feat/navegacion-reformada  
**Generado antes de tocar código**

---

## 1. Estructura actual del layout

### `app/layout.tsx` (root)
- Minimal. Aplica `Inter`, `dark h-full antialiased` en `<html>`, `min-h-full flex flex-col` en `<body>`.
- No monta ningún componente de navegación.

### `app/(app)/layout.tsx`
- Server Component. Hace auth gate: si no hay sesión → `/login`; si no hay `onboarding_completado` → `/onboarding`.
- Monta: `<Header userEmail={...} modo={...} />` + `<main className="flex-1 p-4 md:p-6">{children}</main>`
- **NO hay sidebar desktop**. El layout actual es un header horizontal y un main debajo.

### `components/shared/header.tsx`
- Client Component (`"use client"`).
- Props: `userEmail`, `modo`.
- Estructura: logo + nav horizontal (sm+) + acciones derecha (email, botón Settings → `/ajustes`, botón Salir).
- Mobile: hamburguesa que despliega un menú vertical dropdown absoluto.
- Nav links actuales: Dashboard, Movimientos, Captura, Cuentas, Balances, Préstamos, [Clientes si modo pro].
- **Nota**: el ícono Settings hace `router.push("/ajustes")` — debe actualizarse.

### Sidebar desktop
- **NO EXISTE**. El spec habla de "refactorear la sidebar" pero en el código no hay ningún archivo `sidebar*.tsx` ni `nav*.tsx` en `components/`. El componente `<DesktopSidebar />` se crea de cero.

### `app/globals.css`
- Usa Tailwind v4 con `@import "tailwindcss"`.
- **No hay reglas de safe-area-inset, padding-bottom para nav, ni z-index layer**. Se agregan en PASO 7.
- Tokens custom definidos: `--surface`, `--surface-2`, `--success`, `--warning`, `--subtle`.

---

## 2. Tabla completa de rutas

| Ruta | Path archivo | Sub-rutas | ¿Nav actual? |
|------|-------------|-----------|--------------|
| `/dashboard` | `app/(app)/dashboard/page.tsx` | no | sí (Inicio) |
| `/movimientos` | `app/(app)/movimientos/page.tsx` | no | sí |
| `/captura` | `app/(app)/captura/page.tsx` | no | sí |
| `/cuentas` | `app/(app)/cuentas/page.tsx` | sí | sí |
| `/cuentas/[id]` | `app/(app)/cuentas/[id]/page.tsx` | no | no (desde /cuentas) |
| `/cuentas/tarjetas/[id]` | `app/(app)/cuentas/tarjetas/[id]/page.tsx` | no | no (desde /cuentas) |
| `/balances` | `app/(app)/balances/page.tsx` | no | sí |
| `/cash-flow` | `app/(app)/cash-flow/page.tsx` | no | no |
| `/prestamos` | `app/(app)/prestamos/page.tsx` | sí | sí |
| `/prestamos/[id]` | `app/(app)/prestamos/[id]/page.tsx` | no | no |
| `/clientes` | `app/(app)/clientes/page.tsx` | sí | sí (si modo pro) |
| `/clientes/[id]` | `app/(app)/clientes/[id]/page.tsx` | no | no |
| `/ajustes` | `app/(app)/ajustes/page.tsx` | no | no (solo ícono Settings) |
| `/inversiones` | **NO EXISTE** | — | no |
| `/perfil` | **NO EXISTE** (crear) | — | — |
| `/preferencias` | **NO EXISTE** (crear) | — | — |
| `/categorias` | **NO EXISTE** (crear) | — | — |
| `/plantillas` | **NO EXISTE** (crear) | — | — |

**Rutas auth:**
- `/(auth)/login` → `app/(auth)/login/page.tsx`
- `/(auth)/signup` → `app/(auth)/signup/page.tsx`
- `/onboarding` → `app/onboarding/` (fuera de los dos grupos)

**Rutas API:** `/api/interpret` (POST, AI interpretation), y otras no exploradas en detalle.

---

## 3. Estructura de `/ajustes`

### Tipo de estructura
**Una sola página con tabs internos** (no sub-rutas). No hay `/ajustes/categorias` ni `/ajustes?tab=categorias` — el tab activo es solo estado local del componente.

### Componentes involucrados

| Tab | Componente | Props que recibe | State local notable |
|-----|-----------|-----------------|---------------------|
| `perfil` | `PerfilTab` | `profile`, `profesiones` | useForm (react-hook-form), saved, error |
| `cuentas` | `CuentasTab` | `cuentas` | useState dialogs/forms, useForm |
| `tarjetas` | `TarjetasTab` | `tarjetas`, `cuentas` | useState dialogs/forms, useForm |
| `categorias` | `CategoriasTab` | `categorias` | useState dialogs/forms, useForm, importModalOpen |
| `personas` | `PersonasGruposTab` | `personas`, `grupos` | useState (inline editing/CRUD) |
| `plantillas` | `PlantillasTab` | `plantillas`, `cuentas`, `tarjetas`, `categorias`, `clientes`, `servicios` | useState, useForm, padreId/subcatId extra state |

### Server actions invocadas
- PerfilTab: `updateProfile` (lib/supabase/actions/ajustes.ts)
- CuentasTab: `createCuenta`, `updateCuenta`, `archiveCuenta`
- TarjetasTab: `createTarjeta`, `updateTarjeta`, `archiveTarjeta` (inferido)
- CategoriasTab: `createCategoria`, `updateCategoria`, `archiveCategoria`
- PlantillasTab: `createPlantilla`, `updatePlantilla`, `deletePlantilla`
- PersonasGruposTab: `createPersona`, `updatePersona`, `deletePersona`, `createGrupo`, `updateGrupo`, `deleteGrupo`

### Imports compartidos entre tabs
- `@/components/shared/form-dialog` → FormDialog
- `@/components/shared/delete-confirm` → DeleteConfirm
- `@/components/ui/named-select` → NamedSelect
- shadcn: Button, Input, Label, Select, Tabs

---

## 4. Estructura de `/captura` — assessment de extracción

### Tipo de componente
- `app/(app)/captura/page.tsx`: **Server Component** — hace 7 queries en paralelo, transforma grupos, pasa props.
- `app/(app)/captura/_components/captura-client.tsx`: **Client Component** (`"use client"`)
- `app/(app)/captura/_components/revision-modal.tsx`: **Client Component** (usado dentro de CapturaClient)

### Props que recibe CapturaClient (vendrán del server)
```typescript
interface Props {
  asistente_nombre: string;
  cuentas: Cuenta[];
  tarjetas: Tarjeta[];
  categorias: Categoria[];
  clientes: { id: string; nombre: string }[];
  personas: Persona[];
  grupos: GrupoConMiembros[];
}
```

### State local
- `texto: string` — input del usuario
- `estado: "idle" | "loading" | "error"` — estado de la interpretación
- `errorMsg: string | null`
- `parsed: ParsedMovimiento | null` — resultado de /api/interpret
- `revisionOpen: boolean` — controla el RevisionModal
- `escuchando: boolean` — estado del micrófono
- `ejemplos: string[]` — array aleatorio de sugerencias (inicializado una vez con useState)
- Refs: `recognitionRef`, `silenceTimerRef`, `textareaRef`

### Hooks de Next.js usados
- `useRouter()` — solo para `router.push("/movimientos")` en `handleConfirmed`

### Acoplamiento a ruta
**SOLO UN PUNTO**: `handleConfirmed()` hace `router.push("/movimientos")`. Esto se abstrae con la prop `onSuccess?: () => void`:
- En `/captura/page.tsx`: `onSuccess` → `router.push("/movimientos")`
- En el bottom sheet: `onSuccess` → `closePerchitaSheet()`

### Modales internos
- `RevisionModal` (revision-modal.tsx): abre `MovimientoEditor` importado desde `/movimientos/_components/`. Esta dependencia cruzada es válida — el editor de movimientos es un componente compartido.

### Veredicto de extracción
**LIMPIA** ✅ — La extracción de `<CapturaForm />` es directa. No hay `useSearchParams`, no hay state acoplado a URL params, no hay lógica de servidor en el client component. El único cambio es reemplazar `router.push("/movimientos")` por la prop `onSuccess`.

---

## 5. Lista de archivos que linkean a `/ajustes`

### Links de navegación (código de app)

| Archivo | Línea | Tipo | Destino correcto |
|---------|-------|------|-----------------|
| `components/shared/header.tsx` | 85 | `router.push("/ajustes")` (botón Settings icon) | `/perfil` |
| `app/(app)/cuentas/page.tsx` | 118 | `<Link href="/ajustes">Ajustes → Cuentas</Link>` | `/cuentas` (gestión) o mantener en perfil |
| `app/(app)/cuentas/page.tsx` | 301 | `<Link href="/ajustes">Ajustes → Tarjetas</Link>` | `/cuentas` (sección tarjetas) |
| `app/(app)/cuentas/tarjetas/[id]/page.tsx` | 185 | `<Link href="/ajustes">Ajustes → Tarjetas</Link>` | `/cuentas` |
| `app/(app)/cuentas/[id]/page.tsx` | 337 | `<Link href="/ajustes">Ajustes → Cuentas</Link>` | `/cuentas` |
| `app/(app)/cuentas/[id]/page.tsx` | 338 | `<Link href="/ajustes">Ajustes → Cuentas</Link>` | `/cuentas` |

### Imports de componentes (romperían el build al eliminar /ajustes)

| Archivo | Línea | Detalle |
|---------|-------|---------|
| `app/onboarding/categorias-sugeridas/client.tsx` | 6 | `import { ImportarTemplateModal } from "@/app/(app)/ajustes/_components/importar-template-modal"` |

### `revalidatePath("/ajustes")` en server actions (no rompen build pero afectan revalidación)

| Archivo | Líneas |
|---------|--------|
| `lib/supabase/actions/ajustes.ts` | 34 |
| `lib/supabase/actions/categorias.ts` | 28, 49, 120, 264 |
| `lib/supabase/actions/cuentas.ts` | 48, 68, 83 |
| `lib/supabase/actions/tarjetas.ts` | 40, 67, 84 |

---

## 6. Componentes shadcn faltantes

| Componente | Estado | Criticidad |
|-----------|--------|------------|
| `sheet.tsx` | **FALTA** | CRÍTICA — NavigationDrawer y PerchitaBottomSheet dependen de Sheet |
| `separator.tsx` | **FALTA** | Media — se puede reemplazar con `<hr>` o `border-t` |
| `drawer.tsx` | **FALTA** | Baja — alternativa a Sheet (Vaul), no requerida si usamos Sheet |
| `dropdown-menu.tsx` | **FALTA** | Baja — mencionado en spec como opcional |
| `button.tsx` | ✓ disponible | — |
| `dialog.tsx` | ✓ disponible | — |
| `tabs.tsx` | ✓ disponible | — |
| `select.tsx` | ✓ disponible | — |
| `card.tsx` | ✓ disponible | — |
| `input.tsx` | ✓ disponible | — |
| `label.tsx` | ✓ disponible | — |

**Acción requerida antes de PASO 5**:
```bash
npx shadcn@latest add sheet
npx shadcn@latest add separator
```

---

## 7. Riesgos detectados

### R1 — NO EXISTE SIDEBAR DESKTOP (IMPACTO ALTO)
El spec dice "refactorear la sidebar actual" y "Desktop Sidebar refactor: solo items principales". **En el código no hay sidebar**. El layout actual usa solo un header horizontal. `<DesktopSidebar />` se crea de cero, no se refactoriza. Esto es consistente con el spec (el archivo `components/shared/desktop-sidebar.tsx` está en "Nuevos archivos"), solo afecta la estimación de complejidad — es más trabajo que un refactor.

### R2 — TABS EXTRAS EN /ajustes SIN RUTA DESTINO CLARA

El spec mapea: perfil → /perfil, categorias → /categorias, plantillas → /plantillas. Pero hay 3 tabs adicionales sin destino explícito:

- **CuentasTab** (gestión de cuentas: crear/editar/archivar): La ruta `/cuentas` ya existe como vista de consulta. ¿El CRUD de cuentas se mueve a `/cuentas` como sección o queda accesible desde otro lugar?
- **TarjetasTab** (gestión de tarjetas): Similar. Solo existe `/cuentas/tarjetas/[id]` como detalle, no hay lista CRUD.
- **PersonasGruposTab**: No hay ruta destino mencionada en el spec. ¿Se ignora (queda sin ruta propia)? ¿Se mueve a `/personas`?

**Decisión pendiente**: Para no bloquear el PR, propongo:
  - CuentasTab y TarjetasTab: mover su contenido a `/cuentas` como sección colapsable.
  - PersonasGruposTab: dejar sin ruta top-level en este PR (accesible solo si alguien sabe la URL, o se agrega al drawer después).

⚠️ **Confirmar con Benja antes de implementar.**

### R3 — `/preferencias` SIN CONTENIDO CLARO (IMPACTO MEDIO)

El spec pide crear `/preferencias` como ruta top-level. En ajustes no existe un tab "preferencias". El PerfilTab mezcla datos de perfil (nombre, modo, profesion) con preferencias (asistente_nombre, vto_day_default).

**Opciones**:
  a) `/perfil` → nombre + modo + profesion. `/preferencias` → asistente_nombre + vto_day_default. Requiere partir PerfilTab en dos.
  b) `/perfil` → todo el PerfilTab. `/preferencias` → página vacía "Próximamente".

**Propuesta**: opción (a) — es la separación semántica correcta y el formulario de perfil usa react-hook-form con schema Zod, la separación es clean.

⚠️ **Confirmar con Benja.**

### R4 — ImportarTemplateModal acoplado a ajustes (IMPACTO ALTO — rompe build)

`app/onboarding/categorias-sugeridas/client.tsx` importa `ImportarTemplateModal` desde `@/app/(app)/ajustes/_components/importar-template-modal`. Si se elimina `/ajustes`, este import rompe el build.

**Acción**: mover `importar-template-modal.tsx` a `components/categorias/` como primer paso antes de eliminar `/ajustes`. Actualizar ambos importers.

### R5 — Tarjetas sin página de lista (IMPACTO BAJO)

El spec menciona `Tarjetas (/cuentas/tarjetas)` en el drawer pero `app/(app)/cuentas/tarjetas/[id]/page.tsx` es detalle de una tarjeta individual. No hay página índice de tarjetas. El link del drawer a `/cuentas/tarjetas` devolvería 404.

**Propuesta**: En el drawer, apuntar "Tarjetas" a `/cuentas` (que ya muestra las tarjetas) o crear una página `/cuentas/tarjetas/page.tsx` simple. Segunda opción preferida pero sale del scope.

**Para este PR**: el link del drawer apunta a `/cuentas` con nota "ver tarjetas". Si Benja quiere página dedicada, es un follow-up.

### R6 — BUG PRE-EXISTENTE: `toISOString()` rompe timezone Argentina

En `app/(app)/ajustes/_components/plantillas-tab.tsx:163`:
```ts
fecha_inicio: data.fecha_inicio || new Date().toISOString().slice(0, 10),
```
`toISOString()` retorna UTC. En Argentina (UTC-3), si son las 21:30 hs, devuelve el día siguiente. Anotado en `BUGS_DETECTADOS.md`. **No se arregla en este PR.**

### R7 — revalidatePath necesita actualización (IMPACTO MEDIO — no rompe build)

Todas las server actions que mutaban `/ajustes` hacen `revalidatePath("/ajustes")`. Al migrar a rutas nuevas, esas llamadas deben actualizarse para invalidar las páginas correctas (`/perfil`, `/categorias`, `/plantillas`, etc.). De lo contrario, los cambios no se reflejan sin refresh manual.

**Acción**: actualizar los revalidatePath en cada action junto con la migración de la ruta correspondiente.

### R8 — Hidratación con usePathname en componentes futuros

Los nuevos componentes `<MobileBottomNav>`, `<DesktopSidebar>`, `<NavigationDrawer>` usarán `usePathname()`. Deben ser `"use client"`. Si accidentalmente se usan en un Server Component, Next.js tirará error en runtime. Chequear en cada archivo.

---

## 8. Resumen ejecutivo

| Ítem | Estado |
|------|--------|
| Layout actual | Header horizontal plano, sin sidebar |
| Sidebar desktop | No existe — crear de cero |
| `/ajustes` | Una página, 6 tabs, state local por tab |
| Extracción CapturaForm | LIMPIA — sin bloqueantes |
| shadcn faltantes críticos | `sheet.tsx`, `separator.tsx` |
| Links a /ajustes | 6 links de nav + 1 import de componente + 11 revalidatePath |
| Preferencias | Sin tab correspondiente — necesita decisión |
| Tabs sin destino | CuentasTab, TarjetasTab, PersonasGruposTab |
| Bug pre-existente | toISOString() en plantillas → BUGS_DETECTADOS.md |

**PASO 0 completado. Sin bloqueantes que impidan iniciar el PR. Las decisiones pendientes (R2, R3, R5) tienen propuestas concretas y pueden resolverse durante la implementación.**
