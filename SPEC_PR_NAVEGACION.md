# SPEC — PR Navegación Reformada (MANGO)

**Para**: Claude Code (modo autónomo, 3–5 horas)
**Branch**: `feat/navegacion-reformada` (crear desde `main`)
**Modo**: `claude --dangerously-skip-permissions` autorizado para refactors triviales (find/replace, mover archivos). Para cambios de arquitectura, modo normal.
**NO push automático**: dejar todo commiteado en local. Benja valida con `pnpm dev` y `pnpm build` antes de pushear.

---

## 0. Objetivo

Reformar la navegación de la app MANGO para que tenga UX moderna mobile-first sin perder la sidebar de desktop. Eliminar `/ajustes` como contenedor de tabs y promover sus sub-pantallas a rutas top-level accesibles desde el drawer hamburguesa.

### Resultado esperado al final del PR

**Mobile (`< 768px`)**:
- Header arriba con hamburguesa izquierda + logo MANGO centro + acciones derecha
- Bottom navbar fijo con 5 items: **Home / Movimientos / 🥭 Perchita (FAB centro) / Cuentas / Más (icon hamburguesa)**
- FAB Perchita destacado, abre bottom sheet sobre la pantalla actual (no navega)
- "Más" abre el mismo drawer que la hamburguesa de arriba
- Bottom navbar respeta safe-area-inset-bottom (iOS notch)

**Desktop (`≥ 768px`)**:
- Sidebar lateral fija a la izquierda con items principales (los del navbar mobile + Tarjetas, Préstamos, Inversiones, Balances, Cash Flow, Clientes)
- Header arriba con hamburguesa izquierda (al lado del logo del sidebar) + acciones derecha
- Hamburguesa abre el mismo drawer que en mobile (con TODOS los items)
- No hay bottom navbar
- No hay FAB

**Drawer (mobile + desktop)**:
- Lista completa de TODAS las pantallas, agrupadas por sección
- Sección "Navegación principal", "Configuración", "Cuenta"

---

## 1. Decisiones tomadas (NO cuestionar)

| # | Decisión | Valor |
|---|----------|-------|
| 1 | Breakpoint mobile/desktop | `md:` Tailwind (768px) |
| 2 | Bottom navbar mobile | 5 items: Home / Movimientos / Perchita / Cuentas / Más |
| 3 | Drawer hamburguesa | Visible en mobile + desktop |
| 4 | Sidebar desktop | Se mantiene (refactor para mostrar solo items principales) |
| 5 | FAB Perchita en `/captura` | Esconder (no se renderiza) |
| 6 | `/ajustes` | ELIMINAR. Todo se mueve a rutas top-level: `/perfil`, `/preferencias`, `/categorias`, `/plantillas` |
| 7 | Bottom sheet de Perchita | Se renderiza encima de la pantalla actual, no navega |
| 8 | Componente `<CapturaForm />` | Extraer de `/captura/page.tsx` para reusar en bottom sheet |
| 9 | Estilo visual | Mantener paleta y tipografía actuales (PR2 cambia paleta + Manrope, NO en este PR) |
| 10 | Mensajes de commit | Atómicos por sub-feature (5 commits sugeridos al final) |

---

## 2. PASO 0 — DIAGNÓSTICO OBLIGATORIO (antes de tocar código)

⚠️ **NO escribir ni una línea de código antes de completar este paso.** Generar archivo `DIAGNOSTICO_NAV.md` en raíz del repo con findings. Este archivo se commitea en el primer commit.

### 2.1 Inventario de layout actual

Leer y reportar contenido y estructura de:
- `app/layout.tsx` (root)
- `app/(app)/layout.tsx` (si existe — si no, listar dónde está montada la sidebar/header)
- `components/shared/header.tsx`
- Cualquier archivo `sidebar*.tsx` o `nav*.tsx` en `components/`
- `app/globals.css` — buscar reglas de viewport, padding-bottom para nav, safe-area, z-index

### 2.2 Inventario de rutas

Listar todas las carpetas de:
- `app/(app)/*` con su `page.tsx` correspondiente
- `app/(auth)/*`
- `app/onboarding/*`
- `app/api/*` (solo nombrar, no entrar al detalle)

