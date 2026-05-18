# BUGS_DETECTADOS.md

Bugs pre-existentes detectados durante el análisis del PASO 0. **No se arreglan en este PR.**

---

## BUG-001 — `toISOString()` rompe timezone Argentina en plantillas

**Archivo**: `app/(app)/ajustes/_components/plantillas-tab.tsx`, línea 163  
**Código afectado**:
```ts
fecha_inicio: data.fecha_inicio || new Date().toISOString().slice(0, 10),
```

**Problema**: `toISOString()` retorna la fecha en UTC. En Argentina (UTC-3), si el usuario crea una plantilla entre las 21:00 y las 23:59 hs, el `fecha_inicio` guardado es el día siguiente.

**Ejemplo**: Benja crea una plantilla el 14 de mayo a las 22:30 hs ARG. Se guarda `2026-05-15` en lugar de `2026-05-14`.

**Impacto**: La fecha de inicio de la plantilla queda desplazada un día para los usuarios que trabajan de noche.

**Fix sugerido (para PR posterior)**:
```ts
const hoy = new Date();
const fechaARG = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
fecha_inicio: data.fecha_inicio || fechaARG,
```
O usar una librería de timezone (date-fns-tz).

---

*(agregar más bugs si se detectan durante la implementación)*
