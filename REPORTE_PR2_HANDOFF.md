# REPORTE — PR2 Visual, capa 2 (handoff real MANGO, "layer on top")

**Rama:** `feat/pr2-visual` · **HEAD:** `130d36c` · **Sin push.**
**Decisión founder:** Opción A — conservar los 14 commits del flip como base y aplicar encima el handoff (`brand/design_handoff_mango/README.md` = autoridad).
**Modo:** auditoría previa → A.1–A.5 con commit atómico por bloque → **checkpoint acá.**

---

## 0. Auditoría de los 14 commits del flip (previo a tocar nada)

| Check | Resultado |
|---|---|
| ¿Se tocó estructura (rutas, `lib/navigation`, server actions, `lib/domain`, `lib/ai`, `hooks`, `types`, `api`, `proxy`)? | ❌ **NO** — 0 archivos en esas rutas |
| ¿Se tocó algún `.ts` puro / lógica / props? | ❌ **NO** — solo `.tsx` (className), `globals.css`, `layout.tsx` |
| ¿Se copió markup de los HTML del handoff? | ❌ **NO** — imposible (los commits son previos al ZIP); diff = solo `<MangoLogo>` propio + edits de color de charts |
| `npm run build` estado inicial | ⚠️ falló por `.next/dev/types/routes.d.ts` corrupto (cache stale) → `rm -rf .next` → ✅ **exit 0** |

**Auditoría LIMPIA.** El flip es capa visual pura → se procede con la capa 2.

---

## 1. `npm run build` (última corrida, literal)

```
✓ Compiled successfully in ~5s
  Running TypeScript ... Finished TypeScript
✓ Generating static pages (22/22)
Route (app): / · /ajustes · /balances · /captura · /cash-flow · /categorias ·
/cuentas · /cuentas/[id] · /cuentas/tarjetas/[id] · /dashboard · /login ·
/movimientos · /movimientos-recurrentes · /onboarding · /personas ·
/prestamos · /prestamos/[id] · /signup · /tarjetas   (+ api, auth/callback)
ƒ Proxy (Middleware)     ·     EXIT 0
```
Build **verde antes de cada commit** (A.1–A.5 + docs).

## 2. Bloques y archivos (commit atómico por bloque)

| Bloque | Commit | Archivos |
|---|---|---|
| docs handoff | `f84d9dc` | +`brand/design_handoff_mango/{README.md, MANGO Branding.html, MANGO Desktop.html}` · −`brand/mango-branding.html` |
| **A.1** fonts | `5d223db` | `app/layout.tsx`, `app/globals.css`, `components/ui/mango-logo.tsx` |
| **A.2** logo | `edc75d7` | `components/ui/mango-logo.tsx`, `public/icons/favicon.svg`, `public/manifest.json` |
| **A.3** sidebar hex | `69c782f` | `app/globals.css` |
| **A.4** íconos | `f3664cb` | `app/(app)/movimientos/_components/movimiento-editor.tsx` |
| **A.5** botón MANGO AI | `c25f6f6` | `components/navigation/mango-ai-button.tsx` |
| docs PASO 0 | `130d36c` | `DIAGNOSTICO_PR2_VISUAL.md` |

**Total capa 2:** 8 archivos de código/config modificados, 3 creados (handoff), 1 borrado. Sin archivos de negocio/lógica.

## 3. Dependencias nuevas
**Ninguna.** Manrope/Space Grotesk (next/font) y Lucide ya estaban. `package.json` sin cambios.

## 4. `git status` (literal)
```
On branch feat/pr2-visual
Untracked: (reportes/specs .md sueltos, sin trackear a propósito)
  REPORTE_PR2_HANDOFF.md, REPORTE_FINAL_PR2_VISUAL.md, SPEC_PR2_VISUAL.md, …
nothing to commit (working tree limpio salvo esos .md)
```
`brand/` reorganizada y commiteada (handoff extraído). ZIP eliminado del repo.

## 5. Confirmaciones STOP
❌ Sin `git push` · ❌ Sin migrations / DB intacta · ❌ `.env.local` intacto · ❌ Sin copiar markup de los HTML del handoff (MangoMark/wordmark/favicon **recreados** del spec del README) · ✅ `brand/` solo tocada para la reorganización que autorizaste ("Commit del cambio") · ✅ scratchpad intacto · ✅ estructura/rutas/lógica/props intactas · ✅ build verde antes de cada commit · ✅ 1 commit por bloque.

## 6. Decisiones y conflictos brand vs. app