Reportar como tabla en `DIAGNOSTICO_NAV.md`:

| Ruta | Path archivo | ¿Tiene sub-rutas? | ¿Aparece en nav actual? |
|------|--------------|-------------------|-------------------------|
| `/dashboard` | `app/(app)/dashboard/page.tsx` | no | sí (Home) |
| ... | | | |

### 2.3 Inventario de `/ajustes`

Estructura completa de `app/(app)/ajustes/` y sus archivos:
- ¿Es una sola página con tabs internos? ¿O sub-rutas tipo `/ajustes/categorias`?
- Listar cada tab/sección con su contenido (qué componentes monta)
- Identificar qué state local tiene (URL search params, useState, server actions invocadas)
- Identificar imports compartidos entre tabs

### 2.4 Inventario de `/captura`

- Leer `app/(app)/captura/page.tsx` y todos sus componentes hijos
- Identificar:
  - ¿Es Client Component (`"use client"`) o Server Component con hydration?
  - State local: useState, useReducer, context
  - Server actions invocadas
  - Props que vienen del server (categorías, clientes, servicios, personas, grupos)
  - Modales que abre (revision modal, editor)
  - Hooks custom (si los hay)
- **Mapear claramente qué parte es "data fetching" (server) vs "form UI + lógica" (client)** — esto define qué se extrae al componente `<CapturaForm />`

### 2.5 Búsqueda de links a `/ajustes`

Ejecutar grep en toda la codebase:
```bash
grep -rn "/ajustes" --include="*.tsx" --include="*.ts" --include="*.md"
```

Listar TODAS las apariciones (links `<Link href="/ajustes">`, `router.push("/ajustes")`, redirects, mensajes hardcodeados, etc.). Esta lista se usa en PASO 8 para reemplazar.

### 2.6 Inventario de shadcn instalados

Verificar en `components/ui/` qué primitivas están disponibles:
- `sheet.tsx` (esencial — drawer y bottom sheet usan Sheet)
- `drawer.tsx` (alternativa de Vaul)
- `dialog.tsx`
- `tabs.tsx`
- `separator.tsx`
- `button.tsx`
- `dropdown-menu.tsx`

Si falta alguno, reportar para que se agregue con `npx shadcn@latest add [nombre]`.

### 2.7 Reporte final del PASO 0

`DIAGNOSTICO_NAV.md` debe contener:
1. Estructura actual del layout (qué está montado dónde)
2. Tabla completa de rutas
3. Estructura de `/ajustes` con sus tabs
4. Estructura de `/captura` con qué se extrae al componente
5. Lista de archivos que linkean a `/ajustes`
6. Componentes shadcn faltantes (si los hay)
7. **Riesgos detectados**: cualquier acoplamiento raro, hardcodes, state inconsistente, etc.

⚠️ Si en este paso encontrás que `/captura` tiene state que no se puede separar limpiamente del archivo de página (ej: usa hooks de Next como `useSearchParams` con lógica embebida), parar y dejar nota en `DIAGNOSTICO_NAV.md`. NO inventar workaround. Reportar y esperar.

---

## 3. PASO 1 — Plan de arquitectura

Después del diagnóstico, generar `PLAN_NAV.md` (también se commitea) con:

### 3.1 Lista final del bottom navbar mobile (5 items)

| # | Label | Icon (lucide-react) | Ruta destino | Comportamiento |
|---|-------|---------------------|--------------|----------------|
| 1 | Home | `Home` | `/dashboard` | navega |
| 2 | Movimientos | `ArrowLeftRight` | `/movimientos` | navega |
| 3 | Perchita | (logo M placeholder + emoji 🥭) | — | abre `<PerchitaBottomSheet />` (no navega) |
| 4 | Cuentas | `Wallet` | `/cuentas` | navega |
| 5 | Más | `Menu` | — | abre `<NavigationDrawer />` |

### 3.2 Lista final del drawer (TODOS los items)

