# DIAGNOSTICO_CAPTURA_FORM.md

Generado en: 2026-05-11  
Branch: feat/navegacion-reformada  
Pre-condición: PASO 2.5b commiteado (b313a3c). Ningún archivo productivo fue tocado para generar este diagnóstico.

---

## 1. Inventario completo de `captura-client.tsx` HOY

### Imports

| Módulo | Nombres | Tipo |
|--------|---------|------|
| `react` | `useState, useRef, useCallback` | runtime |
| `next/navigation` | `useRouter` | runtime |
| `lucide-react` | `Mic, MicOff, Send, Loader2` | runtime |
| `@/components/ui/button` | `Button` | runtime |
| `@/lib/utils` | `cn` | runtime |
| `./revision-modal` | `RevisionModal` | runtime |
| `@/lib/ai/prompts/interpretMovement` | `ParsedMovimiento` | type-only |
| `@/types/supabase` | `Cuenta, Tarjeta, Categoria, Persona` | type-only |
| `@/lib/supabase/actions/grupos-types` | `GrupoConMiembros` | type-only |

### Hooks (todos locales al componente)

| Hook | Variable/s | Propósito |
|------|-----------|-----------|
| `useState` | `texto` | valor del textarea |
| `useState` | `estado` (`"idle" \| "loading" \| "error"`) | estado de la llamada a `/api/interpret` |
| `useState` | `errorMsg` | mensaje de error inline |
| `useState` | `parsed` (`ParsedMovimiento \| null`) | resultado interpretado por Claude |
| `useState` | `revisionOpen` | controla apertura del RevisionModal |
| `useState` | `escuchando` | indica si el micrófono está activo |
| `useRouter` | `router` | **solo** para `router.push("/movimientos")` en `handleConfirmed` |
| `useRef` | `recognitionRef` | instancia del SpeechRecognition activa |
| `useRef` | `silenceTimerRef` | timer de auto-submit por silencio |
| `useRef` | `textareaRef` | foco del textarea al clickear frase sugerida |
| `useCallback` | `detenerMicrofono` | para no recrear en cada render (es dep de `iniciarMicrofono`) |
| `useCallback` | `iniciarMicrofono` | idem |

### Server actions invocadas

**Ninguna directamente.** El componente no importa ni llama server actions. La acción `createMovimiento` vive en `RevisionModal`, no acá.

### Endpoints fetcheados

| Endpoint | Método | Dónde | Propósito |
|----------|--------|-------|-----------|
| `/api/interpret` | `POST` | `handleInterpretar()` | enviar texto al LLM para parsear el movimiento |

### Side effects observables

| Effect | Dónde | Nota |
|--------|-------|------|
| `router.push("/movimientos")` | `handleConfirmed()` | **el único uso de `useRouter`** en este componente |
| `router.refresh()` | **NO está aquí** — está en `RevisionModal.handleConfirmar()` | pertenece al modal |

### Subcomponentes internos

| Componente | Ubicación | Qué hace |
|------------|-----------|----------|
| `RevisionModal` | `./revision-modal` | modal de confirmación/edición del movimiento interpretado |

El `RevisionModal` es un Client Component autónomo que importa `createMovimiento`, `MovimientoEditor`, y `useRouter` (para `router.refresh()` post-create). No depende de nada específico de la página `/captura`.

---

## 2. Mapa de responsabilidades

| Bloque | Decisión | Destino |
|--------|----------|---------|
| Hero (`<h1>¿Qué cargamos?</h1>` + subtítulo) | 🔴 Se queda | `/captura/page.tsx` (Server Component) |
| Wrapper div página (`flex flex-col items-center min-h-[calc(100vh-4rem)] ...`) | 🔴 Se queda | `/captura/page.tsx` como layout page-level |
| `FRASES_SUGERIDAS_INICIALES` const | 🟢 Va al form | `components/captura/captura-form.tsx` |
| Global `Window` augmentation (SpeechRecognition types) | 🟢 Va al form | `components/captura/captura-form.tsx` |
| Todos los `useState` (texto, estado, errorMsg, parsed, revisionOpen, escuchando) | 🟢 Va al form | `components/captura/captura-form.tsx` |
| `useRouter` + `router.push("/movimientos")` | 🟢 Va al form → wrapper | se abstrae: form llama `props.onSuccess?.()`, wrapper provee el push |
| `useRef` × 3 | 🟢 Va al form | `components/captura/captura-form.tsx` |
| `useCallback` detenerMicrofono / iniciarMicrofono | 🟢 Va al form | `components/captura/captura-form.tsx` |
| `toggleMicrofono` | 🟢 Va al form | `components/captura/captura-form.tsx` |
| `handleInterpretar` (fetch `/api/interpret`) | 🟢 Va al form | `components/captura/captura-form.tsx` |
| `handleConfirmed` | 🟢 Va al form (modificado) | llama `props.onSuccess?.()` en lugar de `router.push` |
| JSX frases sugeridas | 🟢 Va al form | `components/captura/captura-form.tsx` |
| JSX input area (textarea, botones, hints, errores) | 🟢 Va al form | `components/captura/captura-form.tsx` |
| `<RevisionModal>` | 🟢 Va al form | sigue siendo subcomponente interno del form |
| Props (cuentas, tarjetas, categorias, clientes, personas, grupos) | 🟢 Va al form | pasan por la cadena `page → CapturaFormPage → CapturaForm` |

