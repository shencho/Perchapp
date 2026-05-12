# SPEC_PASO_5.md — Implementación completa de la nueva navegación

## Objetivo

Implementar el contenido real de los 6 componentes de navegación (creados como placeholders en PASO 4), eliminar el Header horizontal viejo, y dejar la nueva arquitectura de navegación completamente funcional.

Al cierre de este PASO, la app debe:
- Tener bottom navbar mobile con 5 items + FAB 🥭 centro
- Tener sidebar lateral desktop con branding arriba + botón destacado "MANGO AI" + items de nav
- Tener un NavigationDrawer (Sheet side="left") accesible desde "Más" en mobile y hamburguesa en desktop
- Tener un PerchitaBottomSheet (Sheet side="bottom") que abre desde el FAB / botón MANGO AI
- Eliminar `components/shared/header.tsx`
- Cambiar el outer div del layout a `md:flex-row`

⚠️ Este PASO es **monolítico** — un solo commit grande. Es el más denso del PR Navegación. Estimado: 2-3 hs de Claude Code.

## Decisiones arquitectónicas (ya tomadas, NO cuestionar)

### Estructura

| Decisión | Resolución |
|----------|-----------|
| Sub-pasos vs monolítico | **Monolítico** (un commit) |
| Breakpoint mobile/desktop | `md:` (768px) |
| Componente base para sheets | shadcn `Sheet` (ya está en `components/ui/sheet.tsx`, NO commiteado todavía) |
| Componente Separator | shadcn `Separator` (ya está en `components/ui/separator.tsx`, NO commiteado todavía) |

### Navegación mobile

| Decisión | Resolución |
|----------|-----------|
| Bottom navbar | 5 items: Inicio / Movimientos / **🥭 FAB centro** / [Balances o Profesional según modo] / Más |
| FAB | Círculo flotante centro-abajo, abre `PerchitaBottomSheet` |
| Item "Más" | Abre `NavigationDrawer` |
| "Captura" como item de nav | NO existe — el FAB lo reemplaza |
| FAB visibility | Siempre visible (`position: fixed`) |
| FAB en `/captura` | Oculto (evitar redundancia) |

### Navegación desktop

| Zona del sidebar | Contenido |
|------------------|-----------|
| Top branding | Logo "M" placeholder + texto "MANGO" |
| Botón destacado "MANGO AI" | Con ícono 🥭, background propio (color de marca), texto dinámico = `profile.asistente_nombre` (default "MANGO AI"), abre `PerchitaBottomSheet` |
| Divider | Separa botón destacado del resto |
| Items principales | Inicio, Movimientos, Balances (si modo personal/ambos), Préstamos, Cash Flow, Profesional (si modo profesional/ambos linkea a `/clientes`) |
| Hamburguesa | Abre `NavigationDrawer` (mismo de mobile) |
| ⚠️ "Captura" como item | NO existe — reemplazado por el botón destacado arriba |

### NavigationDrawer (compartido mobile + desktop)

| Sección | Contenido |
|---------|-----------|
| Top items | Cuentas, Tarjetas, Personas y grupos, Categorías, Movimientos recurrentes, Ajustes |
| Bottom (sticky) | Email del usuario + botón "Salir" con `AlertDialog` de confirmación |

### PerchitaBottomSheet

| Aspecto | Resolución |
|---------|-----------|
| Componente base | shadcn `Sheet` (`side="bottom"`) |
| Contenido | `<CapturaForm variant="sheet" />` (extraído en PASO 3) |
| Altura | Auto según contenido |
| onSuccess | Cerrar sheet + toast "Movimiento creado" (NO redirige a `/movimientos`) |
| Trigger | FAB mobile + botón MANGO AI desktop |

### Ruta `/captura`

- Se **mantiene funcional** como página accesible por URL directa
- Renderiza `<CapturaForm variant="page" />` con redirect a `/movimientos` post-success (como hoy)
- Ya no está linkeada desde la navegación
- Fallback para bookmarks

