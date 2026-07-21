# DIAGNÓSTICO PR2 VISUAL — PASO 0

**Rama:** `feat/pr2-visual` (confirmada)
**Build baseline:** ✅ `npm run build` → **exit 0** (verde, sin cambios)
**Fecha:** 2026-07-20

> ⚠️ **RESULTADO: PARADA OBLIGATORIA.** Se dispararon **4 stop conditions** del PASO 0. El spec fue escrito contra una arquitectura que **no coincide** con el repo real. Ver sección "🚨 CONFLICTOS CRÍTICOS" al final. **No se tocó código.**

---

## 1. CSS / globales existentes

**Ubicación única:** `app/globals.css` (152 líneas). No hay `styles.css` ni otros globales.

**Stack real (Tailwind v4):**
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
@custom-variant dark (&:is(.dark *));
@theme inline { ... }   /* tokens mapeados a variables */
```

- **No hay `@media (prefers-color-scheme)`.** El tema no reacciona al sistema.
- Tokens definidos con **`oklch(...)`**, no hex. Ej: `--primary: oklch(0.55 0.24 280)` (violeta), `--background: oklch(0.05 0 0)` (casi negro).
- Custom tokens MANGO ya existentes: `--surface`, `--surface-2`, `--success` (verde oklch), `--warning` (ámbar oklch), `--subtle`.
- `@layer base` fuerza `body { bg-background text-foreground }` y `html { font-sans }`.

### ¿Hay dark mode heredado? → **SÍ, y es dark-ONLY (no es un toggle removible).**

- `app/layout.tsx` línea 28: `<html className="... dark h-full ...">` → **la clase `dark` está hardcodeada en el `<html>`, siempre**.
- `:root` (líneas 58-99) define la paleta **oscura**. `.dark` (líneas 102-139) **replica exactamente** `:root`. Comentario textual del archivo: *"MANGO siempre usa dark mode — no hay light mode en V1"*.
- **`CLAUDE.md` del repo lo declara como invariante:** *"Dark mode only — html always has dark class; there is no light theme in V1."*

➡️ El spec pide **fondo `#FFFFFF` blanco puro, solo light, sin dark**. Eso **no es "remover un dark mode"**: es **invertir el tema completo** de oscuro a claro. Choca frontalmente con el estado del repo y con CLAUDE.md.

---

## 2. Estado de Tailwind config

### ❌ **NO existe `tailwind.config.ts` / `.js`.**

Solo hay:
- `postcss.config.mjs` → único plugin: `@tailwindcss/postcss` (Tailwind **v4**).
- `components.json` → shadcn `style: "base-nova"`, `baseColor: "neutral"`, `cssVariables: true`, y **`"config": ""`** (vacío a propósito — v4 no usa archivo de config).

➡️ Toda la sección **"3. Actualizar tailwind.config.ts"** del spec **no aplica**. En Tailwind v4 los colores/fuentes se extienden dentro de `@theme` en `globals.css`, no en un archivo JS/TS. No usa "preset de shadcn" clásico; usa `@import "shadcn/tailwind.css"`.

**Paleta actual (oklch, dark):** primary violeta `oklch(0.55 0.24 280)`, background `oklch(0.05 0 0)`, card `oklch(0.09...)`, success verde `oklch(0.72 0.19 145)`, warning ámbar, destructive rojo, + 5 chart colors + set completo de sidebar.

---

## 3. Fuentes actuales

`app/layout.tsx`:
```tsx
import { Inter } from "next/font/google";
const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });
// <html className={`${inter.variable} dark h-full antialiased`}>
```

- **Ya usa `next/font`** (bien: alineado con la preferencia del spec, sin `<link>` a Google Fonts, **sin problema de CSP/middleware**).
- Solo carga **Inter**, expuesta como `--font-sans`. No hay Poppins/Space Grotesk/Manrope.
- `--font-mono` se referencia en `@theme` pero **no está definida** (queda vacía).
- ➡️ Migrar a Manrope + Poppins + Space Grotesk con `next/font` es **directo y de bajo riesgo** (es la parte del spec que sí encaja).

---

## 4. Componentes shadcn/ui existentes (`components/ui/`)

