# SPEC_PASO_3.md — Extraer `<CapturaForm />` reusable

## Objetivo

Extraer el form de captura desde `app/(app)/captura/_components/captura-client.tsx` a un componente reusable `components/captura/captura-form.tsx`, para usarlo en dos contextos:

1. La página `/captura` (uso actual)
2. El bottom sheet del PerchitaFAB (uso futuro — PASO 5)

**Sin cambios funcionales en `/captura`**. La UX debe ser idéntica antes y después.

## Decisiones arquitectónicas (ya tomadas, NO cuestionar)

| Decisión | Resolución |
|----------|-----------|
| Hero (h1 + subtítulo) | **AFUERA** del form. Cada contenedor arma su propio encabezado. |
| Frases sugeridas | **ADENTRO** del form. Son parte intrínseca de la UX del input. |
| Comportamiento post-success en `/captura` | Redirige a `/movimientos` (igual que hoy). |
| Cómo se controla el post-success | Callback `onSuccess?: () => void` opcional. El caller decide. |
| Manejo de estado | Local al componente. Sin Context. |
| Tipo de componente | Client Component (`'use client'`). |

## API objetivo del componente

```ts
// components/captura/captura-form.tsx

type CapturaFormProps = {
  /**
   * Callback opcional al crear un movimiento exitosamente.
   * Si no se pasa, el form NO hace nada después del create (queda
   * en pantalla con el preview limpio). El caller decide qué hacer.
   */
  onSuccess?: (movimientoCreado: { id: string; tipo: 'egreso' | 'ingreso' }) => void;

  /**
   * Variante visual.
   * - "page": padding/espaciado de página (default)
   * - "sheet": padding/espaciado más compacto para bottom sheet
   * Por ahora solo "page" se valida funcionalmente. "sheet" se prueba en PASO 5.
   */
  variant?: 'page' | 'sheet';

  /**
   * Texto inicial para prerellenar el textarea (opcional, útil para tests
   * y futuros quick-actions tipo "cargar otro como el anterior").
   */
  initialText?: string;
};
```

### Uso en `/captura/page.tsx` (este PASO)

```tsx
<CapturaForm 
  onSuccess={() => router.push('/movimientos')}
  variant="page"
/>
```

### Uso futuro en bottom sheet (NO en este PASO, sino en PASO 5)

```tsx
<CapturaForm 
  onSuccess={() => {
    closeSheet();
    toast.success('Movimiento creado');
  }}
  variant="sheet"
/>
```

---

## PASO 0 obligatorio — Diagnóstico

Antes de tocar código, generar `DIAGNOSTICO_CAPTURA_FORM.md` en la raíz con:

### 1. Inventario completo de `captura-client.tsx` HOY

- Lista de imports (todos)
- Lista de hooks (useState, useEffect, useTransition, useRouter, hooks custom, etc.)
- Lista de server actions invocadas y desde dónde
- Lista de endpoints fetcheados (ej. `/api/interpret`)
- Lista de side effects: toasts, `router.push`, `router.refresh`, `revalidatePath`
- Lista de subcomponentes internos (si los hay)

### 2. Mapa de responsabilidades

Para cada bloque del componente, marcar:

- 🟢 Va al nuevo `<CapturaForm />`
- 🔴 Se queda en `/captura/page.tsx` (hero + layout page-level)
- 🟡 Duda — preguntar a Benja antes de mover

### 3. Identificación de acoplamientos

Listar cualquier dependencia del form al contexto de página:
- Uso de `usePathname`, `useSearchParams`, `useParams`
- Lectura de cookies, localStorage, sessionStorage
- Llamadas a server actions que asuman ruta actual
- Cualquier prop o ref que dependa de saber que está en `/captura`

### 4. Plan de extracción

Orden propuesto de pasos, con archivos a crear/modificar/eliminar.

### ⚠️ STOP CONDITION del PASO 0

Si el diagnóstico revela **>2 acoplamientos no triviales** con el contexto de página, parar y reportar a Benja antes de continuar.

**IMPORTANTE**: cuando termines el diagnóstico, PARÁ y esperá luz verde de Benja antes de implementar. No avances con el código productivo sin confirmación.

---

## Estructura de archivos objetivo

