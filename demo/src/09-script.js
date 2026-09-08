
/* ═══════════════════════════════════════════════════════════════════════════
   14. EL GUION
   ═══════════════════════════════════════════════════════════════════════════ */
function resolveSel(sel){
  if (sel.charAt(0) !== "@") return sel;
  const scope = S.route2 ? "#scrPhone " : (S.device === "desktop" ? "#scrDesktop " : "#scrPhone ");
  return scope + '[data-k="' + sel.slice(1) + '"]';
}
function toast(msg, dur){
  return push({dur:dur||1.5, enter:function(){ S.toast = msg; dirty(); sfx("ok"); },
    done:function(){ S.toast = msg; dirty(); }});
}
function untoast(){ return push({dur:0.2, done:function(){ S.toast = null; dirty(); }}); }
function openModal(kind, form){
  return function(){ S.modal = kind; S.form = form || {}; S.focus = null; dirty(); };
}
function closeModal(){ S.modal = null; S.sheet = null; S.form = {}; S.focus = null; dirty(); }

// ── 1 · Entrar con Google ───────────────────────────────────────────────────
chapter(0);
act(function(){ S.device = "desktop"; S.route = "login"; dirty(); }, 0.5);
say("Paso 1", "Entrás con Google. Ni un formulario, ni una contraseña nueva que recordar.", "bl", 3.0);
tap("@btn-google", function(){ S.route = "google"; }, 1.0);
wait(0.9);
tap("@g-acct", function(){ S.perfil.nombre = "Vos"; S.route = "onboarding"; }, 1.0);
hush();

// ── 2 · Setup ───────────────────────────────────────────────────────────────
chapter(1);
act(function(){ S.modal = "importar"; dirty(); }, 0.6);
say("Categorías", "MANGO trae un catálogo listo. Tildás lo que usás y dejás afuera lo que no: nadie necesita todas.", "bl", 3.4);
tap("@chk-0", function(){ for (let i=0;i<8;i++) S.picks["0:"+i] = true; }, 0.8);
tap("@chk-1", function(){ for (let i=0;i<5;i++) S.picks["1:"+i] = true; }, 0.7);
say("", "A <b>Familia</b> ni la mira. De <b>Transporte</b> se queda con tres de ocho.", "bl", 2.4);
tap("@chk-5-0", function(){ S.picks["5:0"] = true; }, 0.7);
tap("@chk-5-6", function(){ S.picks["5:6"] = true; }, 0.6);
tap("@chk-5-7", function(){ S.picks["5:7"] = true; }, 0.6);
act(function(){
  [[3,[2]],[4,[1,4]],[8,[0,1]],[9,[1,2,5]],[10,[0,2]],[11,[1]]].forEach(function(x){
    x[1].forEach(function(si){ S.picks[x[0]+":"+si] = true; });
  });
  dirty();
}, 0.5);
hush();
tap("@btn-importar", function(){
  S.importadas = Object.keys(S.picks).filter(function(k){ return S.picks[k]; }).length;
  S.cats = CATS.map(function(c){ return c.id; });
  S.modal = "importadas"; sfx("ok");
}, 0.9);
wait(1.1);
tap("@btn-cerrar", function(){ closeModal(); S.route = "cuentas"; }, 0.9);

say("Cuentas", "Cada cuenta arranca con el saldo que tenés hoy. Desde ahí, cada movimiento la mueve sola.", "bl", 3.0);
tap("@btn-nueva-cuenta", openModal("cuenta"), 0.9);
type("nombre", "Caja de ahorro Galicia");
pick("tipo", "Banco"); pick("moneda", "ARS");
type("saldo", "1200000", 0.9);
tap("@btn-guardar", function(){ S.cuentas.push("c1"); closeModal(); S.hud = true; sfx("ok"); }, 0.8);
hush();
tap("@btn-nueva-cuenta", openModal("cuenta", {nombre:"Mercado Pago",tipo:"Billetera",moneda:"ARS",saldo:"180000"}), 0.7);
tap("@btn-guardar", function(){ S.cuentas.push("c2"); closeModal(); sfx("ok"); }, 0.6);
tap("@btn-nueva-cuenta", openModal("cuenta", {nombre:"Efectivo",tipo:"Efectivo",moneda:"ARS",saldo:"95000"}), 0.6);
tap("@btn-guardar", function(){ S.cuentas.push("c3"); closeModal(); sfx("ok"); }, 0.6);
tap("@btn-nueva-cuenta", openModal("cuenta", {nombre:"Caja de ahorro Santander",tipo:"Banco",moneda:"USD",saldo:"3400"}), 0.6);
tap("@btn-guardar", function(){ S.cuentas.push("c4"); closeModal(); sfx("ok"); }, 0.6);
say("Dos monedas", "Pesos y dólares viven en paralelo. MANGO no los suma nunca entre sí.", "bl", 2.6);
hush();

