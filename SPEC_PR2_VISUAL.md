# SPEC_PR2_VISUAL.md

## Objetivo

Aplicar la identidad visual de MANGO a la app: paleta de marca, tipografía, tokens CSS globales. **Solo modo light, sin toggle, sin dark mode**. Este PR sienta las bases visuales; el restyling profundo de páginas específicas viene después (PRs sucesivos).

**Rama**: `feat/pr2-visual` (ya creada desde main actualizado)

**Referencia visual**: `brand/mango-branding.html` — brand guide importado en la sesión previa. Contiene los tokens oficiales.

---

## Decisiones cerradas (NO cuestionar)

| Decisión | Resolución |
|----------|-----------|
| Alcance | Solo tokens + fuentes + logo. No restyling de páginas |
| Modo | Solo light. Sin toggle. Sin dark mode |
| Fuentes | Manrope (UI) + Poppins (wordmark) + Space Grotesk (números) |
| Navy primario | `#1E3A5F` |
| Crema | `#E8D9B4` — solo para wordmark MANGO sobre navy |
| Oro acento | `#C98A2B` — solo para links y hover, sutil |
| Fondo app | `#FFFFFF` blanco puro |
| Colores semánticos | Verde `#10B981`, Rojo `#EF4444`, Ámbar `#F59E0B`, Azul `#3B82F6` |
| DM Serif Display | NO cargar (no se usa) |
| Verde hoja | NO usar (decorativo del brand, no aplica a la app) |

---

## Paleta completa (tokens)

### Colores de marca
```
--color-navy:  #1E3A5F  // primario, texto, botón MANGO AI bg
--color-cream: #E8D9B4  // wordmark sobre navy, decorativo
--color-gold:  #C98A2B  // links, hover, acentos sutiles
```

### Colores semánticos (rol de estado)
```
--color-success: #10B981  // ingresos, positive
--color-danger:  #EF4444  // egresos, negative
--color-warning: #F59E0B  // alertas, atención
--color-info:    #3B82F6  // neutral info
```

### Escala de grises (fondo/text/border)
```
--color-bg:              #FFFFFF   // fondo general app
--color-bg-subtle:       #F9FAFB   // cards, secciones sutiles
--color-border:          #E5E7EB   // bordes hairline
--color-text-muted:      #9CA3AF   // placeholder, captions
--color-text-secondary:  #6B7280   // descripciones, subtítulos
--color-text-primary:    #111827   // body principal
```

### Colores derivados (con transparencia, para efectos)
```
--color-navy-hover:  rgba(30, 58, 95, 0.9)   // hover del botón navy
--color-gold-hover:  rgba(201, 138, 43, 0.85) // hover del oro
--card-shadow:       rgba(30, 58, 95, 0.06)  // sombra estándar de card
```

---

## Fuentes

### Carga (Google Fonts, en el `<head>` o CSS global)

