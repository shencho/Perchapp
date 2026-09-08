# MANGO — guion de la demo

Guion escena por escena de `mango-demo.html`. Sirve para dos cosas: leerlo como
locución en off si algún día se produce un video renderizado, y como referencia
de qué muestra cada tramo.

- **Duración total:** 4:53 a velocidad 1x (3:15 a 1.5x, 2:27 a 2x).
- **Datos:** ficticios. Personas con apodos, conceptos genéricos. Los bancos y
  marcas de tarjeta aparecen como texto que el usuario tipearía en "Banco emisor",
  sin logos ni branding ajeno.
- **Música:** score sintetizado con Web Audio dentro de la propia página. Cuatro
  progresiones de acordes que cambian por acto, más efectos de interacción. No
  hay ningún archivo de audio: pesa 0 KB.
- **Aritmética:** todo número en pantalla lo calcula el mismo código que la app
  (`lib/domain/*` portado a JS). Se verifica con la tecla `d` o con `?debug=1`.

---

## Placa de apertura · antes de 0:00

**En pantalla.** Degradé navy de marca con dos siluetas de mango a la deriva. El
mango con hoja y el wordmark con la N cortada. Botón "Ver la demo · 5 min".

**Locución.** MANGO. Toda tu plata, en un solo lugar.

> El botón es necesario: ningún navegador deja arrancar audio sin un gesto del
> usuario. Que además funcione como placa de título es la parte linda.

---

## 1 · Entrar con Google — 0:00

**En pantalla.** Login real de la app: panel navy a la izquierda con el lockup,
formulario a la derecha, "Continuar con Google". Se elige la cuenta y entra.

**Locución.** Entrás con Google. Ni un formulario, ni una contraseña nueva que
recordar.

---

## 2 · Setup en 40 segundos — 0:08

**En pantalla.**
1. Modal de categorías sugeridas. Se tilda **Alimentos** entera y **Hogar**
   entera; **Familia** y **Educación** quedan sin tocar; de **Transporte** entran
   sólo Combustible, Traslados y Peajes. Cierra con "27 categorías creadas".
2. Alta de las cuatro cuentas **con saldo inicial**: Caja de ahorro Galicia
   $1.200.000, Mercado Pago $180.000, Efectivo $95.000, Caja de ahorro Santander
   US$ 3.400. Desde acá aparece la tira de saldos a la derecha.
3. Alta de las **tres tarjetas de crédito** con día de cierre y de vencimiento:
   VISA Galicia ···· 4417 (cierra 20 / vence 10), Mastercard Santander ···· 8032
   (cierra 15 / vence 2), Amex Galicia ···· 2290 (cierra 5 / vence 22).

**Locución.** MANGO trae un catálogo de categorías listo: tildás lo que usás y
dejás afuera lo que no. Cada cuenta arranca con el saldo que tenés hoy, y desde
ahí cada movimiento la mueve sola. Y en las tarjetas alcanza con dos datos —
cierre y vencimiento — para que la app arme el ciclo: qué consumo cae en cada
resumen y cuándo hay que pagarlo.

---

## 3 · Cargar de todo — 0:55

**En pantalla.** Siete cargas con medio de pago, clasificación y necesidad
distintos. Cada una mueve la tira de saldos: verde cuando sube, rojo cuando baja.

| Movimiento | Medio | Detalle |
|---|---|---|
| Sueldo $1.450.000 | Transferencia | entra a Galicia |
| Supermercado $86.400 | Débito | sale de Mercado Pago |
| Nafta $52.000 | Efectivo | necesidad 4 |
| Indumentaria $240.000 | Crédito VISA | **3 cuotas**, no toca ninguna cuenta |
| Streaming US$ 12,99 | Crédito VISA | **en dólares**, resumen aparte |
| Delivery, Software, Trabajo independiente | varios | montaje rápido |
| Luz $65.000 | Crédito Mastercard | **cargado por voz** |

**Locución.** Ahora la parte de todos los días. El sueldo entra y la cuenta sube:
los saldos de la derecha son reales, no un cartel. Hasta la plata del bolsillo
tiene su cuenta — si no, el mes nunca cierra. Una compra en tres cuotas se carga
una sola vez: MANGO genera las cuotas y las alinea con el ciclo de la tarjeta, y
la cuenta bancaria ni se entera. Un consumo en dólares tampoco se convierte ni se
mezcla: la misma tarjeta lleva dos resúmenes en paralelo.

**Y cuando no tenés ganas de llenar un formulario, se lo contás.** "Pagué la luz
65 lucas con la Master." Entendió el monto, el rubro y qué tarjeta es la Master.
Vos revisás y confirmás.

---

## 4 · Recurrentes y la alerta — 1:52

**En pantalla.** Se cargan tres plantillas: Alquiler (día 5), Gimnasio (día 8),
Internet (día 15). El reloj avanza al 13 de agosto y en Inicio aparecen solas
tres alertas: dos rojas por atrasadas y una ámbar. Se abre el modal de pendientes,
Internet queda destildada porque todavía no debitó, y el monto del alquiler se
corrige de $520.000 a $534.200.

**Locución.** El alquiler, el gimnasio, internet: se cargan una vez y quedan
esperando. Nadie te manda la alerta: la app compara el día del mes con lo que ya
generaste. El alquiler venció hace ocho días y todavía no está cargado. La
plantilla decía quinientos veinte mil; vino quinientos treinta y cuatro doscientos.
Escribís el real y listo. Dos movimientos creados, dos cuentas movidas, y la
alerta se apagó.

---

## 5 · Compartido, y el otro lado — 2:28

