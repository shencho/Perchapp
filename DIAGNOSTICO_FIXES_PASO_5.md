# DIAGNOSTICO_FIXES_PASO_5.md

> Estado: SOLO DIAGNÓSTICO — ningún fix aplicado. Esperando luz verde.

---

## ISSUE #1 — Sheet mal posicionado en mobile

### 1. Primeras 100 líneas de `components/ui/sheet.tsx` — variantes relevantes

`SheetContent` (líneas 39–81) acepta `side?: "top" | "right" | "bottom" | "left"` (default `"right"`).
El posicionamiento se aplica vía Tailwind data-attribute selectors sobre `SheetPrimitive.Popup`
(que es `@base-ui/react/dialog` → `Dialog.Popup`).

Clases de posicionamiento por side extraídas de la línea 56:

```
side=bottom : data-[side=bottom]:inset-x-0  data-[side=bottom]:bottom-0
              data-[side=bottom]:h-auto      data-[side=bottom]:border-t
              (sin w-* explícita para bottom)

side=left   : data-[side=left]:inset-y-0    data-[side=left]:left-0
              data-[side=left]:h-full        data-[side=left]:w-3/4
              data-[side=left]:sm:max-w-sm   ← limita ancho en ≥ sm

side=right  : data-[side=right]:inset-y-0   data-[side=right]:right-0
              data-[side=right]:h-full       data-[side=right]:w-3/4
              data-[side=right]:sm:max-w-sm  ← limita ancho en ≥ sm

side=top    : data-[side=top]:inset-x-0     data-[side=top]:top-0
              data-[side=top]:h-auto         data-[side=top]:border-b
```

**Clases base (siempre presentes):** `fixed z-50 flex flex-col gap-4 bg-popover ...`

### 2. JSX del `<Sheet>` en `perchita-fab.tsx`

```tsx
// components/navigation/perchita-fab.tsx — líneas 22–38
<Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger
    className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 ..."
    ...
  >
    🥭
  </SheetTrigger>
  <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
    <CapturaSheetContent ... />
  </SheetContent>
</Sheet>
```

### 3. JSX del `<Sheet>` en `mango-ai-button.tsx`

```tsx
// components/navigation/mango-ai-button.tsx — líneas 22–39
<Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger className="w-full flex items-center gap-2 ..." ...>
    <span>🥭</span>
    <span>{asistenteNombre}</span>
  </SheetTrigger>
  <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
    <CapturaSheetContent ... />
  </SheetContent>
</Sheet>
```

### 4. Wrapper exterior de `captura-sheet-content.tsx`

```tsx
// línea 138 — retorno feliz
return (
  <div className="p-4">
    <CapturaForm variant="sheet" ... />
  </div>
);
```
No hay wrapper de ancho ni clases restrictivas en este nivel.

### 5. ¿El SheetContent tiene clases que limitan ancho?

**Desde los call sites** (`perchita-fab.tsx` y `mango-ai-button.tsx`):
- Solo `max-h-[90vh] overflow-y-auto` → NO limitan ancho.

**Desde `sheet.tsx` para `side="bottom"`:**
- `inset-x-0` (= `left:0; right:0`) debería dar ancho completo.
- `data-[side=left]:sm:max-w-sm` y `data-[side=right]:sm:max-w-sm` son exclusivos de left/right.
- **No hay `w-*` explícita para `bottom`.**

### 6. Causa raíz diagnosticada

`sheet.tsx` usa `@base-ui/react/dialog` en lugar de Radix UI.
`Dialog.Popup` de base-ui **no es un elemento posicionado con `position: fixed` por defecto**;
se renderiza dentro de un contenedor del portal que puede aplicar su propio layout
(ej. `display: flex; align-items: flex-end; justify-content: center`).

En ese esquema, la clase Tailwind `fixed` que lleva el `SheetPrimitive.Popup` **puede ser
sobrescrita por los estilos internos de base-ui**, y la clase `data-[side=bottom]:inset-x-0`
pierde efecto porque el elemento no tiene `position: fixed` real (o lo tiene pero sin
`width` explícito en la dimensión horizontal).

El resultado visible: el popup se centra horizontalmente (ancho = contenido o viewport/2)
y aparece "corrido a la izquierda" respecto del layout de mobile.

### Fix propuesto (sin aplicar — 1 línea)

En `sheet.tsx` línea 56, dentro del `cn(...)`, agregar al bloque bottom:

```diff
- data-[side=bottom]:inset-x-0
+ data-[side=bottom]:inset-x-0 data-[side=bottom]:w-full
```

Esto asegura `width: 100%` independientemente de cómo base-ui posicione el popup,
sobreescribiendo cualquier `width: auto` o `width: fit-content` del contenedor del portal.

---

## ISSUE #3 — manifest.json syntax error

### 1. Contenido literal de `public/manifest.json`