**Sección "Navegación principal"**:
- Dashboard (`/dashboard`)
- Movimientos (`/movimientos`)
- Captura / Perchita (`/captura`) — link a la pantalla full, no abre el sheet
- Cuentas (`/cuentas`)
- Tarjetas (`/cuentas/tarjetas` — confirmar ruta exacta en PASO 0)
- Préstamos (`/prestamos`)
- Inversiones (si existe ruta dedicada — confirmar en PASO 0)
- Balances (`/balances`)
- Cash Flow (`/cash-flow`)
- Clientes (`/clientes`)

**Sección "Configuración"** (rutas nuevas):
- Categorías (`/categorias`)
- Plantillas recurrentes (`/plantillas`)
- Preferencias (`/preferencias`)

**Sección "Cuenta"**:
- Perfil (`/perfil`)
- Cerrar sesión (action, no link)

⚠️ La lista exacta puede variar según lo que descubra PASO 0. Ajustar antes de implementar.

### 3.3 Lista final del sidebar desktop

Solo items de la sección "Navegación principal" del drawer. NO incluye items de Configuración ni Cuenta — esos se acceden vía hamburguesa → drawer.

---

## 4. PASO 2 — Migración de `/ajustes` a rutas independientes

⚠️ **Este paso se hace ANTES del refactor de navegación.** Razón: cuando refactoreemos la nav, los links del drawer apuntan a las rutas nuevas. Si las rutas nuevas no existen, links rotos.

### 4.1 Crear rutas nuevas

Crear:
- `app/(app)/perfil/page.tsx`
- `app/(app)/preferencias/page.tsx`
- `app/(app)/categorias/page.tsx`
- `app/(app)/plantillas/page.tsx`

Cada una monta lo que era el tab correspondiente de `/ajustes`. Server Components donde aplica, Client Components donde el tab original lo era.

### 4.2 Mover componentes de tab a su ruta

Si `/ajustes` tenía `components/ajustes/categorias-tab.tsx`, `plantillas-tab.tsx`, etc:
- Mover a `components/categorias/categorias-page-content.tsx` (renombrar, sacar referencias a "tab")
- Idem para `plantillas`, `perfil`, `preferencias`
- Eliminar la lógica de tabs de `/ajustes` (no la necesitamos)

### 4.3 Eliminar `/ajustes`

- Borrar `app/(app)/ajustes/page.tsx` y carpeta entera si solo tenía la página
- Crear redirect: en `next.config.js` o vía `redirect()` server-side, mapear `/ajustes` → `/perfil` (302 o 308)
- Si quedan archivos huérfanos en `components/ajustes/`, eliminarlos

### 4.4 Reemplazar todos los links a `/ajustes`

Usando la lista de PASO 0 (sección 2.5), reemplazar uno por uno:
- `<Link href="/ajustes">` → `<Link href="/perfil">` (o lo que corresponda según contexto)
- `router.push("/ajustes")` → `router.push("/perfil")`
- Mensajes hardcodeados (toasts, descripciones) → actualizar

⚠️ **No hacer find-and-replace ciego.** Algunos links pueden apuntar a un tab específico tipo `/ajustes?tab=categorias`. Esos van a `/categorias` directo.

### 4.5 Verificar build

Después de este paso correr `pnpm build` y arreglar errores de tipos / imports rotos antes de seguir.

### 4.6 Commit

```
feat: migrar /ajustes a rutas independientes (perfil/preferencias/categorias/plantillas)

- Crear /perfil, /preferencias, /categorias, /plantillas
- Mover contenido de cada tab de /ajustes a su ruta propia
- Redirect /ajustes -> /perfil
- Reemplazar todos los links internos
- Eliminar app/(app)/ajustes/

[Cierre 008]
```

---

## 5. PASO 3 — Extracción de `<CapturaForm />`

### 5.1 Crear componente reusable

`components/captura/captura-form.tsx` debe:
- Recibir TODA la data como props (categorías, clientes, servicios_cliente, personas, grupos, etc.)
- Ser Client Component (`"use client"`)
- NO hacer fetching propio — el padre se encarga
- Aceptar prop `onSuccess?: () => void` para que el padre reaccione (cerrar modal, redirigir, etc.)
- Aceptar prop `variant?: "page" | "sheet"` por si hay diferencias visuales mínimas (paddings, max-width)

### 5.2 Refactorear `app/(app)/captura/page.tsx`

