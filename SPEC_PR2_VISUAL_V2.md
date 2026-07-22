# SPEC_PR2_VISUAL_V2.md

## Objetivo

Aplicar la identidad visual completa de MANGO a la app: **flip de dark a light**, paleta de marca, tipografía. Este PR sienta las bases visuales completas del producto.

⚠️ **Este spec REEMPLAZA a `SPEC_PR2_VISUAL.md`**. La v1 no contemplaba que el repo es dark-only (Tailwind v4 con `@theme inline`, tokens oklch, 240 clases de color dark).

**Rama**: `feat/pr2-visual` (ya creada desde main actualizado post-merge del PR Remover Profesional)

**Referencia visual**: `brand/mango-branding.html` — brand guide importado

**Baseline**: build verde exit 0 al inicio (confirmado por diagnóstico complementario)

---

## Decisiones cerradas (NO cuestionar)

| Decisión | Resolución |
|----------|-----------|
| Alcance | Flip completo dark→light + tokens + fonts + logo + refactor 240 clases |
| Modo | Solo light. Sin toggle. Sin dark mode |
| Fuentes | Manrope (UI) + Poppins (wordmark) + Space Grotesk (números) |
| Navy primario | `#1E3A5F` |
| Crema | `#E8D9B4` — solo para wordmark MANGO sobre navy |
| Oro acento | `#C98A2B` — solo para links y hover, sutil |
| Fondo app | `#FFFFFF` blanco puro |
| Cards fondo | `#F9FAFB` |
| Colores semánticos | Verde `#10B981`, Rojo `#EF4444`, Ámbar `#F59E0B`, Azul `#3B82F6` |
| DM Serif Display | NO cargar (no se usa) |
| CLAUDE.md | Actualizar: quitar "no light theme in V1" |
| Modo trabajo | Autónomo, reporte al final |

---

## Paleta completa (tokens finales)

### Colores de marca
```
navy:       #1E3A5F   (primario, títulos, botón MANGO AI bg, logo bg)
cream:      #E8D9B4   (wordmark sobre navy, decorativo)
gold:       #C98A2B   (links, hover, acentos sutiles)
navy-hover: rgba(30, 58, 95, 0.9)
gold-hover: rgba(201, 138, 43, 0.85)
```

### Colores semánticos
```
success: #10B981   (ingresos, positive)
danger:  #EF4444   (egresos, negative)
warning: #F59E0B   (alertas)
info:    #3B82F6   (info neutral)
```

### Escala de grises (fondo/text/border)
```
bg-primary:      #FFFFFF   (fondo general app, cards principales)
bg-subtle:       #F9FAFB   (cards secundarias, hover states)
border-default:  #E5E7EB   (bordes hairline)
text-muted:      #9CA3AF   (placeholder, captions, iconos secundarios)
text-secondary:  #6B7280   (descripciones, subtítulos)
text-primary:    #111827   (body principal)
card-shadow:     rgba(30, 58, 95, 0.06)
```

---

## Fuentes

### Estrategia: next/font (NO Google Fonts link)

Ya el repo usa `next/font` con Inter. Migrar a Manrope/Poppins/Space Grotesk sigue el mismo patrón.

```tsx
// app/layout.tsx
import { Manrope, Poppins, Space_Grotesk } from 'next/font/google'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-poppins',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

// En el body:
<html lang="es"> {/* IMPORTANTE: sin className="dark" */}
  <body className={`${manrope.variable} ${poppins.variable} ${spaceGrotesk.variable} font-sans`}>
```

### Uso semántico

| Elemento | Fuente | Clase Tailwind |
|----------|--------|----------------|
| Body / UI general | Manrope | `font-sans` (default) |
| Wordmark "MANGO" (logo) | Poppins 800 | `font-display font-extrabold` |
| Números / saldos / cifras | Space Grotesk 600-700 | `font-mono font-semibold` |