### Componentes que se eliminan

- `components/shared/header.tsx` (Header horizontal viejo) — eliminar al final
- ⚠️ Antes de eliminar: verificar que ningún otro archivo lo importa

---

## PASO 0 obligatorio — Diagnóstico

Antes de tocar código, generar `DIAGNOSTICO_NAV_FINAL.md` en la raíz con:

### 1. Inventario del Header viejo

- Contenido completo de `components/shared/header.tsx`
- Lista de imports (qué íconos usa, qué hooks, qué utils)
- ¿Recibe props? ¿Cuáles?
- Lista de archivos que lo importan (debería ser solo `app/(app)/layout.tsx` pero confirmar)

### 2. Inventario de íconos disponibles

- ¿Está instalada `lucide-react`? Si no, instalarla con `npm install lucide-react` (ANOTAR esta instalación)
- Lista de íconos necesarios: Home, Wallet, BarChart3, TrendingUp, Briefcase, MoreHorizontal, Menu, X, LogOut, etc.

### 3. Inventario de tipos del profile

- Verificar `profile.modo` posibles valores: "personal", "profesional", "ambos"
- Verificar `profile.asistente_nombre` existe y tiene default "MANGO AI" (post-migration 022)
- ¿Hay un type/interface ya definido para profile en `/lib/types/`?

### 4. Inventario de assets

- ¿Existe el favicon "M"? Path: `public/icons/favicon.svg`
- ¿Existe un emoji 🥭 utilizable como ícono? Si no, usar texto emoji directo o `<span>🥭</span>`

### 5. Identificación de acoplamientos

- ¿El Header viejo recibe data del layout que el nuevo nav también necesita? (probablemente sí: `userEmail`, `modo`)
- ¿El Header tiene state interno que se pierda al eliminarlo? (probablemente sí: estado open/close del menú hamburguesa — pero ese es lo que reemplazamos)
- ¿Hay archivos en pages individuales que importen partes del Header viejo? (improbable pero verificar)

### 6. Análisis de la ruta `/captura`

- Confirmar que `app/(app)/captura/page.tsx` (modificado en PASO 3) sigue siendo válida
- Confirmar que `<CapturaForm variant="page" />` sigue funcionando como flujo standalone

### 7. Plan de implementación propuesto

Orden de operaciones (mover de placeholder a contenido real, en qué orden, qué se prueba después de cada paso, etc.)

### ⚠️ STOP CONDITION del PASO 0

PARAR y reportar a Benja antes de implementar si:
- `lucide-react` NO está instalada y la instalación falla
- El Header viejo es importado desde más archivos que solo el layout
- `profile.asistente_nombre` no tiene default "MANGO AI" en DB (migration 022 no se corrió o falló)
- Hay state del Header viejo que necesita persistirse (cookies, localStorage, etc.)
- shadcn `Sheet` o `Separator` tienen dependencias faltantes (`@base-ui/react/dialog`)

**IMPORTANTE**: cuando termines el diagnóstico, PARÁ y esperá luz verde de Benja antes de implementar.

---

## Estructura de archivos objetivo

```
lib/
  navigation/
    get-nav-items.ts                  ← NUEVO. Helper que devuelve items según modo.
    types.ts                          ← NUEVO (opcional). Tipos compartidos NavItem, etc.

components/
  navigation/
    app-header.tsx                    ← MODIFICADO (de placeholder a real). Solo desktop.
    desktop-sidebar.tsx               ← MODIFICADO. Sidebar lateral completo.
    mobile-bottom-nav.tsx             ← MODIFICADO. Bottom navbar mobile completo.
    navigation-drawer.tsx             ← MODIFICADO. Drawer shadcn Sheet side="left".
    perchita-fab.tsx                  ← MODIFICADO. FAB con ícono 🥭.
    perchita-bottom-sheet.tsx         ← MODIFICADO. Sheet side="bottom" con CapturaForm.
    mango-ai-button.tsx               ← NUEVO. Botón destacado del sidebar desktop.
    nav-item.tsx                      ← NUEVO. Item individual reutilizable.
    user-section.tsx                  ← NUEVO. Email + logout para el drawer.

  shared/
    header.tsx                        ← ELIMINADO al final.

components/ui/
  sheet.tsx                           ← (ya existe, no commiteado) — pasa a trackeado
  separator.tsx                       ← (ya existe, no commiteado) — pasa a trackeado
  alert-dialog.tsx                    ← Posiblemente NUEVO si no está instalado todavía

app/(app)/
  layout.tsx                          ← MODIFICADO. Outer div a md:flex-row, sin Header viejo.
```

