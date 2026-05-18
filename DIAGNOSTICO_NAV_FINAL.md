# DIAGNOSTICO_NAV_FINAL.md

Generado: 2026-05-12  
Branch: feat/navegacion-reformada  
Pre-condición: PASO 4 commiteado (76eeb70). Ningún archivo productivo fue tocado para generar este diagnóstico.

---

## 1. Inventario del Header viejo

### Archivo: `components/shared/header.tsx`

**Tipo:** Client Component (`"use client"`)  
**Props:** `{ userEmail?: string; modo?: string }`

**Imports:**
- `useRouter, usePathname` de `next/navigation`
- `Link` de `next/link`
- `useState` de `react`
- `createClient` de `@/lib/supabase/client`
- `Button` de `@/components/ui/button`
- `LogOut, Settings, Menu, X` de `lucide-react`
- `cn` de `@/lib/utils`

**Nav items actuales:**
```ts
const NAV_BASE = [
  { href: "/dashboard",   label: "Inicio" },
  { href: "/movimientos", label: "Movimientos" },
  { href: "/captura",     label: "Captura" },      // ← ELIMINADO en nueva nav
  { href: "/cuentas",     label: "Cuentas" },       // ← va al drawer
  { href: "/balances",    label: "Balances" },
  { href: "/prestamos",   label: "Préstamos" },
];
// Si modo = "profesional" | "ambos": agrega { href: "/clientes", label: "Profesional" }
```

**State interno:**
- `menuOpen` — estado del menú hamburguesa mobile. **No persistido** (localStorage/cookies). Se pierde al eliminar el componente. ✅ Seguro eliminar.

**Archivos que importan Header:**

```
grep "from.*shared/header" → 1 resultado: app/(app)/layout.tsx
```

**✅ Solo lo importa el layout. Seguro eliminar después de la transición.**

---

## 2. Inventario de íconos y dependencias

| Dependencia | Estado | Versión |
|-------------|--------|---------|
| `lucide-react` | ✅ Instalada | `^1.11.0` |
| `@base-ui/react` | ✅ Instalada | `^1.4.1` |
| `@base-ui/react/dialog` | ✅ Disponible | (incluida en @base-ui/react) |
| `@base-ui/react/separator` | ✅ Disponible | (incluida en @base-ui/react) |
| `sonner` | ❌ NO instalada | — |
| `react-hot-toast` | ❌ NO instalada | — |

**Íconos necesarios para la nueva nav** (todos disponibles en lucide-react):
`Home, Wallet, BarChart3, TrendingUp, Briefcase, MoreHorizontal, Menu, X, LogOut, Settings, Landmark, CreditCard, Users, Tag, Repeat, ChevronRight`

**alert-dialog.tsx:** ❌ No existe en `components/ui/`. Requiere `npx shadcn add alert-dialog` durante la implementación.

---

## 3. Inventario de tipos del profile

```ts
// types/supabase.ts — Profile Row
{
  modo:             "personal" | "profesional" | "ambos" | null,
  asistente_nombre: string | null,  // ← siempre usar ?? "MANGO AI"
  onboarding_completado: boolean,
  // ...
}
```

`profile.asistente_nombre` es nullable. El layout ya tiene fallback `?? "MANGO AI"` (PASO 2.5b). ✅ OK aunque migration 022 no se haya corrido.

---

## 4. Inventario de assets

| Asset | Path | Estado |
|-------|------|--------|
| Favicon "M" | `public/icons/favicon.svg` | ✅ Existe |
| Logo MANGO | — | ❌ No hay imagen/SVG dedicada — usar placeholder div igual que hoy |
| Emoji 🥭 | — | ✅ Usable como `<span>🥭</span>` o emoji directo |

Para el branding del sidebar se usa el mismo placeholder que en el Header actual: div cuadrado con "M" en color de marca.

---

## 5. Identificación de acoplamientos