**Resueltos:**
1. **Fuentes:** README = autoridad → saqué **Poppins** (era default de la herramienta de diseño); wordmark y UI en **Manrope**, cifras en **Space Grotesk**. `font-display`/`font-heading` → Manrope.
2. **Logo:** reemplazado el placeholder "M en cuadrado" por **MangoMark real** (mango + hoja, "nunca sin hoja"), **recreado en CSS/SVG** desde la sección "Objetos de branding" del README (no copié markup). Variantes `onLight` (chip navy) y `onNavy` (chip blanco, mango sobresale). + wordmark con guiño **"Ai"** (tittle oro). Verificado por screenshot.
3. **Favicon + manifest:** favicon SVG con mango+hoja; `manifest` theme_color → navy `#1E3A5F`, background → blanco.
4. **Sidebar** `#F9FAFB` → `#FBFAF7` (match README).
5. **Íconos:** `💳` (cuotas) → Lucide `CreditCard`. Nav ya era Lucide.

**Conflictos / bloqueados (dispararon stop condition, NO forcé):**
1. **Íconos de categoría = DATO de DB** (`categorias.icono`). Cambiarlos a Lucide requiere una **capa de mapping emoji→Lucide** (lógica nueva) o migración de datos (DB prohibida). **Fuera de scope visual.** → follow-up.
2. **FAB 🥭 mobile:** el README lo muestra como 🥭; el botón MANGO AI sí recibió el MangoMark. Para no meter un cuadrado dentro del círculo del FAB, lo **dejé como 🥭** (per la excepción que definiste). → revisá si querés MangoMark ahí.
3. **A.5 — Balance card navy + blob:** el dashboard real es un **grid de 5 stat-cards**, estructuralmente distinto del mockup (hero navy `1.6fr 1fr 1fr` + mini cards). Matchearlo = **reestructurar** el dashboard, no estilo puro. **PARÉ** (stop condition de A.5).
4. **A.5 — Sheet MANGO AI rediseñado:** el sheet envuelve `CapturaForm` (**componente de negocio con lógica**). El rediseño del mockup (textarea + pills sugeridas + bloque "MANGO AI entendió" + 2 botones) = **reestructurar negocio**. **PARÉ** (stop condition de A.5).

➡️ **Balance card y Sheet necesitan luz verde explícita para reestructurar** (o un PR dedicado). No son "estilos sobre lo existente".

## 7. Validación para el founder (ruta por ruta, `npm run dev`)

| # | Ruta | Qué mirar |
|---|------|-----------|
| 1 | `/login`,`/signup` | **MangoMark real** (mango+hoja navy) + wordmark Manrope; split navy si aplica; fondo claro |
| 2 | `/onboarding` | MangoMark + wordmark, pasos claros |
| 3 | `/dashboard` | Sidebar **`#FBFAF7`** con MangoLogo+wordmark; botón **MANGO AI con mango real** (chip blanco, mango sobresale) navy/crema; cifras Space Grotesk; **(la Balance card sigue siendo el grid de 5 — NO es la card navy del mockup, ver §6.3)** |
| 4 | `/movimientos` | Montos success/danger Space Grotesk; chip cuotas con ícono **CreditCard**; íconos de categoría **siguen siendo emojis de DB** (ver §6.1) |
| 5 | `/balances`,`/prestamos`,`/cash-flow` | Tokens semánticos, cifras Space Grotesk, charts en claro |
| 6 | `/cuentas`,`/tarjetas`,`/personas`,`/categorias`,`/ajustes`,`/movimientos-recurrentes` | Sin dark residual, paleta MANGO |
| 7 | FAB mobile (375px) → sheet | FAB **sigue 🥭** (ver §6.2); sheet funciona pero **estética actual, NO el rediseño del mockup** (ver §6.4) |
| 8 | Favicon / PWA | Pestaña muestra mango+hoja; manifest theme navy |
| 9 | Console | Sin errores; Manrope/Space Grotesk cargadas (Network); sin Poppins |

**Nota fuente:** el header desktop del handoff dice "Hola, Sofía 👋" — es copy del mockup; la app usa el nombre real del usuario. Sin cambios.

---

## Estado de bloques

| Bloque | Estado |
|---|---|
| Auditoría flip | ✅ limpia |
| A.1 fuentes (Manrope, sin Poppins) | ✅ |
| A.2 logo (MangoMark+hoja, favicon, manifest) | ✅ |
| A.3 sidebar `#FBFAF7` | ✅ |
| A.4 íconos (CreditCard; categorías=DB→report) | ✅ parcial + report |
| A.5 botón MANGO AI | ✅ |
| A.5 Balance card navy + blob | ⛔ bloqueado (reestructura) |
| A.5 Sheet MANGO AI rediseñado | ⛔ bloqueado (reestructura) |

**PARO acá (checkpoint). Espero tu decisión sobre A.5 (Balance card + Sheet): ¿autorizás reestructurar esos componentes en este PR, o van a un PR dedicado?**
