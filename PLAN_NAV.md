# PLAN_NAV.md — Arquitectura de la reforma de navegación

**Fecha**: 2026-05-10  
**Branch**: feat/navegacion-reformada  
**Basado en**: DIAGNOSTICO_NAV.md (PASO 0)

---

## 1. Bottom navbar mobile (5 items)

| # | Label | Icon (lucide-react) | Ruta destino | Comportamiento |
|---|-------|---------------------|--------------|----------------|
| 1 | Home | `Home` | `/dashboard` | navega |
| 2 | Movimientos | `ArrowLeftRight` | `/movimientos` | navega |
| 3 | Perchita | Logo M + emoji 🥭 | — | abre `<PerchitaBottomSheet />` |
| 4 | Cuentas | `Wallet` | `/cuentas` | navega |
| 5 | Más | `Menu` | — | abre `<NavigationDrawer />` |

---

## 2. Drawer — lista completa de items

### Sección "Navegación principal"
| Item | Icon | Ruta | Existe |
|------|------|------|--------|
| Dashboard | `Home` | `/dashboard` | ✓ |
| Movimientos | `ArrowLeftRight` | `/movimientos` | ✓ |
| Captura / Perchita | `Sparkles` | `/captura` | ✓ |
| Cuentas | `Wallet` | `/cuentas` | ✓ |
| Tarjetas | `CreditCard` | `/cuentas` | ✓ (link a /cuentas, sección tarjetas — no hay lista propia) |
| Préstamos | `Landmark` | `/prestamos` | ✓ |
| Balances | `Scale` | `/balances` | ✓ |
| Cash Flow | `LineChart` | `/cash-flow` | ✓ |
| Clientes | `Briefcase` | `/clientes` | ✓ (visible solo si modo pro) |

> **Inversiones**: no existe ruta `/inversiones`. Se **omite del drawer** en este PR. Follow-up.

### Sección "Configuración"
| Item | Icon | Ruta | Existe |
|------|------|------|--------|
| Categorías | `Tags` | `/categorias` | crear en PASO 2 |
| Plantillas recurrentes | `Repeat` | `/plantillas` | crear en PASO 2 |
| Preferencias | `Settings` | `/preferencias` | crear en PASO 2 |

### Sección "Cuenta"
| Item | Icon | Ruta/Acción |
|------|------|-------------|
| Perfil | `User` | `/perfil` (crear en PASO 2) |
| Cerrar sesión | `LogOut` | server action `signOut` + redirect `/login` |

---

## 3. Sidebar desktop — items principales

Solo la sección "Navegación principal" del drawer. Los items de Configuración y Cuenta se acceden exclusivamente vía hamburguesa → drawer.

| Item | Icon | Ruta |
|------|------|------|
| Dashboard | `Home` | `/dashboard` |
| Movimientos | `ArrowLeftRight` | `/movimientos` |
| Cuentas | `Wallet` | `/cuentas` |
| Préstamos | `Landmark` | `/prestamos` |
| Balances | `Scale` | `/balances` |
| Cash Flow | `LineChart` | `/cash-flow` |
| Clientes | `Briefcase` | `/clientes` (visible si modo pro) |

> Captura/Perchita no está en sidebar desktop — se accede por URL directo `/captura` o desde drawer. Tarjetas tampoco (van incluidas en /cuentas).

---

## 4. Decisiones sobre tabs de /ajustes sin ruta destino

Basado en DIAGNOSTICO_NAV.md R2 y R3:

### `/perfil`
Contenido: nombre, modo, profesion del usuario.  
Datos del PerfilTab partido en dos formularios.

### `/preferencias`
Contenido: asistente_nombre, vto_day_default.  
Formulario simple, misma server action `updateProfile`.

### `/categorias`
Contenido: CategoriasTab completo (incluye ImportarTemplateModal).  
ImportarTemplateModal se mueve a `components/categorias/importar-template-modal.tsx`.

### `/plantillas`
Contenido: PlantillasTab completo.  
Necesita las mismas props: plantillas, cuentas, tarjetas, categorias, clientes, servicios.

### CuentasTab y TarjetasTab
**En este PR**: no se crean rutas nuevas para estos tabs. Las páginas `/cuentas` y `/cuentas/[id]` ya tienen el contenido necesario para el usuario. Los links a `/ajustes` que apuntaban a "Ajustes → Cuentas" se actualizan a `/cuentas`. El CRUD de cuentas/tarjetas es un follow-up.

### PersonasGruposTab
**En este PR**: no tiene ruta top-level. Se omite del drawer. El contenido queda inaccesible hasta que se cree `/personas` en un PR posterior.

---

## 5. Arquitectura de archivos finales

### Archivos nuevos
```
# Rutas
app/(app)/perfil/page.tsx
app/(app)/preferencias/page.tsx
app/(app)/categorias/page.tsx
app/(app)/plantillas/page.tsx

# Componentes de contenido (ex-tabs)
components/perfil/perfil-page-content.tsx        ← del PerfilTab (solo perfil)
components/preferencias/preferencias-page-content.tsx ← del PerfilTab (solo prefs)
components/categorias/categorias-page-content.tsx ← del CategoriasTab
components/categorias/importar-template-modal.tsx ← movido desde ajustes/_components/
components/plantillas/plantillas-page-content.tsx ← del PlantillasTab

# Captura
components/captura/captura-form.tsx              ← extraído de captura-client.tsx

# Navegación — componentes nuevos
components/shared/app-header.tsx
components/shared/desktop-sidebar.tsx
components/shared/mobile-bottom-nav.tsx
components/shared/navigation-drawer.tsx
components/shared/perchita-fab.tsx
components/shared/perchita-bottom-sheet.tsx

# Navegación — context y helpers
lib/navigation/navigation-provider.tsx
lib/navigation/use-active-route.ts

# Documentación
DIAGNOSTICO_NAV.md
PLAN_NAV.md
BUGS_DETECTADOS.md
```