| Dato | Source (layout) | Nuevo destino |
|------|----------------|---------------|
| `user.email` | `supabase.auth.getUser()` | → `NavigationDrawer` (UserSection) |
| `profile.modo` | `profiles.modo` | → `DesktopSidebar`, `MobileBottomNav` (filtrar items) |
| `profile.asistente_nombre` | `profiles.asistente_nombre` | → `DesktopSidebar` (botón MANGO AI) |
| CapturaForm data (6 datasets) | Hoy solo en `/captura/page.tsx` | Ver §7 — decisión pendiente |

**Sin acoplamientos a state global o context del Header viejo.** El `menuOpen` del Header es local y se descarta sin problema.

---

## 6. Rutas confirmadas del repo (ajustes al spec)

| Label spec | Href spec | Href correcto |
|-----------|-----------|---------------|
| Inicio | `/` | **`/dashboard`** ← spec tiene error, la ruta es /dashboard |
| Personas y grupos | `/personas-y-grupos` | **`/personas`** ← la ruta es /personas |

Rutas drawer confirmadas que existen:
- `/cuentas` ✅
- `/tarjetas` ✅
- `/personas` ✅ (NO `/personas-y-grupos`)
- `/categorias` ✅
- `/movimientos-recurrentes` ✅
- `/ajustes` ✅
- `/cash-flow` ✅
- `/dashboard` ✅ (para "Inicio")

---

## 7. Análisis de la ruta `/captura`

`app/(app)/captura/page.tsx` (PASO 3) ✅ válida y funcional:
- Server Component
- Fetchea los 6 datasets (cuentas, tarjetas, categorias, clientes, personas, grupos) con `Promise.all`
- Renderiza hero + `<CapturaFormPage>` → `<CapturaForm variant="page" onSuccess={router.push('/movimientos')} />`
- Se mantiene como fallback standalone

---

## 8. ⚠️ Decisiones críticas que requieren tu confirmación antes de implementar

### Decisión A — Toast library

**Situación:** El spec dice `onSuccess: cerrar sheet + toast "Movimiento creado"`. El proyecto **no tiene ninguna librería de toast instalada**. `@base-ui/react` incluye un módulo `@base-ui/react/toast` pero requiere configurar un `ToastPositioner` y provider en el layout — es complejo.

**Opciones:**

| Opción | Descripción | Pro | Contra |
|--------|-------------|-----|--------|
| A | Instalar `sonner` → `<Toaster />` en layout, `toast.success("Movimiento creado")` | Simple, estándar en shadcn ecosystem | Dependencia nueva |
| B | Usar `@base-ui/react/toast` (ya instalado) | Sin dependencia nueva | Setup más complejo (provider, positioning) |
| C | Sin toast — solo cerrar sheet | Simples de implementar | El spec pide feedback visual al usuario |

**Recomendación:** Opción A (`sonner`). Es la librería que usa shadcn por defecto, 1 línea en layout, 1 línea de uso.

---

### Decisión B — CapturaForm data: eager vs lazy fetch

**Situación:** `CapturaForm` necesita 6 datasets (cuentas, tarjetas, categorías, clientes, personas, grupos) para el `RevisionModal`. El FAB y el botón MANGO AI del sidebar abren el sheet en **cualquier página** de la app.

**Opciones:**

| Opción | Descripción | Pro | Contra |
|--------|-------------|-----|--------|
| **Eager** | Fetchear los 6 datasets en el layout, pasarlos al sidebar/FAB como props | Apertura de sheet instantánea | 6 queries extra en CADA navegación de TODA la app, incluso si el usuario nunca abre el sheet |
| **Lazy** | Fetchear dentro del componente client al abrir el sheet (`useEffect` / SWR / fetch manual) | Queries solo cuando el usuario abre el sheet | Latencia de ~200-400ms al abrir el sheet por primera vez; loading state requerido |