---

## Cambios concretos

### 1. Crear `lib/navigation/get-nav-items.ts`

Devuelve los items de nav según `profile.modo`. Ejemplo de API:

```ts
export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Si es true, el item se muestra solo en desktop sidebar (no en bottom mobile). */
  desktopOnly?: boolean;
  /** Si es true, el item se muestra solo en bottom mobile (no en desktop). */
  mobileOnly?: boolean;
  /** Si es true, va al drawer en lugar del sidebar/bottom. */
  drawerOnly?: boolean;
};

/**
 * Devuelve TODOS los items disponibles según el modo del usuario.
 * Los consumidores filtran por mobileOnly/desktopOnly/drawerOnly.
 */
export function getNavItems(modo: 'personal' | 'profesional' | 'ambos'): NavItem[] {
  const items: NavItem[] = [
    { href: '/', label: 'Inicio', icon: Home },
    { href: '/movimientos', label: 'Movimientos', icon: Wallet },
    { href: '/balances', label: 'Balances', icon: BarChart3, mobileOnly: modo === 'profesional' ? false : true },
    { href: '/prestamos', label: 'Préstamos', icon: HandCoins, desktopOnly: true },
    { href: '/cash-flow', label: 'Cash Flow', icon: TrendingUp, desktopOnly: true },
  ];
  
  if (modo === 'profesional' || modo === 'ambos') {
    items.push({ href: '/clientes', label: 'Profesional', icon: Briefcase });
  }
  
  // Items del drawer
  items.push(
    { href: '/cuentas', label: 'Cuentas', icon: Landmark, drawerOnly: true },
    { href: '/tarjetas', label: 'Tarjetas', icon: CreditCard, drawerOnly: true },
    { href: '/personas-y-grupos', label: 'Personas y grupos', icon: Users, drawerOnly: true },
    { href: '/categorias', label: 'Categorías', icon: Tag, drawerOnly: true },
    { href: '/movimientos-recurrentes', label: 'Movimientos recurrentes', icon: Repeat, drawerOnly: true },
    { href: '/ajustes', label: 'Ajustes', icon: Settings, drawerOnly: true },
  );
  
  return items;
}
```

⚠️ El path de `Personas y grupos` y `Categorías` lo confirma el diagnóstico — ajustar según rutas reales del repo.

### 2. Crear `components/navigation/nav-item.tsx`

Item individual reutilizable. Recibe `NavItem` + variante (sidebar / bottom / drawer) + estado active. Aplica el highlight de active state.

### 3. Crear `components/navigation/mango-ai-button.tsx`

Botón destacado del sidebar desktop:

```tsx
'use client';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { CapturaForm } from '@/components/captura/captura-form';

export function MangoAIButton({ asistenteNombre }: { asistenteNombre: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="...estilos destacados, background de marca, etc.">
          <span>🥭</span>
          <span>{asistenteNombre}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="...auto-height">
        <CapturaForm 
          variant="sheet"
          onSuccess={() => {
            // cerrar sheet + toast
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
```

⚠️ Necesita props para `userEmail` y demás data del profile que el `CapturaForm` requiere (cuentas, tarjetas, etc.). Pasar por props desde el layout.

### 4. Modificar `components/navigation/desktop-sidebar.tsx`

Sidebar lateral completo:

```tsx
<aside className="hidden md:flex flex-col w-60 border-r border-border h-screen sticky top-0">
  {/* Branding top */}
  <div className="p-4 border-b">
    <Logo /> MANGO
  </div>
  
  {/* Botón destacado MANGO AI */}
  <div className="p-4">
    <MangoAIButton asistenteNombre={asistenteNombre} ...props />
  </div>
  
  <Separator />
  
  {/* Items principales */}
  <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
    {desktopItems.map(item => <NavItem key={item.href} item={item} variant="sidebar" />)}
  </nav>
  
  {/* Hamburguesa que abre el drawer */}
  <div className="p-4 border-t">
    <NavigationDrawerTrigger />
  </div>
</aside>
```

### 5. Modificar `components/navigation/mobile-bottom-nav.tsx`

Bottom navbar mobile con 5 slots: 2 a la izquierda del FAB, el FAB centro, 2 a la derecha.

```tsx
<nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background z-30">
  <div className="grid grid-cols-5 h-full">
    <NavItem item={inicio} variant="bottom" />
    <NavItem item={movimientos} variant="bottom" />
    <div className="relative">
      {/* El FAB se renderiza aparte porque sobresale del navbar */}
    </div>
    <NavItem item={balancesOProfesional} variant="bottom" />
    <NavItem item={mas} variant="bottom" onClick={openDrawer} />
  </div>
</nav>
```

⚠️ El FAB se renderiza como componente aparte (`PerchitaFAB`) porque sobresale del bottom navbar (z-index, position fixed, etc.). El espacio centro del navbar queda vacío para que visualmente el FAB lo "ocupe".

### 6. Modificar `components/navigation/perchita-fab.tsx`

```tsx
'use client';
import { usePathname } from 'next/navigation';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { CapturaForm } from '@/components/captura/captura-form';

export function PerchitaFAB({ ...props }) {
  const pathname = usePathname();
  
  // Ocultar en /captura
  if (pathname === '/captura') return null;
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button 
          className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center z-40"
          aria-label="MANGO AI — Capturar movimiento"
        >
          <span className="text-2xl">🥭</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="...auto-height">
        <CapturaForm variant="sheet" onSuccess={...} {...props} />
      </SheetContent>
    </Sheet>
  );
}
```

### 7. Modificar `components/navigation/perchita-bottom-sheet.tsx`

⚠️ **DECISIÓN DE ARQUITECTURA**: el `PerchitaBottomSheet` como componente standalone puede dejarse vacío o eliminarse, porque el Sheet se renderiza directamente desde `MangoAIButton` y `PerchitaFAB` (que ambos contienen su propio `<Sheet>`). 

Dos opciones:
- **Opción A (mi voto)**: eliminar el archivo `perchita-bottom-sheet.tsx` porque su lógica vive en los triggers (FAB + botón MANGO AI). El placeholder del PASO 4 era prematuro.
- **Opción B**: convertirlo en un componente reutilizable que ambos triggers compartan, con state global del sheet abierto/cerrado.

Recomendación: Opción A (simplicidad). Si Claude Code detecta que duplicar el `<Sheet>` en 2 lugares causa problemas, pasar a Opción B.

### 8. Modificar `components/navigation/navigation-drawer.tsx`

Drawer compartido entre mobile y desktop:

```tsx
'use client';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, ... } from '@/components/ui/alert-dialog';

export function NavigationDrawer({ children, userEmail, drawerItems }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <nav className="flex-1 overflow-y-auto">
          {drawerItems.map(...)}
        </nav>
        <UserSection userEmail={userEmail} />
      </SheetContent>
    </Sheet>
  );
}
```

### 9. Crear `components/navigation/user-section.tsx`

```tsx
<div className="border-t p-4 space-y-2">
  <div className="text-sm text-muted-foreground">{userEmail}</div>
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" className="w-full">Salir</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
        <AlertDialogDescription>Vas a tener que iniciar sesión de nuevo.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={handleLogout}>Salir</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</div>
```