- La página queda como Server Component
- Hace los queries (categorías, clientes, etc.)
- Pasa todo como props a `<CapturaForm variant="page" />`

### 5.3 Garantizar paridad funcional

Antes de seguir, validar que la extracción NO rompió nada:
- Captura de un movimiento personal funciona
- Captura de un movimiento profesional con cliente y servicio funciona
- Editor de movimiento (revision modal) abre y cierra
- Toasts de éxito/error siguen apareciendo
- Pre-fill desde alertas (plantillas pendientes) sigue funcionando si aplica

### 5.4 Commit

```
chore: extraer <CapturaForm /> reusable de /captura

- components/captura/captura-form.tsx recibe data por props
- /captura/page.tsx hace queries y pasa props
- Prop onSuccess para que el caller reaccione
- Prop variant para diferencias mínimas page vs sheet

[Cierre 008]
```

---

## 6. PASO 4 — Refactor del layout principal

### 6.1 Estructura objetivo de `app/(app)/layout.tsx`

```tsx
// Pseudocódigo conceptual — Claude Code adapta a la estructura real
<NavigationProvider>
  <div className="min-h-screen flex">
    {/* Sidebar desktop: visible md+ */}
    <DesktopSidebar className="hidden md:flex" />

    <div className="flex-1 flex flex-col">
      <AppHeader /> {/* hamburguesa + logo + acciones, mobile y desktop */}

      <main className="flex-1 pb-20 md:pb-0">
        {/* pb-20 mobile para que bottom navbar no tape contenido */}
        {children}
      </main>

      <MobileBottomNav className="md:hidden" />
    </div>

    {/* Drawer (overlay): mobile + desktop */}
    <NavigationDrawer />

    {/* Bottom sheet de Perchita: mobile only, oculto si pathname === /captura */}
    <PerchitaBottomSheet className="md:hidden" />
  </div>
</NavigationProvider>
```

### 6.2 NavigationProvider (context para abrir/cerrar drawer y sheet)

Crear `lib/navigation/navigation-provider.tsx` con:
- State: `isDrawerOpen`, `isPerchitaSheetOpen`
- Actions: `openDrawer`, `closeDrawer`, `openPerchitaSheet`, `closePerchitaSheet`, `toggleDrawer`
- Hook: `useNavigation()`

Razón: el FAB del bottom navbar y el botón de hamburguesa del header tienen que poder abrir el mismo drawer/sheet. Pasar props down es feo. Context simple.

### 6.3 Padding-bottom condicional

Mobile: `pb-20` (≈ 80px) en `<main>` para que el contenido no quede tapado por el bottom navbar.
Si el navbar usa `env(safe-area-inset-bottom)` por iOS, ajustar a `pb-[calc(5rem+env(safe-area-inset-bottom))]`.

Desktop: `pb-0`.

---

## 7. PASO 5 — Componentes nuevos

### 7.1 `<AppHeader />`

`components/shared/app-header.tsx` (renombrar el `header.tsx` actual o crear nuevo y migrar)

```
[Hamburguesa]  [Logo MANGO + texto]  [spacer]  [acciones: avatar/notificaciones]
```

- Hamburguesa: `<Button variant="ghost" size="icon" onClick={toggleDrawer}><Menu /></Button>`
- Logo: el placeholder SVG de `/public/icons/favicon.svg` + texto "MANGO" (ya existe del PR1a)
- Acciones derecha: avatar usuario (link a `/perfil`) — si existían notificaciones u otro botón, mantenerlos
- Sticky top: `sticky top-0 z-40 bg-background border-b`
- Visible mobile y desktop. La hamburguesa siempre se muestra (tanto en mobile como en desktop).

### 7.2 `<DesktopSidebar />`

`components/shared/desktop-sidebar.tsx`

- Refactorear la sidebar actual para que muestre SOLO los items de la sección "Navegación principal" del drawer
- Items con icono lucide + label
- Estado activo según `usePathname()`
- Visible solo md+ (`hidden md:flex`)
- Width fija: `w-64` o lo que tenga hoy
- Logo arriba (igual al del header) + lista de items

### 7.3 `<MobileBottomNav />`