go("tarjetas");
tap("@btn-nueva-tarjeta", openModal("tarjeta"), 0.9);
type("nombre", "VISA Galicia");
pick("tipo", "Crédito");
type("banco", "Galicia", 0.5);
type("u4", "4417", 0.4);
type("cierre", "20", 0.35);
type("vto", "10", 0.35);
say("Los dos días que importan", "Con el <b>cierre</b> y el <b>vencimiento</b> MANGO arma solo el ciclo: qué consumo cae en cada resumen y cuándo hay que pagarlo.", "bl", 3.6);
type("limARS", "1500000", 0.8);
pick("pago", "Caja de ahorro Galicia");
tap("@btn-guardar", function(){ S.tarjetas.push("t1"); closeModal(); sfx("ok"); }, 0.8);
hush();
tap("@btn-nueva-tarjeta", openModal("tarjeta", {nombre:"Mastercard Santander",tipo:"Crédito",
  banco:"Santander",u4:"8032",cierre:"15",vto:"2",limARS:"900000",pago:"Caja de ahorro Galicia"}), 0.7);
tap("@btn-guardar", function(){ S.tarjetas.push("t2"); closeModal(); sfx("ok"); }, 0.6);
tap("@btn-nueva-tarjeta", openModal("tarjeta", {nombre:"Amex Galicia",tipo:"Crédito",
  banco:"Galicia",u4:"2290",cierre:"5",vto:"22",limARS:"600000",pago:"Caja de ahorro Galicia"}), 0.6);
tap("@btn-guardar", function(){ S.tarjetas.push("t3"); closeModal(); sfx("ok"); }, 0.6);
say("Tres tarjetas, tres ciclos", "Cierran el 20, el 15 y el 5. Cada una con su propio calendario — y la app los sigue por vos.", "bl", 3.0);
spot("#hud .hud-grp:last-child", 2.2, 8);
unspot(); hush();

// ── 3 · Cargar de todo ──────────────────────────────────────────────────────
chapter(2);
act(function(){ setHoy("2026-08-12"); }, 0.3);
go("movimientos", "desktop");
say("Paso 3", "Ahora la parte de todos los días: cargar plata que entra y plata que sale.", "bl", 2.6);
tap("@btn-nuevo-mov", openModal("movimiento", {tipo:"Egreso",moneda:"ARS"}), 0.9);
act(function(){ S.form.tipo = "Ingreso"; dirty(); }, 0.4);
type("monto", "1450000", 0.9);
pick("categoria", "Haberes"); pick("subcategoria", "Sueldo");
type("concepto", "Sueldo", 0.5);
pick("clasificacion", "Fijo"); pick("metodo", "Transferencia"); pick("cuenta", "Caja de ahorro Galicia");
tap("@btn-guardar", function(){ addMov(M.sueldo); closeModal(); sfx("ok"); }, 0.8);
say("", "El sueldo entra y la cuenta sube. Mirá la tira de la derecha: los saldos son reales, no un cartel.", "bl", 3.0);
spot("#hud .hud-grp:first-of-type", 2.0, 8);
unspot(); hush();

tap("@btn-nuevo-mov", openModal("movimiento", {tipo:"Egreso",moneda:"ARS",monto:"86400",
  categoria:"Alimentos",subcategoria:"Supermercado",concepto:"Supermercado",clasificacion:"Variable",
  necesidad:5,metodo:"Débito",debita:"Cuenta",cuenta:"Mercado Pago"}), 0.8);
tap("@btn-guardar", function(){ addMov(M.super1); closeModal(); sfx("ok"); }, 0.7);
tap("@btn-nuevo-mov", openModal("movimiento", {tipo:"Egreso",moneda:"ARS",monto:"52000",
  categoria:"Transporte",subcategoria:"Combustible",concepto:"Nafta",clasificacion:"Variable",
  necesidad:4,metodo:"Efectivo",debita:"Cuenta",cuenta:"Efectivo"}), 0.8);
