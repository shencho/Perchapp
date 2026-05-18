# SPEC_PASO_4.md — Refactor del layout principal

## Objetivo

Refactorear `app/(app)/layout.tsx` para preparar la arquitectura de la nueva navegación. Este PASO **NO** implementa los componentes funcionales de nav (eso es PASO 5). Solo prepara el **shell estructural** del layout y crea **placeholders** vacíos en los slots correctos.

Al cierre de este PASO, la app debe:
- Compilar y renderizar idéntica a como está hoy en desktop (sidebar funcional viejo se mantiene mientras se hace la transición)
- Tener el shell estructural listo para que el PASO 5 enchufe los componentes nuevos
- Tener los placeholders en sus posiciones correctas (vacíos pero presentes)

⚠️ **CRÍTICO**: este PASO debe ser visualmente NO disruptivo. El usuario que abra `/captura` debe ver lo mismo que ve hoy (sidebar desktop, sin bottom nav todavía porque los componentes nuevos están vacíos).

## Decisiones arquitectónicas (ya tomadas, NO cuestionar)

| Decisión | Resolución |
|----------|-----------|
| Ubicación de componentes de nav | `components/navigation/` |
| Detección mobile/desktop | CSS-only con Tailwind (`hidden md:flex` / `flex md:hidden`) |
| Padding para bottom nav | `pb-20 md:pb-0` en el wrapper del `{children}` |
| Breakpoint | `md:` = 768px (ya definido en proyecto) |
| Sidebar viejo | Se mantiene funcional durante PASO 4. Se reemplaza en PASO 5 |
| Componentes nuevos en este PASO | Solo **placeholders vacíos** (estructura, no contenido) |

---

## PASO 0 obligatorio — Diagnóstico

Antes de tocar código, generar `DIAGNOSTICO_LAYOUT.md` en la raíz con:

### 1. Inventario del layout actual

- Contenido completo de `app/(app)/layout.tsx` (qué imports, qué providers, qué wrappers)
- Es Server Component o Client Component
- Qué hace exactamente con `{children}` (qué padding, márgenes, max-width)
- Cómo está integrado el sidebar actual (componente, archivo, props que recibe)
- Cualquier provider, context, auth check, redirect, o side effect en el layout

### 2. Mapa de responsabilidades actuales

Para cada bloque del layout, marcar:
- 🟢 Se conserva sin tocar
- 🔵 Se mueve a otro lugar (especificar dónde)
- 🔴 Se elimina (especificar por qué)
- 🟡 Duda — preguntar a Benja

### 3. Identificación de acoplamientos

- ¿El sidebar actual recibe props del layout? ¿Cuáles?
- ¿Hay fetches en el layout que el sidebar consume?
- ¿Hay state, context, o provider que el sidebar lee?
- ¿Hay middleware o redirects que dependen del path actual?

### 4. Análisis del sidebar actual

- Path del archivo del sidebar viejo
- Qué items renderiza hoy
- ¿Es responsive? ¿Se oculta en mobile?
- ¿Cómo lo va a reemplazar el nuevo `DesktopSidebar`?

### 5. Plan de refactor propuesto

Orden de operaciones, archivos a crear/modificar.

### ⚠️ STOP CONDITION del PASO 0

Si el diagnóstico revela:
- El layout actual hace fetches server-side complejos (más que auth check)
- Hay context providers que requieren refactor para soportar la nueva nav
- El sidebar actual está acoplado a state global o context que el nuevo no tiene
- Hay middleware/redirects que asumen estructura actual

**PARAR y reportar a Benja** antes de implementar.

**IMPORTANTE**: cuando termines el diagnóstico, PARÁ y esperá luz verde de Benja antes de implementar.

---

## Estructura de archivos objetivo

```
components/
  navigation/
    app-header.tsx              ← NUEVO. Placeholder vacío.
    desktop-sidebar.tsx         ← NUEVO. Placeholder vacío.
    mobile-bottom-nav.tsx       ← NUEVO. Placeholder vacío.
    navigation-drawer.tsx       ← NUEVO. Placeholder vacío.
    perchita-fab.tsx            ← NUEVO. Placeholder vacío.
                                  (Nombre interno "perchita" por convención del backlog —
                                  rename a "mango-ai-fab" en PR futuro, NO ahora.)
    perchita-bottom-sheet.tsx   ← NUEVO. Placeholder vacío.

app/(app)/
  layout.tsx                    ← MODIFICADO. Nuevo shell estructural.
```

---

## Cambios concretos

### 1. Crear los 6 componentes placeholder en `components/navigation/`

Cada uno debe ser un Client Component (`'use client'`) MUY simple que renderice un wrapper vacío con clases CSS placeholder. Ejemplos:

#### `components/navigation/app-header.tsx`

```tsx
'use client';

export function AppHeader() {
  return (
    <header 
      data-placeholder="app-header" 
      className="hidden md:flex h-14 border-b border-border"
    >
      {/* Contenido real se implementa en PASO 5 */}
    </header>
  );
}
```

#### `components/navigation/desktop-sidebar.tsx`

