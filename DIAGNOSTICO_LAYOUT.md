# DIAGNOSTICO_LAYOUT.md

Generado: 2026-05-12  
Branch: feat/navegacion-reformada  
Pre-condición: PASO 3 commiteado (afe36da). Ningún archivo productivo fue tocado para generar este diagnóstico.

---

## 1. Inventario del layout actual

### Archivo: `app/(app)/layout.tsx`

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/shared/header";

export default async function AppLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completado, modo")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.onboarding_completado) redirect("/onboarding");

  return (
    <div className="min-h-screen flex flex-col">
      <Header userEmail={user.email} modo={profile.modo ?? "personal"} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
```

### Tipo de componente

**Server Component** (async, no `"use client"`, usa `createClient()` del server).

### Fetches server-side

| Query | Tabla | Columns | Propósito |
|-------|-------|---------|-----------|
| `supabase.auth.getUser()` | auth | — | Auth check → redirect si no hay sesión |
| `supabase.from("profiles").select("onboarding_completado, modo")` | profiles | `onboarding_completado, modo` | Gate de onboarding + `modo` para nav condicional |

Solo 2 queries, ambas livianas. No hay fetches complejos.

### Estructura del JSX

```
div.min-h-screen.flex.flex-col
  ├── Header (userEmail, modo)
  └── main.flex-1.p-4.md:p-6
        └── {children}
```

### Props que recibe el layout

Solo `{ children: React.ReactNode }`. Sin providers, sin context.

### Side effects / redirects

| Condición | Acción |
|-----------|--------|
| `!user` | `redirect("/login")` |
| `!profile \|\| !profile.onboarding_completado` | `redirect("/onboarding")` |

---

## 2. Mapa de responsabilidades actuales

| Bloque | Decisión | Justificación |
|--------|----------|---------------|
| `supabase.auth.getUser()` + redirect `/login` | 🟢 Se conserva sin tocar | Auth gate obligatorio |
| `supabase.from("profiles").select(...)` + redirect `/onboarding` | 🟢 Se conserva sin tocar | Onboarding gate obligatorio. Además provee `modo` al nav. |
| `<Header userEmail modo />` | 🟢 Se conserva — es el "sidebar viejo" | Se mantiene funcional en PASO 4. Se elimina en PASO 5. |
| `<main className="flex-1 p-4 md:p-6">` | 🔵 Se modifica — agregar `pb-20 md:pb-0` | Para el futuro bottom nav mobile. |
| `div.min-h-screen.flex.flex-col` | 🟡 Ver Hallazgo crítico §5 | El cambio a `md:flex-row` tiene implicaciones visuales. |

---

## 3. Identificación de acoplamientos

| Acoplamiento | Tipo | Detalle |
|-------------|------|---------|
| `Header` recibe `userEmail={user.email}` | Trivial | El layout ya tiene `user` del auth check. No requiere query adicional. |
| `Header` recibe `modo={profile.modo}` | Trivial | El layout ya fetchea `profiles.modo`. El nuevo `AppHeader` en PASO 5 necesitará el mismo dato — la query ya existe. |

**No hay acoplamientos con:**
- `usePathname`, `useSearchParams`, `useParams` → no están en el layout
- `localStorage`, `sessionStorage`, cookies → no están en el layout
- Context providers o state global → el layout no tiene ninguno
- Middleware/redirects que asuman estructura → el middleware solo valida sesión, no estructura de componentes

**Total acoplamientos no triviales: 0.** Stop condition no activada por acoplamientos.

---

## 4. Análisis del "sidebar viejo" (= `Header`)

### Archivo: `components/shared/header.tsx`

**Es Client Component** (`"use client"`). Recibe `{ userEmail?: string; modo?: string }`.

**Qué renderiza:**
- Logo MANGO (placeholder)
- Nav desktop horizontal: Inicio, Movimientos, Captura, Cuentas, Balances, Préstamos, + Profesional (si modo="profesional" o "ambos")
- Acciones: email del usuario, ícono Settings → `/ajustes`, botón "Salir"
- Hamburguesa mobile: menú desplegable con los mismos links + Cerrar sesión

**¿Es responsive?** Sí: el nav desktop usa `hidden sm:flex`, la hamburguesa usa `sm:hidden`. No se oculta totalmente en mobile — muestra el logo y el menú hamburguesa.

**¿Cómo lo reemplaza `DesktopSidebar` en PASO 5?** En PASO 5 se elimina `Header` y se implementan `AppHeader` (nav horizontal desktop) + `MobileBottomNav` + `NavigationDrawer`. `DesktopSidebar` solo existe si la arquitectura final tiene sidebar lateral; actualmente el spec lo define como placeholder para esa posibilidad.

---

## 5. ⚠️ Hallazgo crítico — Contradicción entre "no disruptivo" y clases del placeholder

El spec establece dos cosas que se contradicen:

**A) Requerimiento:** "este PASO debe ser visualmente NO disruptivo. El usuario que abra `/captura` debe ver lo mismo que ve hoy."

**B) Clases de los placeholders en el spec:**
```tsx
// AppHeader:
<header className="hidden md:flex h-14 border-b border-border">
// DesktopSidebar:
<aside className="hidden md:flex w-60 border-r border-border">
```

**El problema:** `hidden md:flex` + `h-14` y `w-60` hacen que en desktop estos elementos sean **visualmente presentes aunque vacíos**:
- `DesktopSidebar`: en desktop, `display: flex` + `w-60` = columna de 240px sin contenido a la izquierda del contenido principal. **Disruptivo visualmente.**
- `AppHeader`: en desktop, `display: flex` + `h-14` = fila de 56px vacía encima del contenido. **Disruptivo visualmente.**

Esto se agrava si el outer div cambia a `md:flex-row` (como muestra el spec), porque el `DesktopSidebar` vacío de 240px efectivamente "empujaría" el contenido hacia la derecha en desktop.

**Mitigación C recomendada (la más segura para PASO 4):**

1. **NO cambiar** el outer div a `md:flex-row` todavía — ese cambio va con el contenido real en PASO 5.
2. **Añadir los 6 placeholders** con `className="hidden"` únicamente — invisibles en todos los breakpoints, pero presentes en el DOM (cumplen el propósito de "estructuralmente en su slot").
3. **Añadir `pb-20 md:pb-0`** al `<main>` — único cambio visible (80px de padding bottom en mobile, 0 en desktop).
4. **Mantener `Header` y outer div sin cambios estructurales.**

Con esto, en PASO 5:
- Cambiar `hidden` → `hidden md:flex` (o similar) en los placeholders al implementarlos
- Cambiar outer div a `md:flex-row`
- Eliminar `Header`

---

## 6. Plan de refactor propuesto (con mitigación C)

### Archivos a crear

| Archivo | Clase del wrapper | Visible en PASO 4 |
|---------|------------------|------------------|
| `components/navigation/app-header.tsx` | `hidden` | No (DOM only) |
| `components/navigation/desktop-sidebar.tsx` | `hidden` | No (DOM only) |
| `components/navigation/mobile-bottom-nav.tsx` | `hidden` | No (DOM only) |
| `components/navigation/navigation-drawer.tsx` | `hidden` | No (DOM only) |
| `components/navigation/perchita-fab.tsx` | `hidden` | No (DOM only) |
| `components/navigation/perchita-bottom-sheet.tsx` | `hidden` | No (DOM only) |

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/(app)/layout.tsx` | Importar los 6 nuevos componentes + añadir `pb-20 md:pb-0` al `<main>` + mantener `Header` y outer div sin tocar |

### Archivos que NO se tocan

| Archivo | Razón |
|---------|-------|
| `components/shared/header.tsx` | "sidebar viejo" — se mantiene funcional |
| Todas las páginas individuales | Out of scope — si hay colisión de padding, se anota en BUGS_DETECTADOS |

### Layout resultante (PASO 4)

```tsx
<div className="min-h-screen flex flex-col">          {/* SIN CAMBIOS */}
  <Header userEmail={user.email} modo={profile.modo} /> {/* SIN CAMBIOS */}
  
  <main className="flex-1 p-4 md:p-6 pb-20 md:pb-0"> {/* SOLO SE AGREGA pb-20 md:pb-0 */}
    {children}
  </main>
  
  {/* 6 placeholders invisibles — solo en DOM */}
  <AppHeader />              {/* hidden */}
  <DesktopSidebar />         {/* hidden */}
  <MobileBottomNav />        {/* hidden */}
  <PerchitaFAB />            {/* hidden */}
  <NavigationDrawer />       {/* hidden */}
  <PerchitaBottomSheet />    {/* hidden */}
</div>
```

### Layout resultante (PASO 5, para referencia)

```tsx
<div className="flex flex-col min-h-screen md:flex-row"> {/* CAMBIA a md:flex-row */}
  <DesktopSidebar />   {/* hidden md:flex w-60 — con contenido real */}
  <div className="flex-1 flex flex-col">
    <AppHeader />      {/* hidden md:flex h-14 — con contenido real */}
    <main className="flex-1 p-4 md:p-6 pb-20 md:pb-0">
      {children}
    </main>
  </div>
  <MobileBottomNav />  {/* md:hidden fixed bottom-0 — con contenido real */}
  <PerchitaFAB />      {/* md:hidden fixed — con contenido real */}
  <NavigationDrawer /> {/* drawer con trigger */}
  <PerchitaBottomSheet /> {/* sheet con CapturaForm */}
</div>
```

---

## 7. Resumen ejecutivo

| Item | Estado |
|------|--------|
| Tipo de layout | Server Component — simple, sin complejidad |
| Fetches | Solo auth + profile (2 queries ya existentes) |
| Sidebar viejo | Es el `Header` horizontal, NO un sidebar lateral |
| Acoplamientos no triviales | 0 |
| Stop condition activada | NO (por acoplamientos) |
| Hallazgo crítico | Las clases del spec para los placeholders son visualmente disruptivas si se aplican en PASO 4. **Se requiere confirmación de Benja sobre el enfoque.** |
| Recomendación | Mitigación C: usar `hidden` en todos los placeholders, no cambiar el outer div a `md:flex-row` en este PASO, solo agregar `pb-20 md:pb-0` al main. |