Un solo link con las 3 familias:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Poppins:wght@700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
```

**Pesos cargados** (minimo lo necesario, no todos):
- Manrope: 400 (body), 500 (medium), 600 (semibold), 700 (bold), 800 (heavy)
- Poppins: 700, 800 (solo bold para el wordmark)
- Space Grotesk: 500, 600, 700 (números/saldos)

### Tokens tipográficos

```
--font-sans:    'Manrope', system-ui, -apple-system, sans-serif
--font-display: 'Poppins', 'Manrope', sans-serif
--font-mono:    'Space Grotesk', 'Manrope', sans-serif  // para números
```

**Uso semántico**:

| Elemento | Fuente |
|----------|--------|
| Body / UI general | Manrope |
| Wordmark "MANGO" (logo, header, splash) | Poppins 800 |
| Números / saldos / cifras financieras | Space Grotesk 600-700 |
| Todo lo demás | Manrope |

---

## PASO 0 obligatorio — Diagnóstico

Antes de tocar código, generar `DIAGNOSTICO_PR2_VISUAL.md` en la raíz con:

### 1. Inventario de archivos CSS/globales existentes

- Ubicación de `globals.css` / `styles.css`
- Contenido actual: variables CSS existentes, resets, etc.
- ¿Hay tema oscuro heredado que hay que remover?

### 2. Estado de Tailwind config

- `tailwind.config.ts` actual: extensiones de colores, fuentes, spacing
- ¿Usa preset de shadcn?
- ¿Qué paleta hay hoy? Documentar

### 3. Inventario de fuentes actuales

- `layout.tsx` o donde se cargue Inter/otras fuentes
- Cómo está integrado con `next/font` (si aplica)

### 4. Componentes shadcn/ui existentes

Listar los que están en `components/ui/`. Estos van a heredar la nueva paleta automáticamente si tocamos bien Tailwind + globals.css.

### 5. Colores hardcoded en componentes

Grep de colores hex hardcodeados en componentes:
```
grep -rn "#[0-9a-fA-F]\{3,8\}" components/ app/ --include="*.tsx" | head -30
grep -rn "text-\(green\|red\|blue\|amber\|yellow\)-[0-9]" components/ app/ --include="*.tsx" | head -30
grep -rn "bg-\(green\|red\|blue\|amber\|yellow\)-[0-9]" components/ app/ --include="*.tsx" | head -30
```

Listar los que sean **candidatos a reemplazar** por variables semánticas (success/danger/warning/info).

⚠️ NO cambiarlos todos en este PR — solo los más obvios (los del branding: ingresos verde, egresos rojo). El resto queda al backlog.

### 6. Logo actual

- ¿Dónde está el placeholder "M" navy hoy? Grep de `M MANGO`, `MANGO AI`, etc.
- Componentes: `mango-ai-button.tsx`, `desktop-sidebar.tsx`, `perchita-fab.tsx`, etc.

⚠️ **STOP CONDITION**: si el logo está usado en más de 6 lugares, pararnos y decidir si crear componente `<MangoLogo />` compartido antes de reemplazar.

### 7. Análisis de conflictos con brand guide

- `brand/mango-branding.html` es solo referencia. NO se aplica.
- ¿Necesitamos extraer el SVG del logo del brand para usarlo? Si sí, extraerlo a `public/logo/mango-logo.svg`.

### ⚠️ STOP CONDITIONS del PASO 0

PARÁ y reportá si:
- Hay más de 30 colores hardcoded en componentes (indica que el PR se agranda mucho)
- Existe un tema oscuro previo con lógica compleja que remover
- La config actual de Tailwind tiene extensiones raras que puedan romperse
- Cargar Google Fonts requiere cambios en middleware o CSP

---

## Estructura de cambios objetivo

### 1. Instalar/cargar fuentes

`app/layout.tsx` (o donde esté el layout raíz):

```tsx
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
<body className={`${manrope.variable} ${poppins.variable} ${spaceGrotesk.variable} font-sans`}>
```

⚠️ **Preferir `next/font` sobre `<link>` de Google Fonts**: performance mejor, sin FOUT, cero CLS.

### 2. Actualizar `globals.css`

```css
:root {
  /* Marca */
  --color-navy: #1E3A5F;
  --color-cream: #E8D9B4;
  --color-gold: #C98A2B;
  
  /* Semánticos */
  --color-success: #10B981;
  --color-danger: #EF4444;
  --color-warning: #F59E0B;
  --color-info: #3B82F6;
  
  /* Escala */
  --color-bg: #FFFFFF;
  --color-bg-subtle: #F9FAFB;
  --color-border: #E5E7EB;
  --color-text-muted: #9CA3AF;
  --color-text-secondary: #6B7280;
  --color-text-primary: #111827;
  
  /* Derivados */
  --color-navy-hover: rgba(30, 58, 95, 0.9);
  --color-gold-hover: rgba(201, 138, 43, 0.85);
  --card-shadow: rgba(30, 58, 95, 0.06);
  
  /* Fuentes */
  --font-sans: var(--font-manrope), system-ui, sans-serif;
  --font-display: var(--font-poppins), sans-serif;
  --font-mono: var(--font-space-grotesk), sans-serif;
}