```tsx
'use client';

export function DesktopSidebar() {
  return (
    <aside 
      data-placeholder="desktop-sidebar" 
      className="hidden md:flex w-60 border-r border-border"
    >
      {/* Contenido real se implementa en PASO 5 */}
    </aside>
  );
}
```

#### `components/navigation/mobile-bottom-nav.tsx`

```tsx
'use client';

export function MobileBottomNav() {
  return (
    <nav 
      data-placeholder="mobile-bottom-nav" 
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background"
    >
      {/* Contenido real se implementa en PASO 5 */}
    </nav>
  );
}
```

#### `components/navigation/navigation-drawer.tsx`

```tsx
'use client';

export function NavigationDrawer() {
  return (
    <div data-placeholder="navigation-drawer">
      {/* Drawer cerrado por default. Contenido y trigger en PASO 5 */}
    </div>
  );
}
```

#### `components/navigation/perchita-fab.tsx`

```tsx
'use client';

export function PerchitaFAB() {
  return (
    <button 
      data-placeholder="perchita-fab" 
      className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-10"
      aria-label="MANGO AI — Capturar movimiento"
    >
      {/* Estilo y onClick en PASO 5 */}
    </button>
  );
}
```

#### `components/navigation/perchita-bottom-sheet.tsx`

```tsx
'use client';

export function PerchitaBottomSheet() {
  return (
    <div data-placeholder="perchita-bottom-sheet">
      {/* Bottom sheet cerrado por default. Lógica en PASO 5 */}
    </div>
  );
}
```

⚠️ **Importante sobre los placeholders**:
- Los placeholders NO deben ser visibles al usuario (transparent, sin contenido, sin background visible más allá del estructural mínimo)
- Si algo se ve raro en pantalla post-PASO 4, es porque un placeholder se está mostrando indebidamente — PARAR y reportar
- El sidebar viejo sigue funcionando porque NO se elimina en este PASO

### 2. Modificar `app/(app)/layout.tsx`

Estructura objetivo (el código exacto depende del diagnóstico del PASO 0, pero la forma es esta):

```tsx
import { AppHeader } from '@/components/navigation/app-header';
import { DesktopSidebar } from '@/components/navigation/desktop-sidebar';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { NavigationDrawer } from '@/components/navigation/navigation-drawer';
import { PerchitaFAB } from '@/components/navigation/perchita-fab';
import { PerchitaBottomSheet } from '@/components/navigation/perchita-bottom-sheet';
// + sidebar viejo se mantiene importado mientras transicionamos
import { SidebarViejo } from '@/...'; // path real según diagnóstico

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      {/* DESKTOP: sidebar viejo (mientras DesktopSidebar placeholder esté vacío) */}
      <SidebarViejo />
      
      {/* DESKTOP: nuevo sidebar (placeholder, oculto efectivo por estar vacío) */}
      <DesktopSidebar />
      
      <div className="flex-1 flex flex-col">
        <AppHeader />
        
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>
      
      <MobileBottomNav />
      <PerchitaFAB />
      <NavigationDrawer />
      <PerchitaBottomSheet />
    </div>
  );
}
```

⚠️ **Coexistencia sidebar viejo + DesktopSidebar nuevo**:
Durante PASO 4 los dos están renderizados. El nuevo está VACÍO (placeholder), así que no se ve. El viejo sigue funcionando. En PASO 5 el flujo es:
1. Implementar `DesktopSidebar` con contenido real
2. Eliminar el sidebar viejo
3. Validar que la transición es invisible al usuario

**En este PASO no se elimina el sidebar viejo**.

### 3. Decidir entre wrapper genérico vs wrapper directo en `{children}`

La estructura propuesta usa `<main className="flex-1 pb-20 md:pb-0">{children}</main>`. Si el layout actual ya tiene un `<main>` o un wrapper específico, **respetar esa estructura** y solo agregar las clases `pb-20 md:pb-0` al wrapper correcto.

Si no hay wrapper, crear el `<main>` como en el ejemplo.

---

## Tests mentales (casos de borde)

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Abrir `/captura` en desktop | Sidebar viejo visible y funcional, app idéntica a hoy |
| 2 | Abrir `/captura` en mobile (DevTools) | Contenido visible, sin sidebar, sin bottom nav todavía (porque está vacío), padding `pb-20` aplicado |
| 3 | Navegar entre `/captura` → `/movimientos` → `/balances` | Funciona, layout se mantiene, sin re-mounts indeseados |
| 4 | DevTools React: inspeccionar árbol | Veo los 6 placeholders en el árbol con `data-placeholder` attributes |
| 5 | DevTools Console | Sin warnings nuevos de hidratación, keys, props |
| 6 | Auth check / redirect del layout (si existe) | Sigue funcionando igual |
| 7 | Scroll en una page larga en mobile | El scroll funciona, el contenido al final no queda tapado (gracias a `pb-20`) |
| 8 | Resize de ventana cruzando el breakpoint 768px | Transición suave, sin parpadeos, sin elementos rotos |

---

## Validación local (Benja, post Claude Code)