`components/shared/mobile-bottom-nav.tsx`

```
[Home]  [Movimientos]  [🥭 Perchita FAB]  [Cuentas]  [Más]
```

- Container: `fixed bottom-0 left-0 right-0 z-40 bg-background border-t flex items-center justify-around`
- Padding: `pb-[env(safe-area-inset-bottom)]` para iOS notch
- Altura: `h-16` (los items normales) + safe area
- Items 1, 2, 4, 5: `<Link>` con icon arriba + label chico debajo, color primario si activo
- Item 3 (FAB): es el `<PerchitaFAB />`, posicionado de forma que sobresale arriba del navbar

### 7.4 `<PerchitaFAB />`

`components/shared/perchita-fab.tsx`

- Botón circular destacado, sobresale del navbar (transform `-translate-y-1/2` o similar para que quede más arriba)
- Tamaño: `h-14 w-14` aprox
- Color: bg navy `#1e3a5f` con texto crema (placeholder M + emoji 🥭)
- Sombra: `shadow-lg`
- onClick: `openPerchitaSheet()` desde `useNavigation()`
- ⚠️ **Si `usePathname() === "/captura"`, retornar `null`** (esconder)
- Aria-label: "Abrir Perchita"

### 7.5 `<NavigationDrawer />`

`components/shared/navigation-drawer.tsx`

- Usa shadcn `Sheet` con `side="left"`
- Open state desde `useNavigation()`
- Width: `w-80` o `w-72` según estética
- Contenido:
  - Header del drawer: logo MANGO + nombre usuario + email
  - Sección "Navegación principal" con lista de items
  - Separator
  - Sección "Configuración" con lista de items
  - Separator
  - Sección "Cuenta": Perfil + botón "Cerrar sesión" (server action existente)
- Cada item: icon + label, con estado activo según `usePathname()`
- Click en item: navega + cierra drawer
- Visible mobile + desktop. La hamburguesa siempre lo abre.

### 7.6 `<PerchitaBottomSheet />`

`components/shared/perchita-bottom-sheet.tsx`

- Usa shadcn `Sheet` con `side="bottom"`
- Open state desde `useNavigation()`
- Altura: `h-[85vh]` con `max-h-[85vh]` para que se vea pantalla detrás
- Contenido: monta `<CapturaForm variant="sheet" onSuccess={closePerchitaSheet} />`
- ⚠️ Necesita las MISMAS props que `<CapturaForm />` espera (categorías, clientes, etc.)
  - **Solución**: el bottom sheet hace fetch de la data al abrirse (Client Component con `useEffect` que llama a una server action `getCapturaData()`) — para no hidratar todo siempre
  - Mostrar skeleton mientras carga
  - Alternativa: precargar la data en el layout y pasar por context (más rápido pero hidrata siempre)
  - **Mi recomendación**: lazy fetch al abrir. Sentido común: el sheet se abre rara vez relativo a cada navegación.
- ⚠️ Confirmar antes de cerrar si hay input escrito (avoid accidental data loss): si el form tiene state dirty, `onOpenChange` muestra confirm.
- Solo mobile (`md:hidden`). En desktop, el FAB no existe y el acceso a Perchita es por la ruta `/captura`.

### 7.7 Iconos sugeridos (lucide-react)

| Item | Icon |
|------|------|
| Dashboard | `Home` |
| Movimientos | `ArrowLeftRight` |
| Captura | `Sparkles` o `MessageCircle` |
| Cuentas | `Wallet` |
| Tarjetas | `CreditCard` |
| Préstamos | `Landmark` o `HandCoins` |
| Inversiones | `TrendingUp` |
| Balances | `Scale` |
| Cash Flow | `LineChart` |
| Clientes | `Briefcase` o `Users` |
| Categorías | `Tags` |
| Plantillas | `Repeat` |
| Preferencias | `Settings` |
| Perfil | `User` |
| Cerrar sesión | `LogOut` |
| Hamburguesa | `Menu` |

### 7.8 Commit

```
feat: AppHeader con hamburguesa + NavigationDrawer mobile+desktop

- AppHeader sticky con hamburguesa, logo, acciones
- NavigationDrawer con secciones: Principal / Configuración / Cuenta
- DesktopSidebar refactor: solo items principales
- NavigationProvider context para state del drawer y sheet

[Cierre 008]
```