⚠️ Si `alert-dialog.tsx` de shadcn no está instalado: `npx shadcn add alert-dialog` (ANOTAR la instalación).

### 10. Modificar `components/navigation/app-header.tsx`

⚠️ **DECISIÓN DE ARQUITECTURA**: con sidebar lateral desktop + bottom navbar mobile, **¿hace falta un AppHeader?**

Opciones:
- **Opción A (mi voto)**: eliminar el archivo `app-header.tsx`. El sidebar desktop + bottom mobile + drawer cubren todo. No hay header horizontal.
- Opción B: mantener AppHeader para mobile, mostrando solo logo + título de la página actual (decorativo, no funcional). Aumenta complejidad sin claro beneficio.

Recomendación: Opción A.

### 11. Modificar `app/(app)/layout.tsx`

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar } from '@/components/navigation/desktop-sidebar';
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav';
import { PerchitaFAB } from '@/components/navigation/perchita-fab';

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completado, modo, asistente_nombre")  // ← agregar asistente_nombre
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completado) redirect("/onboarding");

  // Fetch data necesario para el CapturaForm dentro del sheet
  // (cuentas, tarjetas, categorias, clientes, personas, grupos)
  // Esto puede ir en un Server Component wrapper que pase props al sidebar+FAB
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row">  {/* ← md:flex-row */}
      <DesktopSidebar 
        modo={profile.modo} 
        asistenteNombre={profile.asistente_nombre ?? "MANGO AI"}
        userEmail={user.email}
        /* + data para el CapturaForm en el sheet */
      />
      
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-0">
          {children}
        </main>
      </div>
      
      <MobileBottomNav 
        modo={profile.modo}
      />
      
      <PerchitaFAB 
        asistenteNombre={profile.asistente_nombre ?? "MANGO AI"}
        /* + data para el CapturaForm */
      />
    </div>
  );
}
```

⚠️ **CRÍTICO sobre fetches de data del CapturaForm**:
- El CapturaForm necesita cuentas, tarjetas, categorías, clientes, personas, grupos (lo vimos en PASO 3)
- Hoy `/captura/page.tsx` fetchea todo eso como Server Component y se lo pasa al CapturaForm
- En el nuevo layout, el sheet del FAB también necesita esa data — y el FAB está en el layout, que se renderiza en TODAS las pages
- **Decisión propuesta**: hacer fetches de esos catálogos en el layout (una vez por navegación), pasarlos al FAB y al MangoAIButton del sidebar
- ⚠️ Esto agrega queries a CADA carga de page. Acepatable (son lookups simples) pero monitorear performance

**Alternativa más liviana (si las queries son pesadas)**: lazy-fetch dentro del Sheet cuando se abre por primera vez. Más complejo pero mejor para performance. Decisión queda a juicio de Claude Code en el diagnóstico — si las queries totalizan >300ms en local, lazy-fetch.

### 12. Eliminar `components/shared/header.tsx`

Al final, después de validar que todo funciona.

---

## Tests mentales (casos de borde)

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Login → desktop | Veo sidebar lateral con branding arriba, botón MANGO AI destacado, items normales |
| 2 | Login → mobile | Veo bottom navbar con 5 items + FAB 🥭 centro |
| 3 | Click FAB | Se abre PerchitaBottomSheet con CapturaForm |
| 4 | Crear movimiento desde sheet | Se cierra sheet, aparece toast "Movimiento creado", NO redirige a /movimientos |
| 5 | Cambiar modo a "ambos" en /ajustes | Sidebar y bottom nav se actualizan inmediatamente con "Profesional" item |
| 6 | Cambiar `asistente_nombre` a "Pepe" en /ajustes | Botón MANGO AI desktop ahora dice "Pepe" |
| 7 | Abrir drawer desde "Más" en mobile | Sheet side="left" se abre con items + email + Salir |
| 8 | Click "Salir" en drawer | AlertDialog pide confirmación |
| 9 | Confirmar logout | Cierra sesión, redirect a /login |
| 10 | Cancelar logout | Drawer queda abierto, no se cierra sesión |
| 11 | Navegar a /captura por URL directa | Página funciona normal con form, FAB OCULTO |
| 12 | Navegar a /movimientos | FAB visible de nuevo |
| 13 | Resize desktop → mobile cruzando 768px | Transición limpia: sidebar desaparece, bottom navbar aparece, sin flashes |
| 14 | Bottom navbar mobile en página larga con scroll | Bottom navbar siempre visible (fixed), FAB siempre visible |
| 15 | Drawer abierto, click backdrop | Drawer se cierra |
| 16 | Sheet de captura abierto, click backdrop | Sheet se cierra, data del form se pierde (comportamiento default shadcn) |
| 17 | Sheet de captura abierto, error de red al submit | Error inline visible, sheet NO se cierra |
| 18 | Item active state | El item de la página actual aparece destacado en sidebar y bottom navbar |

---

## Validación local (Benja, post Claude Code)

| # | Test | Esperado |
|---|------|----------|
| 1 | `npm run build` | OK |
| 2 | Desktop: abrir cualquier página | Sidebar lateral con branding + botón MANGO AI + items |
| 3 | Mobile (DevTools): abrir cualquier página | Bottom navbar 5 items + FAB centro |
| 4 | Click FAB mobile | Sheet abre con form, se ve completo y usable |
| 5 | Click botón MANGO AI desktop | Mismo sheet, mismo form |
| 6 | Cargar movimiento desde sheet | Toast aparece, sheet se cierra, NO redirige |
| 7 | Cargar movimiento desde URL directa /captura | Funciona como hoy, redirige a /movimientos |
| 8 | Cambiar `asistente_nombre` en /ajustes a "Pepe" | Al volver a cualquier página, el botón dice "Pepe" |
| 9 | Cambiar `modo` en /ajustes | Items de nav se actualizan |
| 10 | "Más" / hamburguesa → drawer | Drawer abre, items + email + Salir visibles |
| 11 | Logout con confirmación | AlertDialog → confirmar → /login |
| 12 | Drawer cierra con tap fuera | OK |
| 13 | Scroll mobile en /movimientos largo | FAB siempre visible, bottom navbar siempre visible, último item no tapado |
| 14 | Resize ventana cruzando 768px | Transición limpia |
| 15 | Inspeccionar DOM | NO existe el Header viejo, NO existen los `data-placeholder` con hidden |
| 16 | Console | Sin warnings nuevos de hidratación, keys, props |
| 17 | Performance página: tiempo de carga | Aceptable (<2s en local) |

---

## Stop conditions para Claude Code

**PARAR y reportar a Benja** si:

1. El diagnóstico PASO 0 revela problemas no anticipados
2. shadcn `Sheet`, `Separator`, o `AlertDialog` tienen dependencias rotas
3. Los catálogos necesarios para el CapturaForm en el sheet hacen >300ms de queries (decidir lazy-fetch)
4. El `CapturaForm` extraído en PASO 3 no soporta bien `variant="sheet"` (descubrimos limitación al integrarlo)
5. Eliminar el Header viejo rompe imports en archivos no anticipados
6. Build falla y no se puede arreglar en <30min
7. La transición de breakpoint causa flashes visuales o layout shifts grandes
8. El sticky positioning del sidebar desktop pelea con el `pb-20` del main mobile
9. shadcn `Sheet` tiene problemas con `position: fixed` del FAB (z-index, backdrop)
10. Cualquiera de los 18 tests mentales NO funciona

---

## Reglas para Claude Code (no negociables)

| Regla | Detalle |
|-------|---------|
| ❌ NO renombrar `perchita-fab.tsx` ni `perchita-bottom-sheet.tsx` | Backlog futuro, scope creep |
| ❌ NO modificar `/api/`, server actions, otras rutas | Out of scope |
| ❌ NO push automático | Solo commit local en `feat/navegacion-reformada` |
| ❌ NO eliminar la ruta `/captura` | Se mantiene como fallback |
| ❌ NO modificar `<CapturaForm />` de PASO 3 | Si se necesita ajuste, parar y preguntar |
| ✅ Antes de eliminar Header viejo: verificar imports con grep | `grep -r "from.*shared/header" --include="*.tsx" --include="*.ts" .` |
| ✅ Commit los nuevos archivos de shadcn ui (sheet, separator, alert-dialog si nuevo) | Junto con los archivos que los usan |
| ✅ Build debe pasar antes de commitear | `npm run build` verde |
| ✅ Generar `DIAGNOSTICO_NAV_FINAL.md` PRIMERO | Antes de tocar código productivo |
| ✅ Reportar antes/después con tabla | Mismo formato que PASOs anteriores |
| ✅ Si dudás de algo | Parar y preguntar |

---

## Commit final

```
PASO 5: implementación completa de la nueva navegación