**Mi análisis:** El spec dice "si >300ms → lazy, si <300ms → eager". Como no puedo medirlo en local sin acceso a la DB, evalúo por lógica:
- Las 6 queries son simples (by `user_id`, indexed). Individualmente < 50ms cada una.
- En `Promise.all` → total estimado **150-250ms**.
- Pero el impacto más importante no es la latencia individual sino que **se ejecutan en TODOS los Server Components del layout**, en todas las páginas. Eso es overhead constante para features que la mayoría de las navegaciones no usan.

**Recomendación: Lazy fetch.** El overhead de eager en todas las páginas supera el costo de un loading state de ~200ms al abrir el sheet. Implementación: Client Component dentro del sheet que hace los fetches con `useEffect` al montarse, muestra skeleton mientras carga.

---

## 9. Inventario de componentes UI confirmados

| Componente | Existe | Listo para usar |
|------------|--------|----------------|
| `Sheet, SheetContent, SheetTrigger, ...` | ✅ | ✅ — `@base-ui/react/dialog` disponible |
| `Separator` | ✅ | ✅ — `@base-ui/react/separator` disponible |
| `AlertDialog` | ❌ | Requiere `npx shadcn add alert-dialog` |
| `Button` | ✅ | ✅ |
| `Dialog` | ✅ | ✅ |

---

## 10. Plan de implementación propuesto

Orden de operaciones (asumiendo luz verde en decisiones A y B):

1. `npx shadcn add alert-dialog` (si sonner = Opción A, también `npm install sonner`)
2. Crear `lib/navigation/get-nav-items.ts` (con hrefs corregidos)
3. Crear `components/navigation/nav-item.tsx`
4. Crear `components/navigation/user-section.tsx` (con `AlertDialog` para logout)
5. Implementar `components/navigation/navigation-drawer.tsx` (Sheet side="left")
6. Implementar `components/navigation/perchita-fab.tsx` (Sheet side="bottom" con lazy CapturaForm, oculto en `/captura`)
7. Crear `components/navigation/mango-ai-button.tsx` (Sheet side="bottom" compartido)
8. Implementar `components/navigation/desktop-sidebar.tsx` (branding + MangoAIButton + nav items)
9. Implementar `components/navigation/mobile-bottom-nav.tsx` (5 slots + FAB en centro)
10. Eliminar `components/navigation/app-header.tsx` (Opción A del spec — no hace falta con sidebar+bottom nav)
11. Vaciar `components/navigation/perchita-bottom-sheet.tsx` (Opción A del spec — sheet vive en FAB+MangoAI)
12. Modificar `app/(app)/layout.tsx`:
    - Agregar `asistente_nombre` al select de profiles
    - Cambiar outer div a `md:flex-row`
    - Quitar Header viejo
    - Agregar DesktopSidebar + MobileBottomNav + PerchitaFAB con props
    - Agregar `<Toaster />` si se elige sonner
13. Verificar con grep que Header solo está en layout
14. Eliminar `components/shared/header.tsx`
15. `npm run build`
16. Commit monolítico

---

## 11. Resumen ejecutivo

| Item | Estado |
|------|--------|
| lucide-react instalada | ✅ |
| @base-ui/react disponible | ✅ |
| Sheet.tsx funcional | ✅ (usa @base-ui/react/dialog internamente) |
| alert-dialog.tsx | ❌ necesita `npx shadcn add alert-dialog` |
| Header solo importado en layout | ✅ |
| Stop condition por dependencias rotas | NO |
| Stop condition por acoplamiento complejo | NO |
| **Decisión A (toast)** | ⏸️ **REQUIERE CONFIRMACIÓN** |
| **Decisión B (eager vs lazy fetch)** | ⏸️ **REQUIERE CONFIRMACIÓN** |
| Hrefs a corregir respecto al spec | `/` → `/dashboard`, `/personas-y-grupos` → `/personas` |