```
feat: MobileBottomNav con PerchitaFAB y BottomSheet

- 5 items: Home / Movimientos / Perchita FAB / Cuentas / Más
- FAB se esconde en /captura
- PerchitaBottomSheet monta CapturaForm con lazy fetch de data
- Safe-area-inset-bottom para iOS notch

[Cierre 008]
```

---

## 8. PASO 6 — Active states y rutas

Crear helper `lib/navigation/use-active-route.ts`:

```tsx
"use client"
import { usePathname } from "next/navigation"

export function useActiveRoute() {
  const pathname = usePathname()

  return (route: string) => {
    if (route === "/dashboard") return pathname === "/dashboard"
    return pathname === route || pathname.startsWith(route + "/")
  }
}
```

Usar en `<MobileBottomNav />`, `<DesktopSidebar />`, `<NavigationDrawer />` para destacar item activo (`text-primary` + `bg-accent` o lo que corresponda al estilo actual).

⚠️ Caso borde: `/cuentas` debe estar activo cuando estás en `/cuentas/tarjetas/[id]`. La función de arriba lo cubre con `startsWith`.

---

## 9. PASO 7 — Safe area iOS y z-index

### 9.1 Safe area

En `app/globals.css` agregar:

```css
@supports (padding: env(safe-area-inset-bottom)) {
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .pb-nav-mobile {
    padding-bottom: calc(5rem + env(safe-area-inset-bottom));
  }
}
```

Aplicar `pb-nav-mobile` en `<main>` mobile en lugar de `pb-20`.

Aplicar `pb-safe` en el bottom navbar.

### 9.2 Jerarquía de z-index

| Elemento | z-index |
|----------|---------|
| `<main>` content | auto (0) |
| `<DesktopSidebar />` | 30 |
| `<AppHeader />` | 40 |
| `<MobileBottomNav />` | 40 |
| `<PerchitaFAB />` | 50 |
| `<PerchitaBottomSheet />` (overlay shadcn) | 50 |
| `<NavigationDrawer />` (overlay shadcn) | 50 |
| Toasts existentes | 60+ |

shadcn Sheet default ya usa z-50 con overlay en z-50 — verificar y ajustar si choca con el FAB.

⚠️ El FAB no debe quedar visible cuando el sheet está abierto. shadcn Sheet renderiza un overlay full-screen que cubre todo, así que naturalmente el FAB queda detrás.

---

## 10. PASO 8 — Búsqueda final de links rotos

Después de todo el refactor, correr:

```bash
grep -rn "/ajustes" --include="*.tsx" --include="*.ts" src app components lib
```

Resultado esperado: vacío. Si aparece algo:
- Si es comentario o doc, dejar (no afecta runtime)
- Si es código, reemplazar por la ruta nueva correcta

También buscar:
```bash
grep -rn "ajustes-tab\|ajustesTab\|tabAjustes" --include="*.tsx" --include="*.ts"
```

Y limpiar referencias huérfanas.

---

## 11. PASO 9 — Testing manual exhaustivo

⚠️ **No saltar.** Antes del commit final, ejecutar TODO el checklist. Documentar resultados en `TESTING_NAV.md` (no se commitea, solo para Benja revisar).

### 11.1 Mobile (DevTools → iPhone 14 Pro o similar, 390x844)

- [ ] Bottom navbar visible en todas las pantallas
- [ ] Bottom navbar respeta safe area (probar con preset iPhone 14 Pro)
- [ ] FAB Perchita centrado, sobresale del navbar
- [ ] Click en Home → navega a /dashboard, item Home queda activo
- [ ] Click en Movimientos → /movimientos, activo
- [ ] Click en Cuentas → /cuentas, activo
- [ ] Estando en /cuentas/tarjetas/[id], el item Cuentas queda activo (no Más)
- [ ] Click en Más → abre drawer con secciones Principal / Configuración / Cuenta
- [ ] Click en hamburguesa arriba → abre el MISMO drawer
- [ ] Drawer abierto: click en Perfil → navega a /perfil + drawer se cierra
- [ ] Drawer abierto: click en Cerrar sesión → cierra sesión + redirige a /login
- [ ] Click en FAB Perchita → abre bottom sheet con CapturaForm cargando data
- [ ] Bottom sheet abierto: input texto y enviar → captura el movimiento + sheet se cierra
- [ ] Estando en /captura, el FAB Perchita NO se renderiza (debe estar oculto)
- [ ] En /captura, los demás items del navbar siguen funcionando
- [ ] El header con hamburguesa visible en todas las pantallas mobile
- [ ] Bottom sheet con input dirty: cerrar → muestra confirm "tenés cambios sin guardar"