tap("@btn-guardar", function(){ addMov(M.nafta); addMov(M.softAmex); closeModal(); sfx("ok"); }, 0.7);
say("Efectivo también", "Hasta la plata del bolsillo tiene su cuenta. Si no, el mes nunca cierra.", "bl", 2.4);
hush();

tap("@btn-nuevo-mov", openModal("movimiento", {tipo:"Egreso",moneda:"ARS",
  categoria:"Cuidado personal",subcategoria:"Indumentaria",concepto:"Indumentaria",
  necesidad:2,metodo:"Crédito",debita:"Tarjeta",tarjeta:"VISA Galicia"}), 0.9);
act(function(){ S.form.clasificacion = "Cuotas"; dirty(); }, 0.5);
type("montoTotal", "240000", 0.7);
type("cuotas", "3", 0.3);
say("En cuotas", "Cargás el total una vez. MANGO genera las tres cuotas y las alinea con el ciclo de la VISA. La cuenta bancaria ni se entera.", "bl", 3.6);
tap("@btn-guardar", function(){ addMov(M.indum); closeModal(); sfx("ok"); }, 0.8);
spot("#hud .hud-grp:last-child", 1.8, 8);
unspot(); hush();

tap("@btn-nuevo-mov", openModal("movimiento", {tipo:"Egreso",moneda:"USD",monto:"12.99",
  categoria:"Suscripciones",subcategoria:"Streaming",concepto:"Streaming",clasificacion:"Fijo",
  necesidad:2,metodo:"Crédito",debita:"Tarjeta",tarjeta:"VISA Galicia"}), 0.9);
say("Consumo en dólares", "La misma tarjeta lleva dos resúmenes en paralelo. Un consumo de US$ 12,99 no se convierte ni se mezcla.", "bl", 3.2);
tap("@btn-guardar", function(){ addMov(M.streaming); closeModal(); sfx("ok"); }, 0.8);
hush();

act(function(){ addMov(M.farmacia); }, 0.5);
act(function(){ addMov(M.delivery); }, 0.55);
act(function(){ addMov(M.super2); }, 0.55);
act(function(){ addMov(M.software); }, 0.55);
act(function(){ addMov(M.freelance); }, 0.55);
say("", "Delivery con la Mastercard, software en dólares, un trabajo independiente cobrado en la cuenta USD.", "bl", 2.6);
hush();

// Captura por voz
go("dashboard", "phone");
say("MANGO AI", "Y cuando no tenés ganas de llenar un formulario, se lo contás y listo.", "bl", 2.6);
tap("@fab", function(){ S.sheet = "captura"; S.form = {}; }, 1.0);
hush();
act(function(){ S.mic = true; dirty(); }, 0.5);
type("captura", "Pagué la luz 65 lucas con la Master", 2.6);
act(function(){ S.mic = false; dirty(); }, 0.4);
tap("@btn-enviar", function(){ S.sheet = null; S.modal = "revision"; sfx("ok"); }, 0.9);
say("", "Entendió el monto, el rubro y qué tarjeta es “la Master”. Vos revisás y confirmás.", "bl", 3.2);
tap("@btn-confirmar-captura", function(){ addMov(M.luz); closeModal(); }, 0.9);
toast("Movimiento creado", 1.6); untoast(); hush();

// ── 4 · Recurrentes y la alerta ─────────────────────────────────────────────
chapter(3);
go("recurrentes", "desktop");
say("Lo que se repite", "El alquiler, el gimnasio, internet. Se cargan una vez y quedan esperando.", "bl", 2.8);
tap("@btn-nueva-plantilla", openModal("plantilla", {tipo:"Egreso"}), 0.9);
type("nombre", "Alquiler", 0.6);
type("monto", "520000", 0.8);
type("dia", "5", 0.3);
pick("metodo", "Débito automático"); pick("clasificacion", "Fijo");
pick("cuenta", "Caja de ahorro Galicia"); pick("categoria", "Hogar › Alquiler/Expensas");
tap("@btn-guardar", function(){ S.plantillas.push(PLANTILLAS[0]); closeModal(); sfx("ok"); }, 0.8);
tap("@btn-nueva-plantilla", openModal("plantilla", {tipo:"Egreso",nombre:"Gimnasio",monto:"45000",
  dia:"8",metodo:"Débito automático",clasificacion:"Fijo",cuenta:"Mercado Pago",categoria:"Deportes › Gimnasio"}), 0.7);