---

## 3. Identificación de acoplamientos

Revisado uno por uno según la checklist del PASO 0:

| Acoplamiento | Presente | Detalle |
|-------------|----------|---------|
| `usePathname` | ❌ No | no se usa |
| `useSearchParams` | ❌ No | no se usa |
| `useParams` | ❌ No | no se usa |
| `localStorage` / `sessionStorage` / cookies | ❌ No | no se usa |
| Server action que asuma ruta actual | ❌ No | no hay server actions directas |
| `useRouter` para redirect hardcodeado | ✅ **Sí** | `router.push("/movimientos")` en `handleConfirmed` — **1 acoplamiento, trivial** |

**Total acoplamientos no triviales: 0** (el único encontrado, `router.push`, es exactamente el que el spec prevé abstraer vía `onSuccess`).

**→ STOP CONDITION no activada** (umbral: >2 acoplamientos no triviales).

---

## 4. Plan de extracción

### Archivos a crear

**A. `components/captura/captura-form.tsx`** — Client Component principal

- Mueve toda la lógica y JSX de `captura-client.tsx` excepto el hero y el wrapper page-level.
- Props de entrada:
  ```ts
  type CapturaFormProps = {
    onSuccess?: () => void;
    variant?: 'page' | 'sheet';
    initialText?: string;
    // datos del catálogo (provienen de la page server-side):
    cuentas: Cuenta[];
    tarjetas: Tarjeta[];
    categorias: Categoria[];
    clientes: { id: string; nombre: string }[];
    personas: Persona[];
    grupos: GrupoConMiembros[];
  };
  ```
- `handleConfirmed` cambia de `router.push('/movimientos')` a `props.onSuccess?.()`.
- `useRouter` eliminado.
- `RevisionModal` sigue siendo subcomponente interno (import relativo adaptado a nueva ruta).

**B. `app/(app)/captura/_components/captura-form-page.tsx`** — Wrapper Client mínimo

- Conecta `useRouter` con el callback `onSuccess`.
- Recibe los datos del catálogo como props y los pasa hacia abajo.
- El caller (page.tsx) decide qué hacer al crear exitosamente.

### Archivos a modificar

**C. `app/(app)/captura/page.tsx`** — Mantiene los fetches server-side

- Los 6 `Promise.all` permanecen (cuentas, tarjetas, categorias, clientes, personas, grupos).
- La page renderiza: hero (h1 + subtítulo) + `<CapturaFormPage props... />`.
- Elimina el import de `CapturaClient`, importa `CapturaFormPage`.

### Archivos a eliminar

**D. `app/(app)/captura/_components/captura-client.tsx`** — Vacío después de la extracción.

### Árbol de componentes resultante

```
CapturaPage (Server Component — page.tsx)
  ├── <header> (h1 + subtítulo, inline JSX)
  └── <CapturaFormPage cuentas tarjetas categorias clientes personas grupos />
        └── <CapturaForm onSuccess={()=>router.push('/movimientos')} variant="page" cuentas tarjetas ... />
              ├── FRASES_SUGERIDAS_INICIALES chips
              ├── textarea + mic + send
              └── <RevisionModal ... onConfirmed={() => props.onSuccess?.()} />
```

### Pasos de implementación

1. Crear `components/captura/` (directorio nuevo)
2. Crear `components/captura/captura-form.tsx` (mover lógica + reemplazar router por callback)
3. Crear `app/(app)/captura/_components/captura-form-page.tsx`
4. Reescribir `app/(app)/captura/page.tsx`
5. Eliminar `app/(app)/captura/_components/captura-client.tsx`
6. `npm run build`
7. Commit

### Nota sobre `onSuccess` signature

El spec define `onSuccess?: (movimientoCreado: { id: string; tipo: 'egreso' | 'ingreso' }) => void` pero el `createMovimiento` action actual no devuelve el id del movimiento creado (devuelve `void` o lanza). **Recomendación:** simplificar a `onSuccess?: () => void` por ahora, y extender a `(mov)=>void` cuando se necesite en PASO 5. Requiere confirmación de Benja antes de implementar.

---

## Resumen ejecutivo

| Item | Estado |
|------|--------|
| Acoplamientos no triviales | 0 |
| Stop condition activada | NO |
| Complejidad de extracción | Baja — movimiento casi 1:1 con una sola transformación (router → callback) |
| Riesgo principal | Propagar correctamente los 6 props de datos a través de 3 niveles (page → formPage → form) |
| Decisión pendiente | Signature de `onSuccess` (ver nota arriba) |
