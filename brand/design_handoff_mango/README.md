# Handoff: MANGO — Rediseño visual (finanzas personales)

## Overview
MANGO es una app de finanzas personales cuyo diferenciador es la carga de movimientos por **lenguaje natural** vía un asistente ("MANGO AI"). Este handoff es un **rediseño visual**: la estructura, navegación, pantallas y funcionalidad actuales **NO cambian**. Solo se aplica una nueva capa visual (marca MANGO): formato de cards, objetos de branding (logo/mango/hoja/wordmark), colores semánticos y tipografías.

> Regla de oro: **respetar la estructura y el contenido actuales**. Esto es un reskin, no un rediseño de producto ni de flujos.

## About the Design Files
Los archivos de este bundle son **referencias de diseño hechas en HTML** — prototipos que muestran el look & feel buscado, **no código de producción para copiar tal cual**. La tarea es **recrear estas pantallas dentro del codebase existente de MANGO** (React + su stack actual: componentes, router, Tailwind/tokens, Sonner para toasts, etc.), usando los patrones y librerías ya establecidos. No reemplaces tu arquitectura por el HTML.

Archivos incluidos:
- `MANGO Desktop.html` — rediseño desktop: Dashboard, Sheet MANGO AI, Movimientos, Login.
- `MANGO Branding.html` — tablero de marca: logo, wordmark (guiño "Ai"), objetos de mango/hoja, paleta y tipografías.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografías, radios, sombras y espaciados son finales. Recrealos con precisión usando las librerías/tokens de tu codebase. Los **emojis son placeholders de íconos** — reemplazalos por tu set de íconos de línea (ver "Assets").

---

## Objetos de branding (reusar en toda la app)

### Logo / MangoLogo
- **Cuadrado** con esquinas redondeadas (`border-radius:11–14px`) que contiene el **mango**.
  - Sobre superficies claras: fondo **navy `#1E3A5F`**, mango en degradé oro.
  - Versión **fondo blanco** (`#FFFFFF`): usar en superficies navy (ej. botón MANGO AI) — el mango sobresale por el borde superior.
- **El mango NUNCA va sin la hoja** (sin hoja parece un huevo). Siempre: cuerpo del mango + hoja.
- **Mango (objeto)**: elipse orgánica con `border-radius:57% 63% 55% 60% / 63% 67% 54% 56%`, `transform:rotate(-12deg)`, relleno `radial-gradient(ellipse at 30% 24%, #ffdf94, #f0b74d 40%, #d98f2b 80%)`. Volumen con `box-shadow` inset.
- **Hoja (objeto)**: `border-radius:0 100% 0 100%`, `transform:rotate(-32deg)`, verde `linear-gradient(135deg,#4a7a56,#284f33)` o crema `#E8D9B4` según fondo.
- **Blob decorativo**: la misma silueta de mango a baja opacidad (`rgba(232,217,180,.14)`) como textura en cards navy y paneles.

### Wordmark "MANGO" (guiño "Ai")
- Tipografía **Manrope 800**, `letter-spacing:-1px`.
- La **pata izquierda de la N** se corta en diagonal (`clip-path:polygon(0 0,100% 0,0 100%)`, del color del fondo) y un **tittle cuadrado oro `#C98A2B`** la remata → se lee **"Ai"** (MANGO hecho con IA).
- Colores: navy sobre claro; **crema `#E8D9B4` solo sobre navy**.

---

## Screens / Views

### 1. Dashboard (`/dashboard`)
- **Propósito**: estado financiero del mes de un vistazo.
- **Layout**: app shell desktop = **sidebar fija 250px** + main fluido (padding 34px 40px), fondo main `#FFFFFF`.
  - Sidebar (`#FBFAF7`, borde derecho `#E5E7EB`): logo+wordmark arriba → botón **MANGO AI** destacado → nav (Inicio activo, Movimientos, Balances, Préstamos, Cash Flow) → "Más" abajo → bloque usuario (avatar iniciales, nombre, email, salir).
  - Main: header (saludo "Hola, Sofía 👋" + fecha, selector "Julio 2026 ▾") → grid superior `1.6fr 1fr 1fr` (Balance total, Cuentas, Inversiones) → alerta ámbar silenciable → grid `1.5fr 1fr` (gráfico Evolución mensual + Últimos movimientos).