**En pantalla.** Un asado de $128.000 con la VISA, marcado como compartido entre
Vos, Colo y Rulo. En la lista aparece la barra "0 de 2 cobrado". Entonces la
pantalla se parte en dos: a la izquierda tu teléfono, a la derecha el de Colo,
con la misma app. A Colo le entra la notificación y ve "Debés $42.667". Toca
Saldar y del otro lado la barra pasa a "1 de 2 cobrado".

**Locución.** Pagaste vos, pero eran tres. Cargás el total una sola vez y MANGO
reparte: en el resumen de tu VISA entra el total, pero en tus gastos del mes
cuenta sólo tu parte. Colo tiene la misma app; no le mandás nada, la deuda le
aparece sola. Transfirió, y de tu lado se marcó solo. Rulo todavía debe.

---

## 6 · El resumen y cómo se paga — 2:58

**En pantalla.** El reloj llega al 21 de agosto: la VISA cerró. El detalle muestra
los dos resúmenes — ARS $373.800 y USD 57,99 — con la cuota 1 de 3, el asado
compartido y una devolución de percepciones que **resta**. En "Pagar resumen" se
ve el desglose completo y se prueba un pago parcial en dólares.

**Locución.** El veinte cerró la VISA. Todo lo que cargaste entre el veintiuno de
julio y el veinte de agosto es este resumen, ni un peso más. Pesos y dólares por
separado, y esa devolución de percepciones no es un gasto: es un crédito que
resta. Consumos, menos lo que ya salió de una cuenta, menos las devoluciones,
menos lo ya pagado: lo que queda es el pendiente. Si ponés menos, te lo dice y
guarda el saldo para el próximo resumen. Un movimiento por moneda, sale de la
cuenta que corresponde, y la tarjeta queda saldada.

> **Punto interactivo.** Pausando acá, el espectador puede escribir otro monto en
> el bloque USD y ver recalcularse el "quedan…".

---

## 7 · El viaje, dividido — 3:41

**En pantalla.** Proyecto tipo Viaje "Fin de semana en la montaña" con Colo, Rulo
y Peque. Cinco gastos con pagadores distintos: Cabañas $420.000 (Vos), Nafta
$95.000 (Rulo), Supermercado $138.000 (Colo), Peajes $24.000 (Peque) y Cena
$86.000 (Vos, **sin Peque**). El panel de saldos se recalcula con cada gasto y
termina con las transferencias mínimas.

**Locución.** Cuatro personas, un viaje. Cada uno paga lo que le toca pagar y
nadie lleva la cuenta en una servilleta. Peque no fue a la cena: la destildás y
esa noche se reparte entre tres. Cuatro personas, cinco gastos, doce deudas
cruzadas posibles. MANGO las reduce a tres transferencias y ahí se termina.

---

## 8 · Las estadísticas — 4:20

**En pantalla.** El mismo mes visto en los cuatro cortes, con la torta
remorfeando: Categoría, Medio de pago, Cuenta y Necesidad. Cierra en Inicio con
el patrimonio en las dos monedas y el delta contra el mes anterior.

**Locución.** Todo lo que cargaste, agrupado. Y acá está lo bueno: es la misma
plata vista de cuatro maneras. Por medio de pago, cuánto se fue en crédito y
cuánto en efectivo. Por cuenta, de dónde salió cada peso. Y el corte incómodo:
cuánto de lo que gastaste era imprescindible y cuánto no. Arriba, el número que
importa: patrimonio en las dos monedas, ingresos, gastos y cuánto ahorraste,
comparado con el mes pasado.

---

## Cierre

Cinco pilares — cuentas reales, tarjetas con ciclo, recurrentes, compartido,
estadísticas — sobre el degradé de marca, con el aviso de que los datos son
ficticios.

**Locución.** MANGO. Toda tu plata, en un solo lugar.

---

## Cómo se opera la demo

| Acción | Cómo |
|---|---|
| Reproducir / pausar | barra espaciadora o el botón |
| Saltar de capítulo | los chips de abajo, las teclas `1`–`8`, o `◀◀` / `▶▶` |
| Adelantar 5 segundos | `←` / `→` |
| Velocidad | el botón `1x` cicla 1x → 1.5x → 2x |
| Silenciar | el botón de volumen o la tecla `m` (se recuerda) |
| Tocar la app | pausá: cuando hay un cartel dorado, los controles de esa pantalla responden |
| Autotest | la tecla `d`, o abrir con `?debug=1` |

Puntos interactivos: las categorías del onboarding, las monedas del hero, el
monto del pago de tarjeta, y los cortes, meses y monedas de Estadísticas.

## Cómo se edita

El archivo publicado es `mango-demo.html`, generado por `sh build.sh` a partir de
las diez partes de `src/`:

| Parte | Qué hay adentro |
|---|---|
| `01-base.css` · `02-shell.css` · `03-chrome.css` | tokens de marca, shell de la app, escenario |
| `04-markup.html` | esqueleto: marcos, HUD, controles, placas |
| `05-engine.js` | dominio portado de `lib/domain/*` + los datos ficticios |
| `06-screens.js` · `07-modals.js` | las pantallas y los diálogos |
| `08-director.js` | layout, HUD, audio y primitivas de escena |
| `09-script.js` | **el guion**: la secuencia de pasos |
| `10-player.js` | reproductor, interactividad y autotest |

Para cambiar el recorrido casi siempre alcanza con `09-script.js`. Para cambiar
un monto o una fecha, con el bloque de datos de `05-engine.js` — pero después
correr el autotest, porque las cifras esperadas están escritas ahí.