/* Reset base */
html, body {
  font-family: var(--font-sans);
  color: var(--color-text-primary);
  background: var(--color-bg);
}
```

⚠️ **NO borrar** el CSS existente sin diagnóstico. Si hay dark mode ya seteado con `@media (prefers-color-scheme: dark)`, evaluá si eliminar o dejar.

### 3. Actualizar `tailwind.config.ts`

Extender la paleta de shadcn/Tailwind con los tokens semánticos:

```ts
export default {
  theme: {
    extend: {
      colors: {
        navy: 'var(--color-navy)',
        cream: 'var(--color-cream)',
        gold: 'var(--color-gold)',
        
        // Semánticos (reemplazan los genéricos)
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        info: 'var(--color-info)',
        
        // Text/bg semánticos
        muted: 'var(--color-text-muted)',
        subtle: 'var(--color-bg-subtle)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
    }
  }
}
```

### 4. Reemplazar placeholder "M" por logo real

Identificar en el diagnóstico los lugares donde vive el logo placeholder.

Opciones:
- **A** — Crear componente `<MangoLogo />` en `components/ui/mango-logo.tsx` y usarlo en todos lados
- **B** — Extraer SVG puro y meterlo inline en los components que lo usen

⚠️ **Mi voto: A** — más mantenible.

Estructura sugerida del componente:

```tsx
// components/ui/mango-logo.tsx
export function MangoLogo({ 
  size = 32,
  showWordmark = false 
}: { 
  size?: number
  showWordmark?: boolean 
}) {
  return (
    <div className="flex items-center gap-2">
      {/* Cuadrado navy con "M" en Poppins crema */}
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
        <span className="font-display font-extrabold text-navy tracking-tight">
          MANGO
        </span>
      )}
    </div>
  )
}
```

Reemplazar el placeholder actual en:
- `components/navigation/desktop-sidebar.tsx` (branding "M MANGO" arriba)
- Cualquier otro lugar detectado en el diagnóstico

### 5. Actualizar botón "MANGO AI" con nuevos tokens

`components/navigation/mango-ai-button.tsx` (u equivalente):

- Background: `bg-navy`
- Texto: `text-cream`
- Hover: `hover:bg-[var(--color-navy-hover)]`
- Font: `font-sans font-semibold`

### 6. Aplicar Space Grotesk a saldos/números en componentes clave

⚠️ **Solo lugares obvios** en este PR:
- Balance total del dashboard
- Montos de movimientos (ingresos/egresos)
- Cifras en cards del dashboard

Uso: `className="font-mono"` en los `<span>` de números.

Para el resto de números en la app, backlog.

### 7. Aplicar colores semánticos a ingresos/egresos

En componentes de movimientos, reemplazar hardcoded verdes/rojos por semánticos:

Antes:
```tsx
<span className="text-green-500">+$350.000</span>
```

Después:
```tsx
<span className="text-success font-mono font-bold">+$350.000</span>
```

Ídem con `text-danger` para egresos.

---

## Tests mentales

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Abrir dashboard | Fondo blanco, logo navy con "M" crema en Poppins, texto Manrope |
| 2 | Ver balance total | Cifra en Space Grotesk grande y bold |
| 3 | Botón MANGO AI en sidebar | Fondo navy, texto crema, con hover más oscuro |
| 4 | Ver movimientos: ingreso | Verde `#10B981` en Space Grotesk |
| 5 | Ver movimientos: egreso | Rojo `#EF4444` en Space Grotesk |
| 6 | Hover sobre un link | Cambio de color a oro `#C98A2B` (sutil) |
| 7 | Rendering en mobile | Manrope se ve legible en 375px |
| 8 | DevTools Console | Sin errores de fonts no cargadas |
| 9 | Performance | LCP no degrada más del 10% |
| 10 | Build TypeScript | Verde, sin errores |

---

## Validación local (Benja, post Claude Code)

| # | Test | Esperado |
|---|------|----------|
| 1 | `npm run build` | OK, sin errores |
| 2 | Levantar dev server | Fonts cargadas visualmente |
| 3 | `/dashboard` | Nueva paleta aplicada globalmente |
| 4 | `/movimientos` | Ingresos verdes, egresos rojos, cifras en Space Grotesk |
| 5 | Ver botón MANGO AI en sidebar | Navy con "MANGO AI" en crema |
| 6 | Hover sobre link cualquiera | Cambio sutil a oro |
| 7 | Mobile DevTools | Se ve bien en 375px |
| 8 | Console browser | Sin errores de fonts o CSS |
| 9 | Test performance con Lighthouse | LCP no rompe |

---

## Stop conditions para Claude Code

PARÁ y reportá si:
1. Encontrás dark mode ya seteado con muchos overrides (podría romperse)
2. `tailwind.config.ts` tiene extensiones raras que hay que preservar
3. Hay más de 30 lugares con colores hardcoded (necesitamos otro PR para eso)
4. El logo placeholder "M" está en más de 6 componentes (crear MangoLogo primero)
5. Fonts no cargan por CSP en el middleware (proxy.ts)
6. Build rompe y no se puede arreglar en < 30 min
7. Cualquier test mental falla