- **Componentes clave**:
  - **Card Balance total**: navy `radial-gradient(130% 130% at 15% 0%,#2c5480,#1e3a5f 60%,#152a44)`, texto crema, blob de mango, cifra **Space Grotesk 600 44px** `$ 1.284.400,50`, chips Ingresos `#5FD699` / Egresos `#F79B9B`. `border-radius:22px`.
  - **Cards mini** (Cuentas/Inversiones): fondo `#F9FAFB`, borde `#E5E7EB`, `border-radius:22px`, ícono en chip redondeado, cifra Space Grotesk 28px.
  - **Alerta**: fondo `#FEF6E7`, borde `#F6E2B8`, ícono cuadrado `#F59E0B`, botón "Silenciar por este mes".
  - **Gráfico**: barras dobles por mes (ingreso `#10B981` / egreso `#E6B98A`, mes actual egreso en oro `#C98A2B`), leyenda.
  - **Botón MANGO AI**: fondo navy, `border-radius:15px`, logo en cuadrado **blanco** con mango sobresaliendo + hoja, título crema "MANGO AI" + subtítulo "Cargar movimiento", "＋" a la derecha, sombra `0 10px 22px rgba(30,58,95,.28)`.

### 2. Sheet MANGO AI (overlay)
- **Propósito**: cargar un movimiento escribiéndolo en lenguaje natural (flujo core).
- **Layout**: backdrop `rgba(15,26,43,.55)` + blur; sheet centrado 620px, `#FFFFFF`, `border-radius:26px`, sombra fuerte.
  - Header: logo mango (con hoja) + "MANGO AI" + subtítulo "Escribí tu movimiento como si me lo contaras" + cerrar "✕".
  - Body: **textarea** (`#F9FAFB`, borde navy en focus `1.5px #1E3A5F`, `border-radius:16px`, min-height 110px) con caret; 4 **frases sugeridas** como pills (`#F3F4F6`); bloque **"MANGO AI entendió"** (fondo `#EAF5EF`, borde `#C7E6D5`) con chips de resultado (Tipo/Categoría/Cuenta/Monto); acciones: "Cancelar" (ghost) + "Interpretar y guardar" (navy, con mango).
- **Comportamiento**: al enviar → crea movimiento, **toast success (Sonner)**, cierra sheet. Se abre desde el botón MANGO AI (desktop) o FAB 🥭 (mobile).

### 3. Movimientos (`/movimientos`)
- **Propósito**: lista filtrable de todos los movimientos.
- **Layout**: mismo shell (sidebar, "Movimientos" activo).
  - Header: título + contador ("248 este mes") + "⟳ Generar pendientes (3)" (estilo alerta ámbar, condicional) + "＋ Nuevo" (navy).
  - Fila de filtros: buscador (flex-1) + selects Mes / Tipo / Cuenta / Categoría (`#F9FAFB`, borde `#E5E7EB`, `border-radius:11px`).
  - Lista **agrupada por día** (encabezado "HOY · …" gris 12px 700). Cada row: ícono categoría (chip 42px), título + "Categoría · Cuenta/método", monto **Space Grotesk 700 16px** (verde `#10B981` ingreso / rojo `#EF4444` egreso) + hora, acciones hover (editar ✎ / duplicar ⧉ / eliminar 🗑). Separadores `#F3F4F6`. Badge "compartido" `#3B82F6` sobre `#EAF1FB`.