tap("@btn-guardar", function(){ S.plantillas.push(PLANTILLAS[1]); closeModal(); sfx("ok"); }, 0.6);
tap("@btn-nueva-plantilla", openModal("plantilla", {tipo:"Egreso",nombre:"Internet",monto:"38000",
  dia:"15",metodo:"Débito automático",clasificacion:"Fijo",cuenta:"Caja de ahorro Galicia",categoria:"Hogar › Servicios"}), 0.7);
tap("@btn-guardar", function(){ S.plantillas.push(PLANTILLAS[2]); closeModal(); sfx("ok"); }, 0.6);
hush();

say("Pasan los días…", "", "bc", 0.9);
act(function(){ setHoy("2026-08-06"); }, 0.5);
act(function(){ setHoy("2026-08-10"); }, 0.5);
act(function(){ setHoy("2026-08-13"); sfx("alert"); }, 0.6);
go("dashboard", "phone");
say("La alerta salta sola", "Nadie te la mandó: la app compara el día del mes con lo que ya generaste. El alquiler venció hace 8 días y todavía no está cargado.", "bl", 4.0);
spot("@alertas", 2.2, 8);
unspot();
tap("@alerta-plant-p1", function(){
  S.modal = "generar";
  S.gen = {p1:true, p2:true, p3:false};
  S.genMonto = {};
  S.device = "desktop"; S.route = "movimientos"; dirty();
}, 1.0);
say("", "Internet todavía no debitó, así que queda destildado. Los otros dos se generan con la fecha que les tocaba.", "bl", 3.2);
type("gen-p1", "534200", 1.1);
say("El estimado se corrige", "La plantilla decía $520.000. Vino $534.200. Escribís el real y listo.", "bl", 2.8);
tap("@btn-crear-pendientes", function(){
  const alq = JSON.parse(JSON.stringify(M.alquiler)); alq.monto = 534200;
  addMov(alq); addMov(M.gimnasio); closeModal(); sfx("cash");
}, 1.0);
say("", "Dos movimientos creados, dos cuentas movidas. Y la alerta se apagó.", "bl", 2.6);
spot("#hud .hud-grp:first-of-type", 2.0, 8);
unspot(); hush();

// ── 5 · Compartido y el otro lado ───────────────────────────────────────────
chapter(4);
act(function(){ setHoy("2026-08-16"); }, 0.4);
go("movimientos", "desktop");
tap("@btn-nuevo-mov", openModal("movimiento", {tipo:"Egreso",moneda:"ARS",monto:"128000",
  categoria:"Alimentos",subcategoria:"Carnicería",concepto:"Asado",clasificacion:"Variable",
  necesidad:3,metodo:"Crédito",debita:"Tarjeta",tarjeta:"VISA Galicia"}), 0.9);
tap("@chk-compartido", function(){ S.form.compartido = true; dirty(); }, 0.8);
say("Compartido", "Pagaste vos, pero eran tres. Cargás el total una sola vez y MANGO reparte.", "bl", 3.0);
tap("@btn-guardar", function(){ addMov(M.asado); closeModal(); sfx("ok"); }, 0.9);
spot('@barra-m15', 2.4, 8);
say("", "En el resumen de tu VISA entra el total. En <b>tus</b> gastos del mes cuenta sólo tu parte: $42.667.", "bl", 3.4);
unspot(); hush();

act(function(){ S.device = "phone"; S.route = "dashboard"; S.route2 = "balances"; S.hud = false;
  dirty(); sfx("whoosh"); }, 0.9);
say("El otro lado", "Colo tiene la misma app. No le mandás nada: la deuda le aparece sola.", "bc", 3.0);
act(function(){ S.notif2 = true; dirty(); sfx("alert"); }, 0.8);
wait(1.4);
tap('#scrPhone2 [data-k="btn-saldar-colo"]', function(){
  setHoy("2026-08-18");
  const asado = S.movs.find(function(m){ return m.id === "m15"; });
  asado.participantes[0].estado = "cobrado";
  addMov(M.cobroColo);
  S.toast2 = "Deuda saldada"; sfx("cash");
}, 1.2);
wait(1.3);
act(function(){ S.toast2 = null; S.route2 = null; S.device = "desktop"; S.route = "movimientos";
  S.hud = true; dirty(); sfx("whoosh"); }, 0.9);