---

## Reglas para Claude Code (no negociables)

| Regla | Detalle |
|-------|---------|
| ❌ NO push automático | Solo commits en `feat/pr2-visual` |
| ❌ NO tocar `.env.local` | Fuera de scope |
| ❌ NO restilar páginas específicas | Solo tokens globales |
| ❌ NO reemplazar TODOS los colores hardcoded | Solo los obvios (ingresos/egresos) |
| ❌ NO agregar animaciones o transiciones complejas | Solo hovers básicos |
| ❌ NO cargar DM Serif Display | Fuente no usada |
| ✅ Usar `next/font` para las 3 fuentes | Performance |
| ✅ Build debe pasar antes de cada commit | `npm run build` verde |
| ✅ Reportar antes/después con tabla | Mismo formato que PRs anteriores |
| ✅ Generar diagnóstico primero | Antes de tocar código |
| ✅ Un commit por bloque | Atómicos |

---

## Estructura sugerida de commits

| # | Commit | Descripción |
|---|--------|-------------|
| 1 | `docs: spec y diagnóstico PR2 Visual` | Agregar SPEC + DIAGNOSTICO |
| 2 | `chore(fonts): cargar Manrope + Poppins + Space Grotesk con next/font` | Fuentes cargadas globalmente |
| 3 | `feat(tokens): agregar CSS variables de marca (navy, crema, oro) y semánticas` | globals.css |
| 4 | `feat(tokens): extender tailwind.config con paleta MANGO` | tailwind.config.ts |
| 5 | `feat(logo): crear componente MangoLogo reusable` | components/ui/mango-logo.tsx |
| 6 | `refactor(nav): usar MangoLogo en sidebar y aplicar tokens` | desktop-sidebar.tsx y afines |
| 7 | `refactor(mango-ai-button): aplicar tokens navy/cream` | mango-ai-button.tsx |
| 8 | `refactor(movimientos): aplicar text-success/danger + Space Grotesk en números` | Componentes de movimientos |
| 9 | `refactor(dashboard): aplicar Space Grotesk en balance total` | dashboard-client.tsx |

---

## Commit final (mensaje del PR)

```
feat: PR2 Visual — identidad de marca MANGO aplicada

Aplica la paleta oficial de MANGO y sistema tipográfico. Sienta las 
bases visuales del producto sin restylear páginas específicas 
(eso viene en PRs sucesivos).

Cambios:
- Tokens CSS globales: navy, cream, gold, semánticos, escala grises
- Tailwind config extendido con la paleta MANGO
- Fuentes con next/font: Manrope (UI), Poppins (wordmark), 
  Space Grotesk (números)
- Componente MangoLogo reusable
- Botón MANGO AI con nueva identidad
- Ingresos/egresos con text-success/danger + Space Grotesk

Fuera de scope (backlog):
- Restyling profundo de páginas específicas (dashboard, movimientos)
- Dark mode (no se implementa en esta iteración)
- Reemplazo total de colores hardcoded en toda la app
- Uso del logo del brand guide (brand/mango-branding.html es solo 
  referencia)

Referencias:
- brand/mango-branding.html — brand guide oficial (referencia visual)
- SPEC_PR2_VISUAL.md — este spec
- DIAGNOSTICO_PR2_VISUAL.md — diagnóstico previo
```

---

## Riesgos ⚠️

| Riesgo | Mitigación |
|--------|-----------|
| Fonts pesan demasiado en LCP | Usar next/font (subset latin, display swap) |
| Colores hardcoded en muchos lugares crean inconsistencia | Solo tocar obvios; resto al backlog |
| Dark mode oculto rompe | Diagnóstico paso 1 lo detecta |
| Logo placeholder en muchos lados | Crear MangoLogo primero, después reemplazar |
| Tailwind extend rompe estilos existentes | Extender, no override; testear componentes shadcn |
| Cambio de fuente crea CLS | next/font previene con display: swap |

---

## Próximos pasos post-merge

- Sprint A de bugs chicos (tarjeta débito, monto inicial, gasto compartido, sidebar mobile)
- Restyling profundo del dashboard (nuevo PR)
- Restyling profundo de /movimientos (nuevo PR)
- Reemplazar colores hardcoded restantes (nuevo PR o backlog)
- Fase 2 del pivot: mejoras de MANGO AI (intérprete v2)