12 componentes: `button`, `input`, `label`, `card`, `tabs`, `dialog`, `named-select`, `select`, `alert-dialog`, `separator`, `sheet`, `skeleton`.

➡️ Todos consumen los tokens oklch (`bg-card`, `text-foreground`, `border-border`, etc.). **Heredarían automáticamente** cualquier cambio de tokens — pero hoy están calibrados para **fondo oscuro**. Si se invierte a fondo blanco sin recalibrar cada token, quedan rotos (texto claro sobre blanco).

---

## 5. Colores hardcoded en componentes

| Métrica | Cantidad |
|---|---|
| Ocurrencias de `text/bg/border-(green\|red\|blue\|amber\|yellow\|emerald\|rose\|orange)-NNN` | **240** |
| Archivos afectados por esas clases | **18** |
| Hex literales en `.tsx` | **40** |

**> 30 → STOP CONDITION DISPARADA** (spec PASO 0 y stop condition #3).

**Naturaleza de los 240:** casi todos son clases **calibradas para dark** — `text-green-400`, `bg-red-900/30`, `text-emerald-400`, `bg-amber-500/15 text-amber-400`, etc. En fondo blanco muchos pierden contraste o se ven fluor.

**Hex literales (40)** — categorías:
- **Logo placeholder** navy/crema: `bg-[#1e3a5f]`, `text-[#e8d9b4]` (login, signup, onboarding) — ver punto 6.
- **Botón/FAB** navy inline: `backgroundColor: "#1e3a5f"` (mango-ai-button, perchita-fab).
- **Logos de Google** (SVG login/signup): `#4285F4 #34A853 #FBBC05 #EA4335` — **no tocar** (marca de terceros).
- **Colores de charts Recharts** (dashboard, cash-flow, grafico-evolucion): `#22c55e #ef4444 #818cf8 #64748b #1e293b ...` — pasados como props a `<Cell>/<Line>/<Bar>`, **no son clases Tailwind**, no se tokenizan trivialmente.

**Candidatos "obvios" a semántico (ingresos/egresos), según spec:** los `text-green-400`/`text-red-400` de montos en `dashboard-client.tsx`, `movimientos-client.tsx`, `balances-client.tsx`, `cuentas/page.tsx`. Pero incluso "solo los obvios" son **decenas** de líneas repartidas.

---

## 6. Logo actual (placeholder)

**Placeholder cuadrado navy + "M" crema** (`<div bg-[#1e3a5f]><span text-[#e8d9b4]>M</span></div>`):

| Archivo | Instancias |
|---|---|
| `app/(auth)/signup/page.tsx` | 2 (líneas 86-87, 106-107) |
| `app/(auth)/login/page.tsx` | 1 (78-79) |
| `app/onboarding/page.tsx` | 1 (54-55) |

→ **3 archivos** (4 instancias) con el M-square.

**Marca 🥭 emoji + navy** (variante distinta del mismo branding):

| Archivo | Uso |
|---|---|
| `components/navigation/desktop-sidebar.tsx` | `🥭 + "MANGO"` (línea 22-23) |
| `components/navigation/mango-ai-button.tsx` | `🥭` + `backgroundColor: "#1e3a5f"` (25-28) |
| `components/navigation/perchita-fab.tsx` | `🥭` + navy bg (25) |

→ **3 archivos** más con el emoji navy.

**Total superficies de marca: 6 archivos.** El spec pone la stop condition en *">6 componentes"* para el M-square específico → estrictamente son 3 (no dispara), pero contando ambas variantes estamos **en el límite (6)**. Dado que el spec ya recomienda la opción A (`<MangoLogo />`), **conviene crear el componente compartido primero** y unificar M-square + emoji.

**"MANGO AI" (texto/nombre asistente):** en `ajustes-page-content.tsx`, `onboarding/page.tsx`, `(app)/layout.tsx` como valor por defecto de `asistente_nombre` — es **dato**, no logo. No tocar.

---

## 7. Conflictos con brand guide

- `brand/mango-branding.html` es **solo referencia** (no se importa ni compila). ✅
- El "logo" del brand es un **mango 3D hecho con ~5 divs y gradientes/blur** (no hay SVG). Extraerlo a `public/logo/mango-logo.svg` **no es trivial** (no existe SVG; habría que recrearlo). El spec propone un placeholder mucho más simple (cuadrado navy con "M"), que es lo que ya existe. ➡️ Para este PR, **no** extraer el mango 3D; mantener el M-square o el emoji dentro de `<MangoLogo />`.

---

## 🚨 CONFLICTOS CRÍTICOS — el spec no coincide con el repo

| # | El spec asume… | El repo real es… | Impacto |
|---|---|---|---|
| **A** | App **light**, fondo `#FFFFFF`, "sin dark mode" | **Dark-ONLY**: `<html class="dark">` fijo, `:root` oscuro, CLAUDE.md lo declara invariante | Invertir tema = reescribir todos los tokens oklch **y** re-tunear 240 clases de color dark. **Enorme.** |
| **B** | Editar `tailwind.config.ts` con `extend.colors/fontFamily` | **No existe config file**; Tailwind v4 con `@theme inline` en `globals.css` | La sección 3 del spec no aplica; tokens van en `@theme` |
| **C** | Tokens en **hex** (`#1E3A5F`, `#10B981`…) | Tokens en **oklch** (`oklch(0.55 0.24 280)`…) | Mezclar hex crudo rompe consistencia; hay que decidir formato |
| **D** | Colores hardcoded acotados ("solo obvios") | **240 ocurrencias / 18 archivos** | > umbral 30 del propio spec |

### Stop conditions disparadas (PASO 0 + lista final del spec)
- ✅ **#3 / "más de 30 colores hardcoded"** → 240. Confirmado.
- ✅ **"tema oscuro previo"** → existe y es el modo único; pasar a light es reescritura, no remoción.
- ✅ **"tailwind.config con extensiones raras"** → no hay config; el paradigma es distinto (v4 `@theme`).
- ⚠️ **#4 logo** → 3 archivos M-square (no dispara el ">6"), pero 6 superficies de marca en total → recomiendo `<MangoLogo />` primero de todas formas.

### NO disparadas (buenas noticias)
- ❌ Fonts por CSP/middleware → **no**: `next/font` self-hosted, sin `<link>`, `proxy.ts` no bloquea nada relevante.
- ❌ Build roto → **no**: baseline verde.

---

## Recomendación (para decisión de Benja)

El spec fue diseñado para una app light con config Tailwind clásica. Este repo es lo opuesto (dark-only, Tailwind v4/oklch). **Aplicarlo literal implica inversión total de tema + re-tuneo de 240 usos de color** — eso es varios PRs, no "sentar bases".

Tres caminos posibles:

- **Opción 1 — Rebrand DARK (recomendada):** mantener dark-only y aplicar la identidad MANGO **sobre** el tema oscuro: cargar las 3 fuentes, redefinir los tokens oklch hacia el sistema MANGO (navy/oro como acentos, no como fondo blanco), crear `<MangoLogo />`, unificar el botón MANGO AI. **Bajo riesgo, cabe en un PR, respeta CLAUDE.md.** Requiere reinterpretar la tabla "Fondo app #FFFFFF" del spec.
- **Opción 2 — Girar a LIGHT (lo que dice el spec literal):** invertir todo el tema a fondo blanco. **Alto riesgo y alcance**: reescribir `:root`/`.dark`, recalibrar los 12 shadcn y las 240 clases dark. Va en contra de CLAUDE.md. Debería ser su propio PR grande (o varios).
- **Opción 3 — Solo lo no-conflictivo ahora:** en este PR hacer **únicamente fuentes + `<MangoLogo />` + tokens de marca añadidos sin invertir el tema**; dejar la decisión light/dark y el re-tuneo de color para un PR posterior.

**Mi voto: Opción 1** (o arrancar por Opción 3 y decidir el resto después). No avanzo hasta que elijas y me des luz verde.

---

## ADDENDUM — Diagnóstico complementario PASO 0 (SPEC V2, flip completo a light)

Decisión tomada por Benja: **flip completo dark→light** (SPEC_PR2_VISUAL_V2.md). Complemento requerido:

### 1. Categorización de las clases de color (275 ocurrencias / 18 archivos)

| Archivo | Ocurrencias | Categoría dominante |
|---|---|---|
| `dashboard/_components/dashboard-client.tsx` | 49 | A (green/red montos) + D |
| `cuentas/[id]/page.tsx` | 46 | A + D |
| `movimientos/_components/movimientos-client.tsx` | 37 | A + B (badges) |
| `cuentas/page.tsx` | 32 | A + C (badges tipo cuenta) |
| `movimientos/_components/movimiento-editor.tsx` | 30 | A + B |
| `prestamos/[id]/_components/prestamo-detalle-client.tsx` | 16 | A |
| `balances/_components/balances-client.tsx` | 14 | A |
| `prestamos/_components/prestamos-client.tsx` | 12 | A |
| `captura/_components/revision-modal.tsx` | 12 | A/B (niveles confianza) |
| `movimientos-recurrentes-page-content.tsx` | 7 | A |
| `movimientos/_components/generar-pendientes-modal.tsx` | 7 | A |
| `categorias/categorias-page-content.tsx` | 3 | A + C |
| `prestamos/[id]/registrar-pago-prestamo-modal.tsx` | 3 | A |
| `cuentas/tarjetas/[id]/page.tsx` | 2 | A |
| `cuentas/_components/actualizar-valor-modal.tsx` | 2 | A |
| `categorias/importar-template-modal.tsx` | 1 | A |
| `ajustes/ajustes-page-content.tsx` | 1 | A |
| `movimientos/_components/creatable-select.tsx` | 1 | D |

**Breakdown por color base:** green 70 · red 59 · emerald 33 · amber 33 · orange 16 · blue 16 · yellow 13 · sky 9 · purple 9 · indigo 9 · violet 8.

**Mapeo:**
- **A (green/emerald/lime → `text-success`; red/rose → `text-danger`)** — ingresos/egresos/saldos. La mayoría.
- **B (amber/yellow/orange → `text-warning`)** — alertas, niveles de confianza baja/media.
- **C (blue/sky/indigo/violet/purple → `text-info` o color de categoría)** — badges de tipo de cuenta (plazo_fijo, fci), niveles de necesidad. Varios son **charts Recharts** (props hex, no clases) → se mapean a tokens pero con criterio.
- **D (grises)** — **ya usan tokens shadcn** (`text-muted-foreground`, `bg-card`, `border-border`). **Flipean solos** al re-apuntar `:root`. Casi cero trabajo manual.

### 2. `@theme` actual
- ~45 variables en `@theme inline`. **Colores** (background, foreground, card, primary, muted, border, destructive, chart-1..5, sidebar-*, surface, success, warning, subtle) → **cambian** (re-apuntar `:root` a hex light). **Structural** (radius-sm..4xl, font-*) → **NO tocar**.
- Fuentes: `Inter` con next/font como `--font-sans`. `--font-mono` referenciada pero vacía.
- **Estrategia clave:** re-apuntar los VALORES de los tokens shadcn en `:root` a light → los 12 componentes shadcn y todas las clases `text-foreground/bg-card/border-border` flipean sin tocar código.

### 3. CLAUDE.md
- **Única** referencia: línea 55 — `"**Dark mode only** — html always has dark class; there is no light theme in V1."` Sin interconexión. Se reescribe.

### 4. Componentes shadcn (12)
`button, input, label, card, tabs, dialog, named-select, select, alert-dialog, separator, sheet, skeleton` — todos del preset base-nova, consumen tokens. Heredan el flip.

### 5. `dark:` prefijos
- **24** ocurrencias. Quedan sin efecto tras remover `.dark`; se limpian en bloques de refactor + bloque 15.

### 6. `<html className="dark">`
- Solo en `app/layout.tsx` línea 28. **Un solo lugar** → stop condition NO disparada.

### 7. Stop conditions PASO 0 (V2)
- >20 archivos con 15+ clases → **6** archivos. ❌ No.
- shadcn custom que rompa → todos base. ❌ No.
- assets externos dark → SVGs default Next + favicon. ❌ No crítico.
- `<html dark>` en >1 layout → **1**. ❌ No.
- CLAUDE.md refs interconectadas → **1** línea. ❌ No.

✅ **PASO 0 V2 pasa. Se procede con los 15 bloques.**