---

## 📐 GUÍA VISUAL — Mockups de referencia

⚠️ **Estos mockups son la fuente de verdad visual del PR**. Claude Code debe recrear la app siguiendo esta estética.

### Mockup 1 — Dashboard

**Layout general**: sidebar 200px a la izquierda (fondo `#F9FAFB` con border-right `#E5E7EB`), main content con fondo blanco.

**Sidebar contents**:
- Logo top: cuadrado navy 28x28px con "M" en Poppins 800 crema, seguido de wordmark "MANGO" en Poppins 800 navy
- Botón "MANGO AI": fondo `navy`, texto `cream`, padding 10px 12px, radius 8px, con emoji 🥭
- Nav items: padding 8px 12px, texto secondary (`#6B7280`), activo = navy + fondo `rgba(30, 58, 95, 0.06)`
- Item "Más" al bottom con color muted

**Main content**:
- Título "Buen día, Benja" (Manrope 700, text-primary, 20px)
- Subtítulo fecha (secondary 12px)
- Link "Ver todo →" con color `gold` (`#C98A2B`)
- Card balance total: fondo `#F9FAFB`, border hairline, radius 12px, padding 16px
  - Label "BALANCE TOTAL" en muted 11px uppercase
  - Cifra grande: Space Grotesk 700, 30px, color navy
  - Ingresos: `text-success` en Space Grotesk 700 + label "ingresos" en muted
  - Egresos: `text-danger` en Space Grotesk 700 + label "egresos" en muted
- Grid 2 columnas de cards mini (Cuentas, Inversiones) con Space Grotesk para cifras

### Mockup 2 — Movimientos

**Layout**: fondo blanco, cards en `#F9FAFB` para filtros y white para lista.

**Header**:
- Título "Movimientos" (Manrope 700, 20px, text-primary)
- Subtítulo "47 registros · Julio 2026" (secondary 12px)
- Botón "+ Nuevo" navy con texto white, padding 8px 14px

**Filtros**:
- Pills con fondo `#F9FAFB`, border hairline, padding 6px 12px, radius 6px, texto navy 12px medium

**Lista movimientos**:
- Container white con border hairline
- Cada item: padding 12px 14px, border-bottom hairline
- Icon circular 32x32 con fondo `rgba(color, 0.1)` según success/danger
- Título Manrope 600 13px text-primary
- Subtitle Manrope 400 11px muted
- Monto: `text-success` o `text-danger` en Space Grotesk 700 14px
- Fecha en muted 10px

### Mockup 3 — Sheet MANGO AI (captura)

**Contenedor**: white, radius 12px, border hairline, padding 24px.

**Header**:
- Cuadrado navy 28x28 con 🥭 dentro
- "MANGO AI" en Poppins 700 16px navy
- Microcopy en secondary 13px

**Input**: textarea con fondo `#F9FAFB`, border hairline, padding 12px, Manrope 14px text-primary.

**Sugerencias**:
- Label "SUGERENCIAS" en muted 11px uppercase
- Pills con fondo `#F9FAFB`, border hairline, radius 16px (pill shape), texto navy 12px medium

**Botones**:
- "Cancelar": white con border hairline, texto secondary
- "🥭 Interpretar": navy con texto cream, flex-grow 2

---

## PASO 0 obligatorio — Diagnóstico complementario

⚠️ Ya se hizo el diagnóstico principal (`DIAGNOSTICO_PR2_VISUAL.md`). Antes de arrancar, complementá con:

### 1. Categorizar las 240 clases de color

Grep exhaustivo:
```bash
grep -rn "text-\|bg-\|border-\|from-\|to-\|via-" components/ app/ --include="*.tsx" | grep -E "(black|white|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]" | tee /tmp/color-classes.txt

# Contar por color base
grep -oE "(text|bg|border|from|to|via)-[a-z]+-[0-9]+" /tmp/color-classes.txt | sort | uniq -c | sort -rn > /tmp/color-summary.txt
cat /tmp/color-summary.txt
```