```
components/
  captura/
    captura-form.tsx                  ← NUEVO. Client Component principal.
    frases-sugeridas.tsx              ← Subcomponente interno (opcional, si conviene separar).
    captura-form.types.ts             ← Tipos compartidos (opcional).

app/(app)/captura/
  page.tsx                            ← Modificado: renderiza hero + wrapper client.
  _components/
    captura-form-page.tsx             ← NUEVO. Wrapper Client mínimo que conecta router con onSuccess.
    captura-client.tsx                ← ELIMINADO (o reducido a 0 si queda residual).
```

---

## Cambios concretos

### 1. Crear `components/captura/captura-form.tsx`

Mover **todo** el JSX y la lógica del actual `captura-client.tsx`, **excepto**:

- ❌ El hero (`<h1>"¿Qué cargamos?"</h1>` + subtítulo)
- ❌ El wrapper page-level (container, padding de página)

Lo que **SÍ** va adentro:

- ✅ Las 4 frases sugeridas estáticas (`FRASES_SUGERIDAS_INICIALES`)
- ✅ El textarea de input
- ✅ El botón "Interpretar" / submit
- ✅ El llamado a `/api/interpret`
- ✅ La preview del resultado interpretado
- ✅ La edición del resultado interpretado
- ✅ El submit final que crea el movimiento (server action)
- ✅ Manejo de loading states
- ✅ Manejo de errores inline

#### Cambio de comportamiento CRÍTICO

- **HOY**: el componente hace `router.push('/movimientos')` al crear con éxito.
- **AHORA**: en lugar de hardcodear, llamar `props.onSuccess?.(movimientoCreado)` después del create exitoso.
- Si `onSuccess` no se pasa, el form **NO hace nada** post-success. El caller decide.
- **Eliminar `useRouter` del componente nuevo** (no debería necesitarlo si el redirect se delega al caller).

### 2. Crear `app/(app)/captura/_components/captura-form-page.tsx`

Wrapper Client mínimo que conecta el router con el callback `onSuccess`:

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { CapturaForm } from '@/components/captura/captura-form';

export function CapturaFormPage() {
  const router = useRouter();
  return (
    <CapturaForm 
      onSuccess={() => router.push('/movimientos')}
      variant="page"
    />
  );
}
```

### 3. Modificar `app/(app)/captura/page.tsx`

- Mantener como Server Component (no convertir a Client).
- Estructura objetivo:

```tsx
import { CapturaFormPage } from './_components/captura-form-page';