spot('@barra-m15', 2.4, 8);
say("", "Colo transfirió y del otro lado se marcó solo: <b>1 de 2 cobrado</b>. Rulo todavía debe.", "bl", 3.0);
unspot(); hush();
act(function(){ addMov(M.peajes); addMov(M.farmAmex); addMov(M.devol); }, 0.6);

// ── 6 · El resumen y cómo se paga ───────────────────────────────────────────
chapter(5);
say("Pasan los días…", "", "bc", 0.8);
act(function(){ setHoy("2026-08-18"); }, 0.4);
act(function(){ setHoy("2026-08-21"); sfx("alert"); }, 0.6);
go("tarjetas", "desktop");
say("Cerró el ciclo", "El 20 cerró la VISA. Todo lo que cargaste entre el 21 de julio y el 20 de agosto es este resumen — ni un peso más.", "bl", 3.6);
spot('@tar-t1', 2.2, 8);
unspot();
tap("@ver-t1", function(){ S.route = "tarjeta"; }, 1.0);
say("Dos resúmenes, una tarjeta", "Pesos y dólares por separado. Y esa devolución de percepciones no es un gasto: es un crédito que <b>resta</b>.", "bl", 3.8);
spot('@resumen-USD', 2.4, 8);
unspot(); hush();
tap("@btn-pagar", function(){ S.modal = "pagar"; S.pago = {}; dirty(); }, 1.0);
say("Qué se paga y qué no", "Consumos, menos lo que ya salió de una cuenta, menos las devoluciones, menos lo ya pagado. Lo que queda es el pendiente.", "bl", 3.8);
type("pago-ARS", "373800", 1.2);
type("pago-USD", "30", 0.7);
say("Pago parcial", "Si ponés menos que el pendiente, te lo dice y guarda el saldo para el próximo resumen.", "bl", 3.0);
spot('@parcial-USD', 1.8, 8);
unspot();
interactive("Probá otro monto en USD");
wait(0.6);
endInteractive();
type("pago-USD", "54.74", 0.8);
tap("@btn-registrar-pago", function(){
  addMov(M.pagoARS); addMov(M.pagoUSD); setHoy("2026-08-25"); closeModal(); sfx("cash");
}, 1.1);
say("", "Un movimiento por moneda: sale de la cuenta que corresponde y la tarjeta queda saldada.", "bl", 3.0);
spot("#hud", 2.4, 6);
unspot(); hush();
go("tarjetas");
spot('@tar-t1', 2.2, 8);
say("", "La VISA ya figura <b>Pagada</b>. Las otras dos siguen su propio ciclo.", "bl", 2.6);
unspot(); hush();

// ── 7 · El viaje ────────────────────────────────────────────────────────────
chapter(6);
act(function(){ setHoy("2026-08-30"); }, 0.4);
go("compartido", "desktop");
tap("@btn-nuevo-proyecto", openModal("proyecto", {ptipo:"viaje"}), 0.9);
type("nombre", "Fin de semana en la montaña", 1.5);
tap("@mem-0", function(){ S.form.mem0 = true; dirty(); }, 0.6);
tap("@mem-1", function(){ S.form.mem1 = true; dirty(); }, 0.5);
tap("@mem-2", function(){ S.form.mem2 = true; dirty(); }, 0.5);
tap("@btn-crear-proyecto", function(){
  S.proyecto = {id:"pr1", nombre:"Fin de semana en la montaña", gastos:[], saldado:false};
  closeModal(); S.route = "proyecto"; sfx("ok");
}, 1.0);
say("Cuatro personas, un viaje", "Cada uno paga lo que le toca pagar. Nadie lleva la cuenta en una servilleta.", "bl", 3.0);
tap("@btn-cargar-gasto", openModal("gasto", {entre:{g0:1,g1:1,g2:1,g3:1}}), 0.9);
type("concepto", "Cabañas", 0.7);
type("monto", "420000", 0.8);
pick("pagador", "Vos");
tap("@btn-guardar-gasto", function(){ S.proyecto.gastos.push("vg1"); closeModal(); sfx("ok"); }, 0.9);
hush();
tap("@btn-cargar-gasto", openModal("gasto", {concepto:"Nafta",monto:"95000",pagador:"Rulo",
  entre:{g0:1,g1:1,g2:1,g3:1}}), 0.7);
tap("@btn-guardar-gasto", function(){ S.proyecto.gastos.push("vg2"); closeModal(); sfx("ok"); }, 0.6);
tap("@btn-cargar-gasto", openModal("gasto", {concepto:"Supermercado",monto:"138000",pagador:"Colo",
  entre:{g0:1,g1:1,g2:1,g3:1}}), 0.7);