Categorizarlas en 5 grupos:
- **A** — Ingresos/egresos (green-*, emerald-*, red-*, rose-*) → `text-success` / `text-danger`
- **B** — Warnings (amber-*, yellow-*, orange-*) → `text-warning`
- **C** — Info (blue-*, sky-*, cyan-*, indigo-*) → `text-info`
- **D** — Grises (gray-*, slate-*, zinc-*, neutral-*, stone-*, white, black) → escala nueva (`text-muted`, `text-secondary`, `text-primary`, `bg-primary`, `bg-subtle`, `border-default`)
- **E** — Otros (purple, pink, etc.) → mapear individualmente según semántica

Documentar cada archivo con su cantidad de ocurrencias y en qué categoría cae la mayoría.

### 2. Análisis del `@theme` actual en globals.css

Mostrar contenido literal de `globals.css`. Identificar:
- Cuántas variables `@theme` hay
- Cuáles son colores base (van a cambiar)
- Cuáles son structural (radius, spacing) — NO tocar
- Cómo se cargan las fuentes actualmente (Inter con next/font)

### 3. Verificar CLAUDE.md

- Buscar la línea "no light theme in V1"
- Identificar cualquier otra regla relacionada con dark mode
- Determinar qué texto exacto hay que modificar

### 4. Componentes shadcn instalados

```bash
ls components/ui/
```

Listar. Estos van a heredar automáticamente los nuevos tokens del `@theme` si lo hacemos bien.

### 5. Detectar dark: prefijos en componentes

```bash
grep -rn "dark:" components/ app/ --include="*.tsx" | wc -l
```

Contar. Si aparecen prefijos `dark:` van a quedar sin efecto pero conviene documentarlos.

### 6. Verificar `<html>` de root layout

Confirmar dónde está `className="dark"` — necesita removerse.

### 7. Plan de refactor de colores

Basado en el punto 1, generar tabla:

| Archivo | Ocurrencias | Categorías dominantes | Estrategia |
|---------|-------------|----------------------|-----------|
| movimiento-editor.tsx | 45 | A + D | Refactor A→success/danger, D→escala nueva |
| dashboard-client.tsx | 30 | D + A | Idem |
| ... | ... | ... | ... |

Estimar tiempo de refactor.

### ⚠️ STOP CONDITIONS del PASO 0

PARÁ y reportá si:
- Más de 20 archivos tienen 15+ clases hardcoded (sugiere que el PR se dispara a >20 bloques)
- Hay componentes shadcn custom (no del preset base) que puedan romper
- Aparecen assets externos (imágenes, SVGs) que asumían tema dark
- El `<html className="dark">` está en más de un layout
- `CLAUDE.md` tiene múltiples referencias a dark mode que interconectan

---

## Estructura de commits (autónomo, orden fijo)

### FASE A — Bases (1-4)

**Bloque 1 — docs**
- Commit del spec + diagnóstico
- No toca código

**Bloque 2 — fonts**
- `app/layout.tsx`: reemplazar Inter por Manrope + Poppins + Space Grotesk (todos con next/font)
- Agregar `--font-manrope`, `--font-poppins`, `--font-space-grotesk` como variables
- Wire en globals.css: `--font-sans: var(--font-manrope)`, `--font-display: var(--font-poppins)`, `--font-mono: var(--font-space-grotesk)`
- Build check → commit

**Bloque 3 — flip del @theme + remove dark class**
- `globals.css`: reescribir el `@theme inline` con los tokens light nuevos (todos los colores de la paleta arriba)
- `app/layout.tsx`: remover `className="dark"` del `<html>`
- `CLAUDE.md`: actualizar/remover la regla "no light theme in V1"
- Mantener structural tokens (radius, spacing, animations) intactos
- Build check → commit