### Archivos modificados
```
app/(app)/layout.tsx             ← refactor mayor: NavigationProvider + nuevo layout
app/(app)/captura/page.tsx       ← usa <CapturaForm> en lugar de <CapturaClient>
components/shared/header.tsx     ← reemplazado por AppHeader (o se elimina)
app/globals.css                  ← agregar .pb-safe y .pb-nav-mobile
next.config.ts                   ← agregar redirect /ajustes → /perfil
app/onboarding/categorias-sugeridas/client.tsx ← actualizar import de ImportarTemplateModal
lib/supabase/actions/ajustes.ts  ← revalidatePath a /perfil y /preferencias
lib/supabase/actions/categorias.ts ← revalidatePath a /categorias
lib/supabase/actions/cuentas.ts  ← revalidatePath a /cuentas
lib/supabase/actions/tarjetas.ts ← revalidatePath a /cuentas
app/(app)/cuentas/page.tsx       ← actualizar links a /ajustes
app/(app)/cuentas/[id]/page.tsx  ← actualizar links a /ajustes
app/(app)/cuentas/tarjetas/[id]/page.tsx ← actualizar links a /ajustes
```

### Archivos eliminados
```
app/(app)/ajustes/page.tsx
app/(app)/ajustes/_components/ajustes-client.tsx
app/(app)/ajustes/_components/perfil-tab.tsx
app/(app)/ajustes/_components/preferencias-tab.tsx (no existe, se crea directo en componentes)
app/(app)/ajustes/_components/categorias-tab.tsx
app/(app)/ajustes/_components/plantillas-tab.tsx
app/(app)/ajustes/_components/importar-template-modal.tsx (movido, no eliminado)
app/(app)/ajustes/_components/cuentas-tab.tsx    ← tab que NO migra a ruta propia
app/(app)/ajustes/_components/tarjetas-tab.tsx   ← tab que NO migra a ruta propia
app/(app)/ajustes/_components/personas-grupos-tab.tsx ← tab que NO migra a ruta propia
```

---

## 6. Estructura del layout objetivo

```tsx
// app/(app)/layout.tsx — pseudocódigo
<NavigationProvider>
  <div className="min-h-screen flex">
    {/* Sidebar desktop: md+ */}
    <DesktopSidebar className="hidden md:flex" />

    <div className="flex-1 flex flex-col min-w-0">
      <AppHeader />

      <main className="flex-1 pb-nav-mobile md:pb-0 p-4 md:p-6">
        {children}
      </main>

      <MobileBottomNav className="md:hidden" />
    </div>

    {/* Overlays — se renderizan fuera del flujo */}
    <NavigationDrawer />
    <PerchitaBottomSheet />
  </div>
</NavigationProvider>
```

---

## 7. NavigationProvider — API del context

```typescript
// lib/navigation/navigation-provider.tsx
interface NavigationContextValue {
  isDrawerOpen: boolean;
  isPerchitaSheetOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  openPerchitaSheet: () => void;
  closePerchitaSheet: () => void;
}
```

---

## 8. Componentes shadcn a instalar

Ejecutar antes de PASO 5 (componentes nuevos):

```bash
npx shadcn@latest add sheet
npx shadcn@latest add separator
```

---

## 9. Jerarquía de z-index

| Elemento | z-index |
|----------|---------|
| `<main>` content | auto |
| `<DesktopSidebar />` | `z-30` |
| `<AppHeader />` | `z-40` |
| `<MobileBottomNav />` | `z-40` |
| `<PerchitaFAB />` | `z-50` |
| Sheet overlay (shadcn default) | `z-50` |
| Toasts existentes | `z-[60]` o más |

---

## 10. Plan de commits (6 commits atómicos)

| # | Mensaje | Contenido |
|---|---------|-----------|
| 1 | `chore: PASO 0 diagnóstico navegación (DIAGNOSTICO_NAV.md, PLAN_NAV.md)` | Solo docs |
| 2 | `feat: migrar /ajustes a rutas independientes (perfil/preferencias/categorias/plantillas)` | PASO 2 completo |
| 3 | `chore: extraer <CapturaForm /> reusable de /captura` | PASO 3 |
| 4 | `feat: AppHeader + NavigationProvider + NavigationDrawer` | PASO 4 + 5 parcial |
| 5 | `feat: MobileBottomNav con PerchitaFAB y PerchitaBottomSheet` | PASO 5 resto |
| 6 | `refactor: DesktopSidebar + active states + safe-area CSS` | PASO 6 + PASO 7 |

Cada commit deja la app funcionando.

---

## 11. Decisiones pendientes (no bloquean el PR)

| # | Decisión | Propuesta default |
|---|----------|------------------|
| D1 | ¿Perfil vs Preferencias se separan? | Sí: /perfil = nombre/modo/profesion, /preferencias = asistente_nombre + vto_day_default |
| D2 | ¿CuentasTab/TarjetasTab tienen ruta propia? | No en este PR. Follow-up. |
| D3 | ¿PersonasGruposTab tiene ruta propia? | No en este PR. Follow-up. |
| D4 | ¿Link "Tarjetas" en drawer apunta a /cuentas o a /cuentas/tarjetas? | `/cuentas` (la lista de tarjetas está ahí) |
| D5 | ¿Inversiones aparece en drawer? | No — ruta no existe. Follow-up PR. |

**Si Benja no da instrucciones contrarias, se aplican las propuestas default.**