### 11.2 Desktop (1440x900)

- [ ] Sidebar lateral visible con items principales solamente
- [ ] Sidebar item activo con estado visual claro
- [ ] Hamburguesa visible arriba en el header
- [ ] Click en hamburguesa → abre drawer con TODOS los items (incluidos los de configuración)
- [ ] Bottom navbar NO visible
- [ ] FAB Perchita NO visible
- [ ] Click en items del sidebar → navega correctamente
- [ ] Click en items del drawer → navega + drawer se cierra
- [ ] /captura sigue siendo accesible por URL y desde el drawer

### 11.3 Migración de /ajustes

- [ ] /perfil renderiza el contenido de Perfil correctamente
- [ ] /preferencias renderiza Preferencias
- [ ] /categorias renderiza Categorías + funciona "Importar desde sugeridas"
- [ ] /plantillas renderiza Plantillas recurrentes + funciona crear/editar/borrar
- [ ] /ajustes redirige a /perfil
- [ ] Build pasa sin errores ni warnings de tipos
- [ ] No quedan links rotos en la app

### 11.4 Edge cases

- [ ] Drawer abierto en mobile + rotar a landscape → no rompe layout
- [ ] Resize de ventana: 375px → 768px → 1440px → componentes correctos en cada breakpoint
- [ ] Backbutton del navegador: funciona como esperado en todas las nav
- [ ] Refresh estando en /perfil, /preferencias, /categorias, /plantillas → carga sin errores
- [ ] Refresh estando en /ajustes → redirige a /perfil sin error
- [ ] Captura desde el bottom sheet con error de servidor → muestra toast, sheet sigue abierto
- [ ] Estado activo del navbar/sidebar se actualiza al navegar por links internos (no solo al click directo)

### 11.5 Lighthouse / Build

- [ ] `pnpm build` pasa
- [ ] No warnings nuevos en consola
- [ ] No errores de hidratación

---

## 12. PASO 10 — Commits y cierre

### 12.1 Estructura final de commits

Sugerencia (ajustar si Claude Code prefiere otra granularidad):

1. `chore: PASO 0 diagnostico navegacion (DIAGNOSTICO_NAV.md, PLAN_NAV.md)` — solo docs
2. `feat: migrar /ajustes a rutas independientes (perfil/preferencias/categorias/plantillas)`
3. `chore: extraer <CapturaForm /> reusable de /captura`
4. `feat: AppHeader con hamburguesa + NavigationDrawer mobile+desktop`
5. `feat: MobileBottomNav con PerchitaFAB y BottomSheet`
6. `refactor: DesktopSidebar limpia (solo items principales)`

Cada commit debe dejar la app **funcionando** (no romper la app a medias).

### 12.2 NO push automático

Al final del PR, dejar todo commiteado en `feat/navegacion-reformada` y mostrar a Benja:
- Lista de commits
- Diff resumido (`git log --stat main..feat/navegacion-reformada`)
- Resultado del último `pnpm build`
- Resultado del checklist de testing manual

Benja valida en local con `pnpm dev`, hace ajustes si hace falta, y pushea.

---

## 13. Riesgos detectados (mitigaciones incluidas)