```json
{
  "name": "MANGO",
  "short_name": "MANGO",
  "description": "Tu app de gestión financiera personal y profesional",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/favicon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

### 2. Diagnóstico

El contenido es **JSON estructuralmente válido** — no hay coma faltante, llaves mal cerradas,
ni caracteres obvios de sintaxis errónea.

La combinación de síntomas —error en **Line 1, Column 1** y repetido **17 veces**— apunta
a una de dos causas distintas:

**Causa A — BOM (Byte Order Mark):**
El archivo podría tener un byte sequence `EF BB BF` (UTF-8 BOM) al inicio, invisible
para el Read tool pero que hace que el parser JSON del browser falle en col 1 porque
el primer carácter no es `{`. Muy probable si el archivo fue editado con VS Code en
Windows con encoding "UTF-8 with BOM".

**Causa B — Next.js 16 intercepta `/manifest.json` en dev:**
El proxy/middleware de Next.js aplica a todas las rutas excepto `.*\\.(?:svg|png|...)`.
`.json` no está excluido en el matcher de `proxy.ts` (línea 63). En dev mode,
Next.js podría interceptar el request a `/manifest.json` antes de servir el archivo
estático, devolviendo una respuesta vacía o con el HTML del error handler de Next.js
en lugar del JSON, lo que rompe el parsing del browser en line 1, col 1.

**El "17 veces"** sugiere el número de navegaciones/hot-reloads acumulados en la sesión
de DevTools, no 17 instancias simultáneas del problema.

### 3. Fix propuesto (sin aplicar)

Dos pasos:
1. **Verificar encoding real:** abrir `public/manifest.json` con un editor hex o
   `file public/manifest.json` para confirmar si hay BOM. Si hay BOM → re-guardar
   como UTF-8 sin BOM.
2. **Excluir `.json` del matcher del proxy** para que los archivos estáticos
   JSON sean servidos directamente por Next.js sin pasar por `proxy.ts`:
   ```diff
   - "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
   + "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)",
   ```

---

## ISSUES #5 + #7 — Form fields sin id/name + Labels sin asociar

### Conteo base

- Archivos con `<input` (nativo): 5 archivos, 10 ocurrencias en total
- Archivos con `<label`: 9 archivos, muchas ocurrencias

### Inputs identificados y estado

| Archivo | Línea | Tipo | id | name | Asociación |
|---|---|---|---|---|---|
| `categorias/importar-template-modal.tsx` | 230 | checkbox | ✗ | ✗ | implícita (dentro de `<label>`) |
| `categorias/importar-template-modal.tsx` | 244 | checkbox | ✓ `sk(idx,si)` | ✗ | explícita vía `id` |
| `movimientos/generar-pendientes-modal.tsx` | 113 | checkbox | ✗ | ✗ | ninguna — standalone |
| `cash-flow/cash-flow-client.tsx` | 117 | checkbox | ✗ | ✗ | implícita (dentro de `<label>`) |
| `movimientos/movimiento-editor.tsx` | 1113 | checkbox | ✓ `"es-compartido"` | ✗ | explícita |
| `movimientos/movimiento-editor.tsx` | 1196 | text | ✗ | ✗ | ninguna — standalone |
| `movimientos/movimiento-editor.tsx` | 1441 | text | ✗ | ✗ | ninguna — standalone |
| `movimientos/movimiento-editor.tsx` | 1479 | checkbox | ✓ `"guardar-agenda"` | ✗ | explícita |
| `movimientos/movimiento-editor.tsx` | 1528 | checkbox | ✓ `"crear-recurrente"` | ✗ | explícita + `register` |
| `clientes/[id]/registros-tab.tsx` | 512 | checkbox | ✓ `"reg-override"` | ✗ | explícita |

**Los 4 campos sin id/name que DevTools flag más probablemente:**
1. `generar-pendientes-modal.tsx:113` — checkbox completamente desasociado
2. `movimiento-editor.tsx:1196` — text input sin id ni name (pagador)
3. `movimiento-editor.tsx:1441` — text input sin id ni name (participante)
4. `importar-template-modal.tsx:230` o `cash-flow-client.tsx:117` — checkbox con
   label wrapper implícito (DevTools los puede flaggear igualmente en algunas versiones)

### Labels sin `htmlFor` identificados

Los archivos con `<label>` sin `htmlFor` (distintos de label wrapping):

| Archivo | Cantidad de labels sin htmlFor |
|---|---|
| `prestamos/_components/prestamo-editor.tsx` | ~10 (líneas 143, 169, 183, 195, 206, 218, 229, 244, 255, 268, 293, 309) |
| `prestamos/[id]/editar-pago-prestamo-modal.tsx` | 4 (líneas 74, 82, 94, 107) |
| `prestamos/[id]/registrar-pago-prestamo-modal.tsx` | 5 (líneas 118, 126, 150, 166, 180) |
| `movimientos/_components/movimientos-client.tsx` | 3 (líneas 273, 282, 293) |

Los 5 labels que DevTools reporta provienen probablemente de la página visible en el momento
de la captura. Si estaba en `/movimientos` → los 3 de `movimientos-client.tsx` + 2 de
`movimiento-editor.tsx` (ej. el `<Label className="text-xs">` sin htmlFor en línea 1439).

### Clasificación PRE-PASO 5 / NUEVO PASO 5

**PRE-PASO 5 (archivos que ya existían, no tocados en PASO 5):**
- `components/categorias/importar-template-modal.tsx`
- `app/(app)/movimientos/_components/generar-pendientes-modal.tsx`
- `app/(app)/movimientos/_components/movimiento-editor.tsx`
- `app/(app)/cash-flow/_components/cash-flow-client.tsx`
- `app/(app)/clientes/[id]/_components/registros-tab.tsx`
- `app/(app)/prestamos/_components/prestamo-editor.tsx`
- `app/(app)/prestamos/[id]/_components/editar-pago-prestamo-modal.tsx`
- `app/(app)/prestamos/[id]/_components/registrar-pago-prestamo-modal.tsx`
- `app/(app)/movimientos/_components/movimientos-client.tsx`

**NUEVO PASO 5 (components/navigation/, captura-form.tsx):** NINGUNO de estos archivos
aparece en los greps de `<input>` o labels sin asociar. Las issues #5 y #7 son
**100% deuda pre-existente**, no regresiones del PASO 5.

### Fix propuesto por archivo (sin aplicar)

| Archivo | Problema | Fix |
|---|---|---|
| `generar-pendientes-modal.tsx:113` | checkbox sin id | Agregar `id="gen-pend-{p.id}"` y `<label htmlFor>` o envolver en `<label>` |
| `movimiento-editor.tsx:1196` | text sin id | Agregar `id="nuevo-pagador-nombre"` |
| `movimiento-editor.tsx:1441` | text sin id | Agregar `id="nueva-participante-nombre"` |
| `importar-template-modal.tsx:230` | checkbox en label wrapper | Agregar `id={pk(idx)}` y `htmlFor` al `<label>` |
| `cash-flow-client.tsx:117` | checkbox en label wrapper | Agregar `id="cf-no-corrientes"` y `htmlFor` al `<label>` |
| `prestamo-editor.tsx` (bulk) | labels sin htmlFor | Agregar `id` a cada control asociado y `htmlFor` a cada `<label>` |
| `editar-pago-prestamo-modal.tsx` | labels sin htmlFor | Ídem |
| `registrar-pago-prestamo-modal.tsx` | labels sin htmlFor | Ídem |
| `movimientos-client.tsx:273,282,293` | labels sin htmlFor | Ídem |

---

## ISSUE #6 — CSP blocks eval (script-src)

### 1. CSP en next.config.ts

```typescript
// next.config.ts — sin headers() configurado
const nextConfig: NextConfig = {
  async redirects() { ... },
};
```

**No hay `headers()` con Content-Security-Policy.**

### 2. CSP en proxy.ts

`proxy.ts` solo maneja autenticación/redirección de Supabase. **No agrega headers CSP.**

### 3. vercel.json

**El archivo no existe** en la raíz del proyecto.

### 4. Origen del CSP y libs nuevas con potencial uso de eval

No hay CSP configurado explícitamente en ningún lado del proyecto. Sin embargo, el browser
reporta la violación. Las explicaciones ordenadas por probabilidad:

**Causa A (más probable) — Next.js webpack en modo desarrollo:**
Next.js 16 usa webpack con `devtool: 'eval-source-map'` por defecto en dev. Esto
genera bundles que contienen `eval(...)` inline para habilitar source maps rápidos.
Si el browser o una extensión tiene algún CSP activo (incluso Report-Only), el devtools
loguea la violación. El mensaje "of your site blocks" puede aparecer aunque el CSP
no venga del propio sitio.

**Causa B — Next.js 16 puede inyectar un CSP header automático en dev:**
Next.js 16 (bleeding-edge) podría incluir un CSP experimental por defecto en modo
desarrollo que restringe `eval`. Verificable revisando los response headers en
Network tab para cualquier ruta.

**Causa C — Supabase SSR inicialización:**
`@supabase/ssr` o `@supabase/js` pueden usar `new Function()` internamente para
parsing de JWT u otras operaciones crypto. Esto es funcionalmente equivalente a `eval`.

**Libs nuevas instaladas en PASO 5:**
- `sonner` — librería de toasts. **No usa eval**, código puramente funcional.
- `lucide-react` — iconos como componentes React. **No usa eval**.
- `@base-ui/react` — componentes headless de MUI. En **dev mode puede usar eval**
  para generar estilos dinámicos con CSS-in-JS. Base-UI migró a CSS variables
  pero versiones antiguas usaban `@emotion` o `stylis` que sí usan `new Function`.

**Próximo paso para confirmar:** abrir DevTools → Network → clic en cualquier request
HTML → Response Headers → buscar `content-security-policy`. Si aparece, el header
viene del servidor. Si no aparece, la restricción es del browser/extensión.

---

*Archivo generado como diagnóstico puro. Ningun código fue modificado.*