**Bloque 4 — logo component**
- Crear `components/ui/mango-logo.tsx` con la estructura sugerida:
  ```tsx
  export function MangoLogo({ size = 32, showWordmark = false, className }: {
    size?: number
    showWordmark?: boolean
    className?: string
  }) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div 
          style={{ width: size, height: size }}
          className="bg-navy rounded-lg flex items-center justify-center"
        >
          <span 
            className="font-display font-extrabold text-cream"
            style={{ fontSize: size * 0.5 }}
          >
            M
          </span>
        </div>
        {showWordmark && (
          <span 
            className="font-display font-extrabold text-navy tracking-tight"
            style={{ fontSize: size * 0.58 }}
          >
            MANGO
          </span>
        )}
      </div>
    )
  }
  ```
- Build check → commit

### FASE B — Aplicar tokens a nav y logo (5-6)

**Bloque 5 — reemplazar placeholder M por MangoLogo**
- Login: `app/(auth)/login/*` — usar `<MangoLogo size={...} showWordmark={...} />`
- Signup: `app/(auth)/signup/*` — idem
- Onboarding: donde use el placeholder — idem
- Sidebar: `components/navigation/desktop-sidebar.tsx` — idem
- Build check → commit

**Bloque 6 — botón MANGO AI y FAB**
- `components/navigation/mango-ai-button.tsx`: aplicar tokens (`bg-navy text-cream`, hover con `--color-navy-hover`)
- `components/navigation/perchita-fab.tsx`: idem
- Cualquier lugar con `#1e3a5f` inline hardcoded → token
- Build check → commit

### FASE C — Refactor grande de colores (7-13)

⚠️ **Estos bloques hacen el flip real de la app**. Uno por archivo grande (o grupos por afinidad).

**Bloque 7 — movimiento-editor.tsx**
- Reemplazar `text-green-*` / `bg-green-*` → `text-success` / `bg-success/10` (ingresos)
- Reemplazar `text-red-*` / `bg-red-*` → `text-danger` / `bg-danger/10` (egresos)
- Reemplazar grays según escala nueva (text-primary, text-secondary, text-muted, bg-primary, bg-subtle, border-default)
- Aplicar Space Grotesk (`font-mono`) a cifras
- Build check → commit

**Bloque 8 — movimientos-client.tsx + movimientos-list.tsx**
- Idem bloque 7 para todo lo relacionado con listado y detalle de movimientos
- Aplicar Space Grotesk a los montos
- Build check → commit

**Bloque 9 — dashboard**
- `dashboard-client.tsx`: aplicar tokens + Space Grotesk a cifras del balance
- Cards del dashboard: usar `bg-subtle` para balance, `bg-primary` para cards secundarias
- Build check → commit

**Bloque 10 — balances + prestamos**
- `balances/*` y `prestamos/*`: refactor de colores según categorías
- Build check → commit

**Bloque 11 — cuentas + tarjetas + personas**
- Idem para `cuentas/*`, `tarjetas/*`, `personas/*`
- Build check → commit

**Bloque 12 — ajustes + captura + categorías**
- Idem para `ajustes/*`, `captura/*`, `categorias/*`
- Build check → commit

**Bloque 13 — restantes**
- Todo lo demás: `movimientos-recurrentes/*`, `login/signup/onboarding` (estilos que quedaron), etc.
- Cualquier `dark:` prefix restante → remover
- Build check → commit

### FASE D — Cleanup y validación (14-15)

**Bloque 14 — links con color gold**
- Grep de `<a>` sin styling → aplicar `text-gold hover:text-gold-hover`
- No forzar en TODOS los links — solo los descriptivos ("Ver todo", "Volver", etc.)
- Build check → commit

**Bloque 15 — cleanup final**
- Ultimo grep de `dark:` que hayan quedado → eliminar
- Verificar consistencia
- Update `CLAUDE.md` si quedó algo pendiente
- Build check → commit