- Sidebar desktop con branding "M MANGO" + botón destacado MANGO AI + items
- Bottom navbar mobile con 5 items + FAB 🥭 flotante centro
- NavigationDrawer (shadcn Sheet side="left") con items secundarios + 
  email + logout con AlertDialog de confirmación
- PerchitaBottomSheet (shadcn Sheet side="bottom") con <CapturaForm variant="sheet" />
  - onSuccess: cerrar sheet + toast (NO redirige)
- FAB y botón MANGO AI ambos abren el mismo sheet
- FAB oculto en /captura
- Texto del botón MANGO AI = profile.asistente_nombre (dinámico)
- lib/navigation/get-nav-items.ts con helpers por modo (personal/profesional/ambos)
- Outer div del layout a md:flex-row
- Header horizontal viejo (components/shared/header.tsx) ELIMINADO
- components/ui/sheet.tsx, separator.tsx, alert-dialog.tsx commiteados
- /captura mantiene como ruta accesible por URL directa
- PASO 0: DIAGNOSTICO_NAV_FINAL.md generado

Cierra el grueso del PR Navegación. Quedan PASO 6-9 (active states, 
safe area, testing final).
```

---

## Riesgos no obvios ⚠️

| Riesgo | Mitigación |
|--------|-----------|
| Lazy-fetch del sheet introduce latencia perceptible al abrir el FAB | Medir en diagnóstico. Si queries totalizan <300ms, fetchear en layout (eager). Si más, lazy-fetch con loading state. |
| El active state usa `usePathname` que requiere Client Component | El sidebar y bottom navbar serán Client Components. Está OK porque el layout (Server) los renderiza con props. |
| El FAB tapa contenido al final de pages largas | El `pb-20 md:pb-0` del PASO 4 ya lo previene en mobile. Validar test 13. |
| Backdrop del Sheet pelea con el FAB | shadcn Sheet maneja z-index automático. Validar visualmente. |
| Migration 022 no se corrió → `asistente_nombre` es null para algunos usuarios | El layout usa fallback `?? "MANGO AI"`. OK aunque no se corra. Pero el diagnóstico debe verificar. |
| Renombrar el text "MANGO AI" toma toda la cadena hasta el render → si user pone nombre largo, rompe layout | Truncar con `truncate` de Tailwind o `max-w-[...]`. Aplicar en el botón. |
| `position: fixed` del FAB en algunos browsers mobile da problema con iOS safe area | Aplicar `bottom-[max(1rem,env(safe-area-inset-bottom))]` o similar. Validar en iOS Safari si es posible. |
| Sticky sidebar en desktop choca con scroll del main | `h-screen sticky top-0` debería funcionar. Si hay problema, cambiar a fixed con margin del main. |

---

## Próximos pasos al cerrar PASO 5

PASO 6-9 según `SPEC_PR_NAVEGACION.md` original:
- Active states refinados
- Safe area inset para iOS notch
- Testing exhaustivo end-to-end
- Documentación de breakpoints

Cuando PASO 5 termine, evaluamos si el PR está suficientemente sólido para merge o si los PASOs 6-9 son críticos o pueden diferirse.