### 4. Login (`/login`)
- **Propósito**: primera impresión / autenticación.
- **Layout**: split. Panel izquierdo 52% navy con degradé, **mango 3D grande + hoja**, blobs, logo arriba, tagline "Tus finanzas, en tus palabras." + subtítulo + 2 pills de ejemplo. Panel derecho form (360px): "Bienvenida de nuevo", inputs Email / Contraseña (`#F9FAFB`, borde `#E5E7EB`, `border-radius:12px`), link "¿Olvidaste?", botón "Ingresar" navy, divisor "o", botón "Continuar con Google", link "Registrate".
- **Signup**: igual + campo Nombre. **Onboarding**: bienvenida + primeros pasos (crear cuenta inicial).

---

## Interactions & Behavior
- **MANGO AI**: FAB (mobile) / botón sidebar (desktop) → abre bottom sheet / modal → textarea + sugeridas → "Interpretar" → parse a movimiento → preview "entendió" → guardar → toast → cierra.
- **Alertas**: silenciables hasta fin de mes ("Silenciar por este mes").
- **Filtros/buscador** en Movimientos actualizan la lista en vivo.
- **Row actions** aparecen en hover (desktop).
- **Responsive**: ≥768px sidebar fija; <768px bottom navbar 5 slots con FAB 🥭 central (abre sheet) + drawer "Más".
- Transiciones suaves (150–200ms ease) en hover de nav items, botones y cards.

## State Management
- Usuario (nombre, email, nombre custom del asistente, default "MANGO AI").
- Movimientos (tipo, categoría, subcategoría, concepto, cuenta/método, monto ARS/USD, fecha, pagadores para gasto compartido).
- Cuentas, tarjetas, personas/grupos, categorías (árbol), plantillas recurrentes.
- Estado de alertas (silenciadas hasta fin de mes).
- Estado del sheet MANGO AI (abierto/cerrado, texto, resultado interpretado, loading).
- Filtros de Movimientos (mes, tipo, cuenta, categoría, búsqueda).

## Design Tokens
**Colores**
- Navy primario `#1E3A5F`; navy claro (degradé) `#2C5480`; navy oscuro `#152A44`.
- Crema (solo wordmark/texto sobre navy) `#E8D9B4`.
- Oro acento (links, hover, tittle, detalles) `#C98A2B`; oro claro `#F0B74D` / `#FFDF94`.
- Verde ingresos `#10B981`; rojo egresos `#EF4444`; ámbar alertas `#F59E0B`; azul info `#3B82F6`.
- Verde hoja `#284F33`→`#4A7A56`.
- Fondo app `#FFFFFF`; card `#F9FAFB`; sidebar `#FBFAF7`; borde `#E5E7EB` / `#F3F4F6`.
- Texto: primary `#111827`, secondary `#6B7280`, muted `#9CA3AF`.

**Tipografía**
- **Manrope** (400–800): UI general y wordmark (800).
- **Space Grotesk** (500–700): cifras y montos.
- Formato dinero ARS: `$ 1.234.567,89` (miles con punto, decimales con coma); ingresos `+ $`, egresos `- $`.

**Radios**: chips/inputs 11–12px · cards 22px · sheet 26px · logo 11–14px · pills 20px.
**Sombras**: card `0 8px 20px rgba(30,58,95,.06)` · elevada `0 10px 22px rgba(30,58,95,.28)` · sheet `0 40px 90px rgba(0,0,0,.4)`.
**Espaciado base**: múltiplos de 4 (gaps 8/10/14/18px; padding cards 22–26px).

## Assets
- **Logo/mango/hoja/wordmark**: reproducibles con CSS (ver "Objetos de branding") o exportables como SVG/componente `<MangoMark>` / `<MangoWordmark>`. Recomendado: crear estos 2 componentes reutilizables una sola vez.
- **Íconos**: los emojis (🛒 💼 ⛽ 🎬 👥 📈 🏦 …) son **placeholders**. Reemplazar por tu set de íconos de línea (ej. Lucide) manteniendo el chip redondeado de fondo por categoría.
- **Fuentes**: Google Fonts (Manrope, Space Grotesk).

## Files
- `MANGO Desktop.html` — pantallas desktop del rediseño.
- `MANGO Branding.html` — sistema de marca y objetos.
- (Fuente editable original: `MANGO Desktop.dc.html` / `MANGO Branding.dc.html`.)