---

## Tests mentales (10 casos)

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Abrir app | Fondo blanco, sin dark |
| 2 | Ver sidebar | Logo navy con "M" crema, botón MANGO AI navy con texto crema |
| 3 | Ver balance en dashboard | Cifra en Space Grotesk grande y bold, navy color |
| 4 | Ver movimientos | Ingresos verde `#10B981`, egresos rojo `#EF4444`, ambos en Space Grotesk |
| 5 | Hover sobre un link "Ver todo" | Cambia a color oro `#C98A2B` |
| 6 | Tocar FAB en mobile | Sheet MANGO AI se abre con estética light |
| 7 | DevTools inspeccionar cualquier elemento | Sin clases `dark:*` residuales |
| 8 | Rendering en mobile | Manrope legible en 375px |
| 9 | Build TypeScript | Verde |
| 10 | Console browser | Sin errores de fonts o CSS |

---

## Validación local (Benja, post Claude Code)

### Test manual por pantalla

Recorré cada ruta principal y validá visualmente:

| # | Ruta | Test |
|---|------|------|
| 1 | `/login` | Logo MangoLogo se ve, fondo blanco, form claro |
| 2 | `/signup` | Idem |
| 3 | `/dashboard` | Sidebar navy con crema, main content blanco, balance en Space Grotesk |
| 4 | `/movimientos` | Lista con ingresos verde / egresos rojo en Space Grotesk |
| 5 | `/balances` | Cifras en Space Grotesk, esquema de colores correcto |
| 6 | `/prestamos` | Idem |
| 7 | `/cash-flow` | Idem |
| 8 | `/cuentas` | Sin dark residual |
| 9 | `/tarjetas` | Sin dark residual |
| 10 | `/personas` | Sin dark residual |
| 11 | `/categorias` | Sin dark residual |
| 12 | `/movimientos-recurrentes` | Sin dark residual |
| 13 | `/ajustes` | Sin dark residual |
| 14 | FAB mobile → sheet | Sheet MANGO AI se ve como el mockup 3 |
| 15 | Botón MANGO AI desktop | Sheet MANGO AI se ve como el mockup 3 |

### Console del browser

Sin errores rojos. Fuentes cargadas correctamente (verificar en tab Network).

### Performance

Lighthouse LCP no degrada más del 10%. Si degrada más, revisar next/font.

---

## Stop conditions para Claude Code

PARÁ y escribí `REPORTE_INTERMEDIO.md` si:

1. Build falla después de 3 intentos de arreglo en un bloque
2. Un bloque toma más de 30 minutos
3. Aparece un archivo/dependencia no anticipado en el diagnóstico complementario
4. Más de 15 errores TypeScript irresolubles después de un cambio
5. Un componente shadcn se ve completamente roto (borders desaparecen, texto ilegible)
6. `CLAUDE.md` tiene lógica interconectada con dark mode que requiere refactor mayor
7. Alguna dependencia externa (paquete) asume dark mode

Si se activa una stop condition:
- Commit del último estado bueno
- REPORTE_INTERMEDIO.md con qué falta
- Terminá la sesión

---

## Reglas para Claude Code (no negociables)

| Regla | Detalle |
|-------|---------|
| ❌ NO push automático | Solo commits en `feat/pr2-visual` |
| ❌ NO tocar `.env.local` | Fuera de scope |
| ❌ NO crear componentes nuevos | Solo `<MangoLogo />` está permitido |
| ❌ NO cambiar layout/estructura | Solo colores, fuentes, tokens |
| ❌ NO tocar la lógica de negocio | Solo estilos |
| ❌ NO agregar animaciones nuevas | Solo hovers básicos |
| ❌ NO cargar DM Serif Display | Fuente no usada |
| ❌ NO usar prefijos `dark:` | Removerlos si existen |
| ❌ NO invertir contrastes salvo tokens definidos | Respetar la paleta |
| ✅ Build debe pasar antes de cada commit | `npm run build` verde |
| ✅ Reportar antes/después con tabla | Al final |
| ✅ Un commit por bloque | Atómicos |
| ✅ Seguir mockups como fuente de verdad visual | Sección "GUÍA VISUAL" |
| ✅ Si dudás | Documentar en REPORTE_INTERMEDIO.md y parar |