| # | Test | Esperado |
|---|------|----------|
| 1 | `npm run build` | OK, sin warnings nuevos de TypeScript |
| 2 | `npm run dev` y abrir `/captura` en desktop | Idéntico a antes del PASO 4 |
| 3 | Navegar `/captura` → `/movimientos` → `/balances` en desktop | Todo funciona como antes |
| 4 | DevTools en modo mobile (iPhone SE) | Contenido visible, sin sidebar, scroll OK |
| 5 | DevTools React: ver árbol del layout | Veo `AppHeader`, `DesktopSidebar`, `MobileBottomNav`, `NavigationDrawer`, `PerchitaFAB`, `PerchitaBottomSheet` |
| 6 | DevTools Elements: buscar `data-placeholder` | Aparecen los 6 placeholders en el DOM |
| 7 | DevTools Console | Sin warnings nuevos |
| 8 | Scroll a fondo de una page larga en mobile (ej. `/movimientos`) | El último item NO queda tapado por nada (sirve el `pb-20`) |
| 9 | Resize ventana de 1200px a 600px y volver | Sin parpadeos, sin layout shifts raros |

---

## Stop conditions para Claude Code

**PARAR y reportar a Benja** si:

1. El diagnóstico del PASO 0 revela acoplamientos complejos no anticipados (ver lista arriba)
2. El sidebar viejo requiere props o context que dificultan la coexistencia con el placeholder nuevo
3. Eliminar imports o reorganizar el layout rompe pages existentes
4. Build falla y no se puede arreglar en <15min
5. Aparecen errores de hidratación nuevos
6. El `pb-20 md:pb-0` rompe el layout de alguna page específica (porque tenía su propio bottom padding)
7. La transición de breakpoint 768px causa flashes o saltos visuales
8. El layout actual usa un sistema de routing/nested layouts incompatible con la propuesta

---

## Reglas para Claude Code (no negociables)

| Regla | Detalle |
|-------|---------|
| ❌ NO eliminar el sidebar viejo | Se mantiene funcional durante PASO 4. Se elimina en PASO 5. |
| ❌ NO implementar contenido de los placeholders | Son shells vacíos. El contenido real es PASO 5. |
| ❌ NO renombrar archivos con "perchita" en el nombre | `perchita-fab.tsx` y `perchita-bottom-sheet.tsx` se llaman así por ahora (rename = backlog) |
| ❌ NO modificar páginas individuales para acomodar el nuevo padding | Si una page rompe, anotarlo en `BUGS_DETECTADOS.md` y discutirlo. |
| ❌ NO modificar server actions, /api/, ni componentes ajenos al layout | Out of scope |
| ❌ NO push automático | Solo commit local en `feat/navegacion-reformada` |
| ✅ Build debe pasar antes de commitear | `npm run build` verde |
| ✅ Generar `DIAGNOSTICO_LAYOUT.md` PRIMERO | Antes de tocar una sola línea de código productivo |
| ✅ Reportar antes/después con tabla | Mismo formato que el reporte de PASO 3 |
| ✅ Si dudás de algo | Parar y preguntar |

---

## Commit final

Cuando Claude Code termine la validación interna:

```
PASO 4: refactor del layout principal

- 6 componentes placeholder creados en components/navigation/:
  app-header, desktop-sidebar, mobile-bottom-nav,
  navigation-drawer, perchita-fab, perchita-bottom-sheet
- Layout principal con shell estructural nuevo
- pb-20 md:pb-0 en wrapper de {children} para bottom nav mobile
- Sidebar viejo mantenido funcional (se elimina en PASO 5)
- CSS-only mobile/desktop con Tailwind (hidden md:flex / flex md:hidden)
- PASO 0: DIAGNOSTICO_LAYOUT.md generado

Sin cambios visuales para el usuario. Habilita PASO 5
(implementación real de los componentes de nav).
```

---

## Riesgos no obvios ⚠️

| Riesgo | Mitigación |
|--------|-----------|
| El sidebar viejo y el `DesktopSidebar` placeholder se renderizan ambos en desktop | OK, porque el placeholder está vacío y no ocupa espacio visual. Pero validar en DevTools que no haya doble border o doble padding fantasma |
| `pb-20 md:pb-0` puede romper pages que ya tenían su propio bottom padding | El diagnóstico debe identificar pages con padding bottom custom. Si alguna rompe, anotar en BUGS_DETECTADOS pero NO arreglar en este PASO |
| `position: fixed` del `MobileBottomNav` y `PerchitaFAB` puede interactuar mal con elementos sticky de pages | Como están vacíos en PASO 4, no se va a notar. Pero podría aparecer en PASO 5. Anotarlo. |
| El layout actual puede ser Server Component y los nuevos componentes son Client. Crossing the boundary | OK, los Client Components pueden ser children de Server Components. No requiere convertir el layout a Client. |
| Auth checks en el layout (si existen) deben preservarse intactos | El diagnóstico los va a identificar. Solo mover/reorganizar, nunca eliminar. |

---

## Próximo paso al cerrar PASO 4

PASO 5: implementar contenido real de los 6 componentes de nav, eliminar sidebar viejo, conectar el FAB con `<CapturaForm variant="sheet" />` extraído en PASO 3.
