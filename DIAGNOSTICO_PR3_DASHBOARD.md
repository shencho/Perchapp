# DIAGNÓSTICO PR3 — Dashboard rico

> ⚠️ **CHECKPOINT — PARADA OBLIGATORIA (PASO 0).** Hay **2 bloqueos de precondición** que necesitan tu decisión antes de tocar código. Diagnóstico read-only; no se creó rama ni se modificó nada.

**Baseline build:** ✅ verde (exit 0) en HEAD `b4cb377` (última corrida, commit del FAB).

---

## 🚨 BLOQUEO 1 — PR2 no está mergeado (precondición del spec falsa)

El spec dice *"crear `feat/pr3-dashboard` desde main con PR2 ya mergeado"*. Pero:
- `main` = `2a06096` (solo PR1). **NO tiene PR2.**
- PR2 vive en `feat/pr2-visual` (HEAD `b4cb377`, 22 commits) — **sin push, sin merge** (el push es tuyo).

PR3 **depende de PR2** (usa MangoMark, tokens semánticos, Space Grotesk, sidebar `#FBFAF7`). Si creo la rama desde `main` pelado, no tendría nada de eso.

**Opciones:**
- **A (recomendada):** crear `feat/pr3-dashboard` **desde `feat/pr2-visual`** (stack sobre PR2). Cuando mergees PR2, PR3 rebasea limpio.
- **B:** frenar hasta que pushees+mergees PR2 a `main`, y ahí sí crear desde `main` actualizado.

---

## 🚨 BLOQUEO 2 — No existe "picker de emojis de categorías" (premisa de la sección 4)

El spec asume un picker de emojis para categorías y pide `emojiToLucide(emoji)`. **La realidad:**
- ❌ **No hay picker de emojis** en el código (búsqueda exhaustiva: sin emoji-mart, sin lista de emojis, sin editor de categoría).
- ❌ **`categoria.icono` NO se renderiza en ningún lado** de la app hoy.
- ❌ Al crear categorías inline (`movimiento-editor`), `icono` se setea a **`null`**.
- El seed (`lib/templates/catalogos.ts`) **no define emojis** (solo nombre/tipo/subcategorías).
- Conclusión: los datos de categoría tienen **nombre pero no emoji** (icono ≈ null en la práctica).

➡️ **`emojiToLucide(emoji)` no tiene de dónde mapear** — todo caería al fallback `Tag`. La sección 4 no puede basarse en emojis.

**Opciones:**
- **A (recomendada):** mapear **por NOMBRE de categoría → Lucide** (`categoriaNombreToLucide(nombre)`), con fallback `Tag`. `topCategorias` ya trae `nombre` → **no requiere cambiar el data-fetching** (respeta STOP condition 6). Inventario a cubrir = los nombres de `TEMPLATE_CATEGORIAS` (Alimentos, Hogar, Familia, Transporte, Salud, etc.).
- **B:** implementar `emojiToLucide` igual (quedaría todo en `Tag` hasta que exista un picker) — poco útil.
- **C:** dejar la sección 4 con chip navy neutro sin ícono por categoría.

---

## 1. Estructura actual del dashboard

- **`app/(app)/dashboard/page.tsx`** (Server Component): hace todo el fetch (perfil, cuentas, tarjetas, movimientos 24m, categorías, préstamos, gastos compartidos, plantillas, alertas silenciadas), calcula KPIs y arma `DashboardData`. Renderiza `<DashboardClient data={...} />`.
- **`_components/dashboard-client.tsx`** (Client): presentación. Grid de stat-cards + secciones (cuentas líquidas, tarjetas, préstamos, compartidos, inversiones), `BloqueAnalisis` (topCategorías + necesidad), alertas.
- **`_components/grafico-evolucion.tsx`**: gráfico de barras/línea.

**Data-fetching que NO se toca** (SC6): todo el `page.tsx`. Todos los datos del mockup ya existen (ver abajo) → **no hace falta ninguna query nueva**.

## 2. Stat-cards actuales (5)
`Patrimonio ARS` · `Ingresos del mes` · `Egresos del mes` · `Balance del mes` (con delta % vs mes anterior) · `Ahorro %`.

**Mapa al mockup:** el **hero navy** absorbe *Balance del mes* + *Patrimonio*. Las stat-cards restantes del mockup (Ingresos / Gastos / Tarjetas / Inversiones) se arman con datos ya presentes:
- Ingresos ← `hero.ingresosDelMes`
- Gastos ← `hero.egresosDelMes`
- Inversiones ← suma de `inversiones[]` (ya calculado)
- Tarjetas ← suma de `tarjetas[].consumo` (ya calculado)

## 3. ¿Variación % y USD existen? → **SÍ, ambos**
- **Variación % vs mes anterior:** ✅ `hero.balanceMesAnterior` se fetchea; `dashboard-client` ya computa `delta`. → chip variación con `TrendingUp/Down` es viable.
- **Tenencia USD:** ✅ `hero.totalUSD`. → chip USD condicional viable (`totalUSD !== 0`).

## 4. ¿Gastos por categoría existe? → **SÍ, ya se renderiza**
- `analisis.topCategorias`: top 5 `{ id, nombre, monto, porcentaje }` — **ya calculado y ya mostrado** en `BloqueAnalisis` (dashboard-client:464-493).
- PR3 sección 3 = **enriquecer lo existente** (chip de ícono por nombre + barra de progreso proporcional), **no crear** una query. `porcentaje` ya está para las barras.
- ⚠️ Falta el **ícono**: se resuelve con el mapping por nombre (Bloqueo 2, opción A) — sin tocar el fetch.

## 5. Inventario de emojis del picker
**No aplica** — no hay picker ni emojis en datos (ver Bloqueo 2). El inventario relevante para el mapping por nombre son las **categorías semilla** de `TEMPLATE_CATEGORIAS`: Alimentos, Hogar, Familia, Transporte, Salud, Educación, Entretenimiento, Personal, Trabajo, Impuestos, Deudas, Ahorro/Inversión, Ingresos varios, etc. (a inventariar completo en Bloque 1).

## 6. Plan de componentes (post luz verde)
Todo dentro de `app/(app)/dashboard/` + un helper de íconos:
- **Nuevo** `lib/ui/category-icons.ts` — `categoriaNombreToLucide(nombre): LucideIcon`, fallback `Tag`. (Bloque 1)
- **Modif** `dashboard-client.tsx`:
  - Hero navy con blobs (absorbe Balance/Patrimonio) — nuevo markup en el componente del dashboard. (Bloque 2)
  - Stat-cards con chip de ícono (ArrowDownLeft/ArrowUpRight/navy). (Bloque 3)
  - `BloqueAnalisis` → chip de ícono + barra por categoría. (Bloque 4)
- **Sin tocar:** `page.tsx` (fetch), grafico-evolucion, y todo lo fuera de `dashboard/`.

## Tests de datos (confirmados viables sin nuevas queries)
totalARS ✅ · totalUSD ✅ · ingresos/egresos/balance del mes ✅ · balanceMesAnterior (delta%) ✅ · topCategorias con porcentaje ✅ · tarjetas.consumo ✅ · inversiones ✅.

---

## Decisiones que necesito antes del Bloque 1
1. **Branching:** ¿PR3 stackea sobre `feat/pr2-visual` (opción A), o esperás a mergear PR2 a main (opción B)?
2. **Íconos de categoría:** ¿mapping **por nombre** → Lucide (opción A, recomendada, sin tocar fetch), o algo distinto?

**PARO acá. No creo rama ni toco código sin tu luz verde.**