---

## Reporte final esperado

Al terminar los 15 bloques, escribí `REPORTE_FINAL_PR2_VISUAL.md` en raíz con:

- Tabla de los 15 bloques (todos ✅ / algunos ⚠️ / algunos ❌)
- Hashes de todos los commits
- `git log --oneline -20`
- `npm run build` output completo (última corrida)
- Deviations del plan (si hubo)
- Archivos totales creados/modificados/eliminados
- Cantidad final de clases de color hardcoded restantes
- Test manual sugerido para Benja (checklist de 15 rutas)
- Screenshot conceptual: "así se ve el dashboard después del PR"

---

## Commit final (mensaje del PR)

```
feat: PR2 Visual — identidad MANGO aplicada (flip completo a light)

Aplica la paleta oficial de MANGO y sistema tipográfico. Este PR hace el 
flip completo de dark a light y sienta las bases visuales del producto.

Cambios core:
- Flip @theme inline en globals.css: de oklch dark a hex light
- Remove className="dark" del <html>
- Actualiza CLAUDE.md: quita regla "no light theme in V1"

Fuentes (next/font):
- Inter → Manrope (UI)
- + Poppins (wordmark MANGO)
- + Space Grotesk (números/saldos)

Paleta MANGO:
- Navy #1E3A5F (primario)
- Crema #E8D9B4 (wordmark)
- Oro #C98A2B (links, hover)
- Semánticos: success/danger/warning/info

Refactor:
- 240 clases de color reemplazadas por tokens
- Ingresos → text-success, egresos → text-danger
- Cifras en Space Grotesk
- Componente <MangoLogo /> reusable

Fuera de scope (backlog):
- Dark mode toggle (no se implementa)
- Ajustes finos de accesibilidad
- Reemplazo del logo del brand guide (SVG) — usa placeholder M por ahora

Referencias:
- brand/mango-branding.html — brand guide oficial (referencia visual)
- SPEC_PR2_VISUAL_V2.md — este spec ampliado
- DIAGNOSTICO_PR2_VISUAL.md — diagnóstico principal
- REPORTE_FINAL_PR2_VISUAL.md — reporte de ejecución
```

---

## Riesgos ⚠️

| Riesgo | Mitigación |
|--------|-----------|
| Alguna pantalla queda ilegible (contraste bajo) | Test mental #7 + validación por ruta |
| Fonts pesan demasiado en LCP | next/font con subset + display swap |
| Colores hardcoded no anticipados por diagnóstico | Stop condition #3 |
| shadcn base-nova requiere ajuste extra al pasar a light | Bloque 3 lo detecta |
| Componentes custom (no shadcn base) rompen | Stop condition #5 |
| CLAUDE.md tiene reglas interconectadas | Diagnóstico paso 3 lo revisa |
| `dark:` prefijos residuales quedan sin efecto | Bloque 15 los limpia |
| Assets externos asumen dark | Stop condition #4 |
| Cambio de fuente causa CLS | next/font previene con display swap |

---

## Próximos pasos post-merge

- Sprint A de bugs chicos (tarjeta débito, monto inicial, gasto compartido, sidebar mobile)
- Reemplazar logo placeholder por el SVG real del brand guide (PR chico)
- Fase 2 del pivot: mejoras de MANGO AI (intérprete v2)
- Fase 3: WhatsApp bot con n8n
- Rediseño profundo de pantallas específicas (dashboard estilo custom, cash flow visualización, etc.)