export default function CapturaPage() {
  return (
    <main className="...">  {/* layout page-level que ya existía */}
      <header>
        <h1>¿Qué cargamos?</h1>
        <p>Contame tus movimientos y nos ordenamos.</p>
      </header>
      <CapturaFormPage />
    </main>
  );
}
```

- Si la page ya hacía fetches server-side que el form necesita (catálogo, cuentas, etc.), pasarlos como props al `<CapturaFormPage />` y de ahí al `<CapturaForm />`. **Anotar en el diagnóstico** si esto pasa.

### 4. Eliminar `captura-client.tsx`

Si después de la extracción queda vacío o con código trivial, **eliminarlo**. Si queda con lógica residual que no encaja ni en form ni en page, **parar y preguntar** a Benja.

---

## Tests mentales (casos de borde)

| # | Escenario | Esperado |
|---|-----------|----------|
| 1 | Usuario escribe frase, interpreta, edita, crea desde `/captura` | Crea movimiento + redirige a `/movimientos` |
| 2 | Usuario clickea una frase sugerida | El textarea se rellena con esa frase exacta |
| 3 | Usuario clickea frase sugerida y luego modifica el texto manualmente | Funciona normal, no se resetea ni pierde lo modificado |
| 4 | Intérprete falla (timeout, error 500) | Muestra error inline, NO redirige, mantiene texto del textarea |
| 5 | Submit final falla (DB error) | Muestra error inline, mantiene el preview interpretado |
| 6 | Click "Interpretar" con textarea vacío | Validación visible o botón deshabilitado |
| 7 | Hidratación SSR | Sin warnings de mismatch (las frases ya son estáticas, OK) |
| 8 | Recargar la página mientras está el preview en pantalla | Comportamiento actual preservado (lo que sea que sucediera hoy) |

---

## Validación local (Benja, post Claude Code)

| # | Test | Esperado |
|---|------|----------|
| 1 | `npm run build` | OK, sin warnings nuevos de TypeScript |
| 2 | Abrir `/captura` | Hero idéntico, mismas 4 frases sugeridas, mismo layout del form |
| 3 | Cargar un movimiento end-to-end | Funciona idéntico, redirige a `/movimientos` al final |
| 4 | Clickear una frase sugerida | Rellena el textarea |
| 5 | Simular error del intérprete (cortar wifi y submit) | Manejo de error inline visible, textarea conservado |
| 6 | DevTools Network al cargar la página | Sin requests nuevos no previstos respecto a antes |
| 7 | DevTools Console | Sin warnings nuevos de hydration / keys / props |
| 8 | Inspeccionar el árbol React (DevTools) | Veo `CapturaPage > CapturaFormPage > CapturaForm` correctamente anidados |

---

## Stop conditions para Claude Code

**PARAR y reportar a Benja** si:

1. El diagnóstico del PASO 0 revela >2 acoplamientos no triviales
2. El form depende de algún hook/contexto que solo existe en server components
3. Build falla después de la extracción y no se puede arreglar en <15min
4. TypeScript se queja de tipos circulares, ambiguos o `any` implícito entre form/page/wrapper
5. Cualquiera de los 8 tests mentales NO funciona post-extracción
6. Eliminar `captura-client.tsx` rompe imports en archivos fuera del scope previsto
7. Aparecen errores de hidratación nuevos que no existían antes
8. El form requiere props que la página actual no tiene cómo proveer sin fetches nuevos

---

## Reglas para Claude Code (no negociables)

| Regla | Detalle |
|-------|---------|
| ❌ NO push automático | Solo commit local en `feat/navegacion-reformada` |
| ❌ NO renombrar archivos fuera del scope listado | Especialmente: NO tocar `PerchitaFAB/`, `perchita-*.tsx`, ni nada con "perchita" en el nombre (backlog futuro) |
| ❌ NO mover server actions | Mantenelas en su ubicación actual |
| ❌ NO modificar `/api/interpret` | Out of scope |
| ❌ NO modificar otras rutas | Solo `/captura/` |
| ❌ NO modificar componentes ajenos al form | Si hay shared components que se usan adentro del form, dejalos en su lugar y solo importalos |
| ❌ NO fixear bugs colaterales | Si los encontrás, anotalos en `BUGS_DETECTADOS.md` y seguí |
| ✅ Build debe pasar antes de commitear | `npm run build` verde |
| ✅ Reportar antes/después con tabla | Mismo formato que el reporte de 2.5b |
| ✅ Generar `DIAGNOSTICO_CAPTURA_FORM.md` PRIMERO | Antes de tocar una sola línea de código productivo |
| ✅ Si dudás de algo | Parar y preguntar |

---

## Commit final

Cuando Claude Code termine la validación interna:

```
PASO 3: extraer <CapturaForm /> reusable

- Crear components/captura/captura-form.tsx (Client Component)
- Mover lógica del form desde captura-client.tsx (sin cambios funcionales)
- Hero queda en /captura/page.tsx (no en el form)
- Frases sugeridas viven adentro del form
- API: onSuccess?, variant?, initialText?
- Crear app/(app)/captura/_components/captura-form-page.tsx
  (wrapper Client mínimo que conecta useRouter con onSuccess)
- /captura/page.tsx renderiza hero + <CapturaFormPage />
- captura-client.tsx eliminado (o reducido a residual mínimo)
- PASO 0: DIAGNOSTICO_CAPTURA_FORM.md generado

Sin cambios funcionales: misma UX en /captura.
Habilita PASO 5 (bottom sheet del FAB con <CapturaForm variant="sheet" />).
```

---

## Riesgos no obvios ⚠️

| Riesgo | Mitigación |
|--------|-----------|
| El form usa `useRouter` para más cosas que el redirect final (ej. para `router.refresh()` después del create) | El diagnóstico del PASO 0 lo va a detectar. Si aparece, mantener `useRouter` adentro para usos no-onSuccess, y solo delegar el redirect al callback. |
| El catálogo dinámico se fetcha hoy desde la page server-side y se pasa como prop al client | Pasar como prop a `CapturaFormPage` y de ahí al `<CapturaForm />`. Agregar prop opcional `catalogo` o `accounts` al type de CapturaForm si hace falta. |
| `revalidatePath('/movimientos')` o similar dentro del create | Mantenerlo donde está (en la server action). No depende del componente. |
| `variant="sheet"` queda definido pero NO se prueba en este PASO | Está OK. Se valida en PASO 5. Pero el tipo y la variante deben existir desde ya para no rompernos el contrato después. |

---

## Próximo paso al cerrar PASO 3

PASO 4: refactor del layout principal (`app/(app)/layout.tsx`) para preparar la nueva arquitectura de nav.