tap("@btn-guardar-gasto", function(){ S.proyecto.gastos.push("vg3"); closeModal(); sfx("ok"); }, 0.6);
tap("@btn-cargar-gasto", openModal("gasto", {concepto:"Peajes",monto:"24000",pagador:"Peque",
  entre:{g0:1,g1:1,g2:1,g3:1}}), 0.7);
tap("@btn-guardar-gasto", function(){ S.proyecto.gastos.push("vg4"); closeModal(); sfx("ok"); }, 0.6);
say("", "Pagó Rulo, pagó Colo, pagó Peque. El saldo de arriba se recalcula con cada gasto.", "bl", 2.8);
spot('@saldos', 2.2, 8);
unspot();
tap("@btn-cargar-gasto", openModal("gasto", {concepto:"Cena",monto:"86000",pagador:"Vos",
  entre:{g0:1,g1:1,g2:1,g3:1}}), 0.8);
tap("@entre-g3", function(){ S.form.entre = {g0:1,g1:1,g2:1}; dirty(); }, 0.9);
say("No siempre se divide entre todos", "Peque no fue a la cena. La destildás y esa noche se reparte entre tres.", "bl", 3.0);
tap("@btn-guardar-gasto", function(){ S.proyecto.gastos.push("vg5"); closeModal(); sfx("ok"); }, 0.9);
hush();
spot('@saldos', 2.0, 8);
say("Como Splitwise, pero adentro", "Cuatro personas, cinco gastos, doce deudas cruzadas posibles. MANGO las reduce a <b>tres transferencias</b> y ahí se termina.", "bl", 4.2);
interactive("Mirá los saldos");
wait(0.5);
endInteractive();
unspot();
tap("@btn-saldar", function(){ S.proyecto.saldado = true; sfx("coins"); }, 1.0);
toast("Deudas generadas", 1.6); untoast(); hush();

// ── 8 · Estadísticas ────────────────────────────────────────────────────────
chapter(7);
act(function(){ setHoy("2026-08-31"); S.hud = false; dirty(); }, 0.4);
go("estadisticas", "desktop");
say("El mes entero", "Todo lo que cargaste, agrupado. Y acá está lo bueno: es la misma plata vista de cuatro maneras.", "bl", 3.4);
spot('@torta', 2.0, 10);
unspot();
act(function(){ S.stats.corte = "metodo"; dirty(); sfx("tap"); }, 0.4);
say("Por medio de pago", "Cuánto se fue en crédito, cuánto en débito, cuánto en efectivo.", "bl", 2.6);
act(function(){ S.stats.corte = "cuenta"; dirty(); sfx("tap"); }, 0.4);
say("Por cuenta", "De dónde salió cada peso: qué cuenta y qué tarjeta bancaron el mes.", "bl", 2.6);
act(function(){ S.stats.corte = "necesidad"; dirty(); sfx("tap"); }, 0.4);
say("Por necesidad", "El corte incómodo: cuánto de lo que gastaste era imprescindible y cuánto no.", "bl", 3.0);
interactive("Cambiá el corte, el mes o la moneda");
wait(0.8);
endInteractive();
act(function(){ S.stats.corte = "categoria"; dirty(); }, 0.3);
go("dashboard", "desktop");
act(function(){ S.hud = true; dirty(); }, 0.3);
say("Y arriba, el número que importa", "Patrimonio en las dos monedas, ingresos, gastos y cuánto ahorraste. Comparado con el mes pasado.", "bl", 3.4);
spot('@hero', 2.6, 8);
interactive("Tocá una moneda del hero");
wait(0.6);
endInteractive();
unspot(); hush();

// ── 9 · Cierre ──────────────────────────────────────────────────────────────
push({dur:1.2, done:function(){ setChapter(null); setSpot(null); setCallout(null);
  $("#outro").classList.add("on"); elCur.classList.add("off"); }});
wait(4.5);

/* ── Tiempos acumulados ─────────────────────────────────────────────────── */
const ST = []; let acc = 0;
SCRIPT.forEach(function(s){ ST.push({start:acc, dur:s.dur, end:acc+s.dur}); acc += s.dur; });
const TOTAL = acc;
const CH_START = [];
SCRIPT.forEach(function(s,i){
  if (s.__ch !== undefined) CH_START[s.__ch] = ST[i].start;
});