| ⚠️ Riesgo | Mitigación |
|-----------|------------|
| Extracción de `<CapturaForm />` rompe lógica si hay state acoplado a la página | PASO 0 audita; si está acoplado, parar y reportar antes de tocar |
| Migración de `/ajustes` rompe links externos guardados (bookmarks, mensajes en chat de soporte) | Redirect 308 de `/ajustes` → `/perfil` |
| Bottom navbar tapa contenido si falta padding en `<main>` | `pb-nav-mobile` con safe-area; testear en iPhone preset |
| FAB Perchita visible en /captura confunde | Render condicional con `usePathname()` |
| Sheet cierra accidentalmente con input dirty → pérdida de datos | Confirm en `onOpenChange` si form dirty |
| z-index conflicts entre FAB, navbar, sheet | Tabla de z-index documentada y testeada |
| Hot reload muestra fantasmas tras refactor de layout | `rm -rf .next` antes de `pnpm dev` final |
| Hidratación con `usePathname()` en componentes server | Todos los componentes con `usePathname()` deben ser `"use client"` |
| Drawer en desktop tapa la sidebar al abrirse | shadcn Sheet usa overlay; si molesta, considerar margin-left desktop |
| `pnpm build` falla por imports rotos tras eliminar /ajustes | Hacer grep antes del commit final + build local antes de cerrar |

---

## 14. Anexo: estructura final de archivos

### Nuevos archivos
```
app/(app)/perfil/page.tsx
app/(app)/preferencias/page.tsx
app/(app)/categorias/page.tsx
app/(app)/plantillas/page.tsx

components/captura/captura-form.tsx
components/shared/app-header.tsx
components/shared/desktop-sidebar.tsx
components/shared/mobile-bottom-nav.tsx
components/shared/navigation-drawer.tsx
components/shared/perchita-fab.tsx
components/shared/perchita-bottom-sheet.tsx

components/categorias/categorias-page-content.tsx
components/plantillas/plantillas-page-content.tsx
components/perfil/perfil-page-content.tsx
components/preferencias/preferencias-page-content.tsx

lib/navigation/navigation-provider.tsx
lib/navigation/use-active-route.ts

DIAGNOSTICO_NAV.md
PLAN_NAV.md
```

### Archivos modificados
```
app/(app)/layout.tsx (refactor mayor)
app/globals.css (safe-area utilities)
app/(app)/captura/page.tsx (usa CapturaForm)
components/shared/header.tsx (renombrado o eliminado en favor de AppHeader)
next.config.js (redirect /ajustes -> /perfil)
```

### Archivos eliminados
```
app/(app)/ajustes/page.tsx
app/(app)/ajustes/ (carpeta entera si solo tenía page.tsx)
components/ajustes/* (después de mover su contenido)
```

---

## 15. Reglas finales para modo autónomo

1. **Si encontrás algo no previsto en este spec**: parar, documentar en `DIAGNOSTICO_NAV.md` o un archivo nuevo `BLOQUEOS.md`, NO inventar workaround.
2. **Si el build falla en cualquier paso**: arreglar antes de seguir. No acumular errores.
3. **Si la extracción de CapturaForm es demasiado compleja por state acoplado**: hacer una versión simplificada que monte la página completa adentro del Sheet con `<iframe>` o similar **NO** — mejor reportar y esperar instrucciones.
4. **Commits atómicos**: cada uno debe dejar la app funcionando. Si para "funcionar" hace falta el siguiente, agruparlos.
5. **Testing manual** del PASO 9 es OBLIGATORIO. No saltar para "ahorrar tiempo".
6. **No push** al final. Dejar commits en local + reporte.
7. **Si encontrás bugs pre-existentes** (ej: el `toISOString()` que rompe timezone Argentina mencionado en el resumen), NO arreglarlos en este PR. Anotar en `BUGS_DETECTADOS.md`.

---

## 16. Output final esperado

Cuando termines, mostrar a Benja:

1. **Lista de commits** generados con su mensaje
2. **Resultado de `pnpm build`** (debe pasar sin errores)
3. **Resultado del checklist de testing manual** (PASO 9)
4. **Archivos**: DIAGNOSTICO_NAV.md, PLAN_NAV.md, opcionalmente BUGS_DETECTADOS.md o BLOQUEOS.md si aplica
5. **Branch lista para push**: `feat/navegacion-reformada`
6. **Pendientes detectados** que no entraron en el PR (para próximas sesiones)

---

**Fin del spec. Empezar por PASO 0. NO saltarse pasos.**
