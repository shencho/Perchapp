
<script>
(function(){
"use strict";

/* ═══════════════════════════════════════════════════════════════════════════
   1. DOMINIO — puertos 1:1 de lib/domain/*. Misma aritmética que la app.
   ═══════════════════════════════════════════════════════════════════════════ */

// lib/domain/_utils/dates.ts
function clampDay(y,m,d){ const last=new Date(y,m+1,0).getDate(); return new Date(y,m,Math.min(d,last)); }
function addDays(d,n){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); }
function toLocalISO(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function parseISO(s){ return new Date(s+"T12:00:00"); }
function r2(n){ return Math.round(n*100)/100; }

// lib/domain/calcularConsumoTarjeta.ts
function getCicloDelProximoVencimiento(cierre_dia, vencimiento_dia, hoy){
  const hoyY=hoy.getFullYear(), hoyM=hoy.getMonth(), hoyD=hoy.getDate();
  const vtoDate = hoyD<=vencimiento_dia ? clampDay(hoyY,hoyM,vencimiento_dia)
                                        : clampDay(hoyY,hoyM+1,vencimiento_dia);
  let finDate = clampDay(vtoDate.getFullYear(), vtoDate.getMonth(), cierre_dia);
  if (finDate >= vtoDate) finDate = clampDay(vtoDate.getFullYear(), vtoDate.getMonth()-1, cierre_dia);
  const prevCierre = clampDay(finDate.getFullYear(), finDate.getMonth()-1, cierre_dia);
  const inicioDate = addDays(prevCierre,1);
  const hoyMid = new Date(hoyY,hoyM,hoyD);
  return { inicio:toLocalISO(inicioDate), fin:toLocalISO(finDate),
           fechaVencimiento:toLocalISO(vtoDate), cicloAbierto: finDate>hoyMid };
}

/** total − yaDescontado − devoluciones − yaPagado = aPagar (por moneda). */
function calcularSaldoTarjeta(tarjetaId, movimientos, inicio, fin, finPagos){
  const out={};
  const dame=(mo)=> out[mo] || (out[mo]={total:0,yaDescontado:0,devoluciones:0,yaPagado:0,aPagar:0});
  const topePagos = finPagos || fin;
  for (const m of movimientos){
    if (m.tarjeta_id !== tarjetaId) continue;
    if (m.tipo === "Egreso"){
      if (m.fecha < inicio || m.fecha > fin) continue;
      const a=dame(m.moneda); a.total+=m.monto; if (m.cuenta_id) a.yaDescontado+=m.monto;
      continue;
    }
    if (m.tipo === "Ingreso"){
      if (m.fecha < inicio || m.fecha > fin) continue;
      dame(m.moneda).devoluciones += m.monto; continue;
    }
    if (m.tipo === "Transferencia" && !m.cuenta_destino_id){
      if (m.fecha < inicio || m.fecha > topePagos) continue;
      dame(m.moneda).yaPagado += m.monto;
    }
  }
  for (const k in out){ const a=out[k];
    a.aPagar = Math.max(0, Math.round((a.total-a.yaDescontado-a.devoluciones-a.yaPagado)*100)/100); }
  return out;
}

// lib/domain/calcularBalanceGrupal.ts — netos + transferencias mínimas (greedy)
const USUARIO_KEY="__usuario__", EPS=0.005;
function calcularBalanceGrupal(pagadores, participantes, nombreUsuario){
  nombreUsuario = nombreUsuario || "Vos";
  const mapa=new Map();
  const key=(id)=> id===null||id===undefined ? USUARIO_KEY : id;
  const nom=(id,n)=> (id===null||id===undefined) ? nombreUsuario : n;
  for (const p of pagadores){ const k=key(p.personaId); const e=mapa.get(k);
    if(e) e.pagado+=p.montoPagado; else mapa.set(k,{nombre:nom(p.personaId,p.nombre),pagado:p.montoPagado,consumido:0}); }
  for (const c of participantes){ const k=key(c.personaId); const e=mapa.get(k);
    if(e) e.consumido+=c.montoConsumido; else mapa.set(k,{nombre:nom(c.personaId,c.nombre),pagado:0,consumido:c.montoConsumido}); }
  const personas=[];
  mapa.forEach((v,k)=> personas.push({ personaId: k===USUARIO_KEY?null:k, nombre:v.nombre,
    pagado:r2(v.pagado), consumido:r2(v.consumido), neto:r2(v.pagado-v.consumido) }));
  const acreedores = personas.filter(p=>p.neto>EPS)
    .map(p=>({personaId:p.personaId,nombre:p.nombre,saldo:p.neto})).sort((a,b)=>b.saldo-a.saldo);
  const deudores = personas.filter(p=>p.neto<-EPS)
    .map(p=>({personaId:p.personaId,nombre:p.nombre,saldo:p.neto})).sort((a,b)=>a.saldo-b.saldo);
  const transferencias=[]; let ia=0, id=0;
  while (ia<acreedores.length && id<deudores.length){
    const acr=acreedores[ia], deu=deudores[id];
    const monto=r2(Math.min(acr.saldo, Math.abs(deu.saldo)));
    if (monto>EPS) transferencias.push({ deudorId:deu.personaId, deudorNombre:deu.nombre,
      acreedorId:acr.personaId, acreedorNombre:acr.nombre, monto });
    acr.saldo=r2(acr.saldo-monto); deu.saldo=r2(deu.saldo+monto);
    if (acr.saldo<=EPS) ia++; if (deu.saldo>=-EPS) id++;
  }
  const totalPagado=r2(personas.reduce((s,p)=>s+p.pagado,0));
  const totalConsumido=r2(personas.reduce((s,p)=>s+p.consumido,0));
  return { personas, transferencias, totalPagado, totalConsumido,
           hayDesbalance: Math.abs(totalPagado-totalConsumido)>0.01 };
}

// lib/domain/plantillas.ts
function getPlantillasPendientesDelMes(plantillas, movimientos, hoy){
  const hoyY=hoy.getFullYear(), hoyM=hoy.getMonth(), hoyD=hoy.getDate();
  const inicioMes=toLocalISO(new Date(hoyY,hoyM,1)), finMes=toLocalISO(new Date(hoyY,hoyM+1,0));
  return plantillas.filter(p=>p.activo)
    .filter(p=> !(p.fecha_inicio>finMes) && !(p.fecha_fin && p.fecha_fin<inicioMes))
    .filter(p=> !movimientos.some(m=> m.plantilla_id===p.id && m.fecha>=inicioMes && m.fecha<=finMes))
    .map(p=>{ const f=clampDay(hoyY,hoyM,p.dia_mes);
      const dr=f.getDate()-hoyD;
      return {plantilla:p, fechaEsperada:toLocalISO(f), diasRestantes:dr, atrasada:dr<0}; })
    .sort((a,b)=> a.plantilla.dia_mes-b.plantilla.dia_mes);
}
function getPlantillasParaAlerta(plantillas, movimientos, hoy){
  return getPlantillasPendientesDelMes(plantillas,movimientos,hoy)
    .filter(p=> p.atrasada || (p.diasRestantes>=0 && p.diasRestantes<=3));
}

// lib/domain/finanzas.ts — criterio único de ingresos/gastos
function cuentaEnTotales(m){
  if (m.tipo==="Transferencia") return false;
  if (m.tipo==="Ingreso" && m.es_reembolso) return false;
  return true;
}
function montoParaTotales(m){
  if (m.tipo!=="Egreso") return m.monto;
  return (m.es_compartido && m.gc_mi_parte!=null) ? m.gc_mi_parte : m.monto;
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. FORMATO
   ═══════════════════════════════════════════════════════════════════════════ */
const fmtCache={};
function nf(moneda,dec){ const k=moneda+dec;
  return fmtCache[k] || (fmtCache[k]=new Intl.NumberFormat("es-AR",
    {style:"currency",currency:moneda,minimumFractionDigits:dec,maximumFractionDigits:dec})); }
function fmt(n,moneda){ return nf(moneda||"ARS",0).format(n); }
function fmt2(n,moneda){ return nf(moneda||"ARS",2).format(n); }
function fmtDia(iso){ return parseISO(iso).toLocaleDateString("es-AR",{day:"2-digit",month:"short"}).replace(".",""); }
function fmtDate(iso){ return parseISO(iso).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit"}); }
function fmtLargo(iso){ return parseISO(iso).toLocaleDateString("es-AR",{day:"numeric",month:"long"}); }
function mesLabel(am){ return parseISO(am+"-01").toLocaleDateString("es-AR",{month:"short",year:"numeric"}).replace(".",""); }

/* ═══════════════════════════════════════════════════════════════════════════
   3. DATOS FICTICIOS
   Personas: apodos. Conceptos: genéricos. Bancos y marcas: como los tipearía
   el usuario en el campo "Banco emisor" — sin logos ni branding ajeno.
   ═══════════════════════════════════════════════════════════════════════════ */

const ARRANQUE = "2026-08-01";   // saldo_inicial vale a esta fecha

const CATS = [
  ["ali","Alimentos","Egreso",null],
    ["ali-sup","Supermercado","Egreso","ali"],["ali-res","Restaurantes","Egreso","ali"],
    ["ali-del","Delivery","Egreso","ali"],["ali-ver","Verdulería","Egreso","ali"],
    ["ali-car","Carnicería","Egreso","ali"],["ali-pes","Pescadería","Egreso","ali"],
    ["ali-fia","Fiambrería","Egreso","ali"],["ali-pan","Panadería","Egreso","ali"],
  ["hog","Hogar","Egreso",null],
    ["hog-ser","Servicios","Egreso","hog"],["hog-man","Mantenimiento","Egreso","hog"],
    ["hog-alq","Alquiler/Expensas","Egreso","hog"],["hog-dec","Decoración","Egreso","hog"],
    ["hog-equ","Equipamiento","Egreso","hog"],
  ["cui","Cuidado personal","Egreso",null], ["cui-ind","Indumentaria","Egreso","cui"],
  ["sal","Salud","Egreso",null], ["sal-med","Médicos","Egreso","sal"], ["sal-far","Farmacia","Egreso","sal"],
  ["tra","Transporte","Egreso",null],
    ["tra-com","Combustible","Egreso","tra"],["tra-tra","Traslados","Egreso","tra"],
    ["tra-pea","Peajes","Egreso","tra"],
  ["soc","Social","Egreso",null], ["soc-sal","Salidas","Egreso","soc"], ["soc-jun","Juntadas","Egreso","soc"],
  ["via","Viajes","Egreso",null],
    ["via-hos","Hospedaje","Egreso","via"],["via-com","Comidas","Egreso","via"],
    ["via-tra","Traslados","Egreso","via"],
  ["sus","Suscripciones","Egreso",null],
    ["sus-str","Streaming","Egreso","sus"],["sus-sof","Software","Egreso","sus"],
  ["dep","Deportes","Egreso",null], ["dep-gim","Gimnasio","Egreso","dep"],
  ["hab","Haberes","Ingreso",null], ["hab-sue","Sueldo","Ingreso","hab"],
  ["ven","Ventas","Ingreso",null],
  ["ree","Reembolsos","Ingreso",null],
].map(function(c){ return {id:c[0],nombre:c[1],tipo:c[2],parent_id:c[3]}; });

/** Catálogo del modal de onboarding — lib/templates/catalogos.ts (recortado
 *  a lo que se ve en pantalla). `pick` marca lo que la demo tilda. */
const TEMPLATE = [
  {n:"Alimentos", subs:["Supermercado","Restaurantes","Delivery","Verdulería","Carnicería","Pescadería","Fiambrería","Panadería"], pick:"all"},
  {n:"Hogar", subs:["Servicios","Mantenimiento","Alquiler/Expensas","Decoración","Equipamiento"], pick:"all"},
  {n:"Familia", subs:["Hijo 1","Hijo 2","Hijos en general","Pareja","Padres"], pick:[]},
  {n:"Cuidado personal", subs:["Peluquería","Estética","Indumentaria"], pick:[2]},
  {n:"Salud", subs:["Obra social","Médicos","Estudios","Psicólogo","Farmacia"], pick:[1,4]},
  {n:"Transporte", subs:["Combustible","Estacionamiento","Lavado","Mantenimiento","Seguro Auto","Seguro Moto","Traslados","Peajes"], pick:[0,6,7]},
  {n:"Educación", subs:["Cursos","Libros","Universidad","Colegio"], pick:[]},
  {n:"Mascotas", subs:["Veterinario","Alimento","Accesorios","Peluquería"], pick:[]},
  {n:"Social", subs:["Salidas","Juntadas","Regalos","Cumpleaños"], pick:[0,1]},
  {n:"Viajes", subs:["Pasajes","Hospedaje","Comidas","Actividades","Seguro de viaje","Traslados"], pick:[1,2,5]},
  {n:"Suscripciones", subs:["Streaming","Música","Software","Cursos online","Diarios/revistas","Compras recurrentes"], pick:[0,2]},
  {n:"Deportes", subs:["Club","Gimnasio","Equipamiento","Clases"], pick:[1]},
  {n:"Fiscales", subs:["Impuestos","Monotributo","Sellos","ARBA","AFIP"], pick:[]},
];

const CUENTAS = [
  {id:"c1", nombre:"Caja de ahorro Galicia", tipo:"banco",    moneda:"ARS", inicial:1200000},
  {id:"c2", nombre:"Mercado Pago",           tipo:"otro",     moneda:"ARS", inicial:180000},
  {id:"c3", nombre:"Efectivo",               tipo:"efectivo", moneda:"ARS", inicial:95000},
  {id:"c4", nombre:"Caja de ahorro Santander",tipo:"banco",   moneda:"USD", inicial:3400},
];

const TARJETAS = [
  {id:"t1", nombre:"VISA Galicia",         banco:"Galicia",   u4:"4417", cierre:20, vto:10, limARS:1500000, limUSD:1200, pago:"c1"},
  {id:"t2", nombre:"Mastercard Santander", banco:"Santander", u4:"8032", cierre:15, vto:2,  limARS:900000,  limUSD:null, pago:"c1"},
  {id:"t3", nombre:"Amex Galicia",         banco:"Galicia",   u4:"2290", cierre:5,  vto:22, limARS:600000,  limUSD:null, pago:"c1"},
];

const PLANTILLAS = [
  {id:"p1", nombre:"Alquiler",  tipo:"Egreso", monto_estimado:520000, moneda:"ARS", dia_mes:5,
   metodo:"Débito automático", debita_de:"cuenta", cuenta_id:"c1", categoria_id:"hog-alq",
   clasificacion:"Fijo", activo:true, fecha_inicio:"2026-01-05"},
  {id:"p2", nombre:"Gimnasio",  tipo:"Egreso", monto_estimado:45000,  moneda:"ARS", dia_mes:8,
   metodo:"Débito automático", debita_de:"cuenta", cuenta_id:"c2", categoria_id:"dep-gim",
   clasificacion:"Fijo", activo:true, fecha_inicio:"2026-01-08"},
  {id:"p3", nombre:"Internet",  tipo:"Egreso", monto_estimado:38000,  moneda:"ARS", dia_mes:15,
   metodo:"Débito automático", debita_de:"cuenta", cuenta_id:"c1", categoria_id:"hog-ser",
   clasificacion:"Fijo", activo:true, fecha_inicio:"2026-01-15"},
];

/** Historial de julio: no mueve saldos (son anteriores a ARRANQUE) pero da el
 *  mes anterior del hero y la torta del mes previo en Estadísticas. */
const HISTORIAL = [
  ["j01","2026-07-01","Ingreso","Sueldo",1380000,"ARS","hab-sue","c1",null,"Transferencia","Fijo",null],
  ["j02","2026-07-03","Egreso","Alquiler",520000,"ARS","hog-alq","c1",null,"Débito automático","Fijo",5],
  ["j03","2026-07-04","Egreso","Supermercado",94200,"ARS","ali-sup","c2",null,"Débito","Variable",5],
  ["j04","2026-07-05","Ingreso","Trabajo independiente",420,"USD","ven","c4",null,"Transferencia","Variable",null],
  ["j05","2026-07-08","Egreso","Gimnasio",45000,"ARS","dep-gim","c2",null,"Débito automático","Fijo",3],
  ["j06","2026-07-09","Egreso","Streaming",12.99,"USD","sus-str","c4",null,"Débito automático","Fijo",2],
  ["j07","2026-07-10","Egreso","Nafta",48000,"ARS","tra-com","c3",null,"Efectivo","Variable",4],
  ["j08","2026-07-12","Egreso","Luz",61000,"ARS","hog-ser","c1",null,"Débito automático","Fijo",5],
  ["j09","2026-07-14","Egreso","Delivery",31500,"ARS","ali-del","c2",null,"Débito","Variable",2],
  ["j10","2026-07-18","Egreso","Consulta médica",38000,"ARS","sal-med","c1",null,"Transferencia","Variable",5],
  ["j11","2026-07-20","Egreso","Equipamiento",183000,"ARS","hog-equ","c1",null,"Transferencia","Variable",3],
  ["j12","2026-07-21","Egreso","Traslados",22400,"ARS","tra-tra","c3",null,"Efectivo","Variable",3],
].map(function(a){ return {id:a[0],fecha:a[1],tipo:a[2],concepto:a[3],monto:a[4],moneda:a[5],
  categoria_id:a[6],cuenta_id:a[7],tarjeta_id:a[8],metodo:a[9],clasificacion:a[10],necesidad:a[11],
  frecuencia:"Corriente",cuenta_destino_id:null,historial:true}; });

/** Movimientos que la demo va cargando, en el orden del guion. */
function mov(o){
  return Object.assign({ moneda:"ARS", categoria_id:null, cuenta_id:null, cuenta_destino_id:null,
    tarjeta_id:null, metodo:null, clasificacion:"Variable", frecuencia:"Corriente",
    necesidad:null, cuotas:1, cuota_numero:null, es_compartido:false, gc_mi_parte:null,
    participantes:null, plantilla_id:null, es_reembolso:false, descripcion:null }, o);
}

const M = {
  // Consumo de tarjeta previo, ya dentro del ciclo VISA que se paga después.
  farmacia : mov({id:"m01",fecha:"2026-07-25",tipo:"Egreso",concepto:"Farmacia",monto:34800,
                  categoria_id:"sal-far",tarjeta_id:"t1",metodo:"Crédito",necesidad:5}),
  sueldo   : mov({id:"m02",fecha:"2026-08-01",tipo:"Ingreso",concepto:"Sueldo",monto:1450000,
                  categoria_id:"hab-sue",cuenta_id:"c1",metodo:"Transferencia",clasificacion:"Fijo"}),
  super1   : mov({id:"m03",fecha:"2026-08-02",tipo:"Egreso",concepto:"Supermercado",monto:86400,
                  categoria_id:"ali-sup",cuenta_id:"c2",metodo:"Débito",necesidad:5}),
  softAmex : mov({id:"m19",fecha:"2026-08-02",tipo:"Egreso",concepto:"Software",monto:29900,
                  categoria_id:"sus-sof",tarjeta_id:"t3",metodo:"Crédito",clasificacion:"Fijo",necesidad:3}),
  nafta    : mov({id:"m04",fecha:"2026-08-03",tipo:"Egreso",concepto:"Nafta",monto:52000,
                  categoria_id:"tra-com",cuenta_id:"c3",metodo:"Efectivo",necesidad:4}),
  indum    : mov({id:"m05",fecha:"2026-08-05",tipo:"Egreso",concepto:"Indumentaria",monto:80000,
                  categoria_id:"cui-ind",tarjeta_id:"t1",metodo:"Crédito",clasificacion:"Cuotas",
                  frecuencia:"No corriente",cuotas:3,cuota_numero:1,necesidad:2,
                  descripcion:"Total $240.000 en 3 cuotas"}),
  streaming: mov({id:"m06",fecha:"2026-08-07",tipo:"Egreso",concepto:"Streaming",monto:12.99,
                  moneda:"USD",categoria_id:"sus-str",tarjeta_id:"t1",metodo:"Crédito",
                  clasificacion:"Fijo",necesidad:2}),
  delivery : mov({id:"m07",fecha:"2026-08-08",tipo:"Egreso",concepto:"Delivery",monto:23500,
                  categoria_id:"ali-del",tarjeta_id:"t2",metodo:"Crédito",necesidad:2}),
  super2   : mov({id:"m08",fecha:"2026-08-09",tipo:"Egreso",concepto:"Supermercado",monto:112400,
                  categoria_id:"ali-sup",tarjeta_id:"t1",metodo:"Crédito",necesidad:5}),
  software : mov({id:"m09",fecha:"2026-08-10",tipo:"Egreso",concepto:"Software",monto:45,
                  moneda:"USD",categoria_id:"sus-sof",tarjeta_id:"t1",metodo:"Crédito",
                  frecuencia:"No corriente",necesidad:3}),
  freelance: mov({id:"m10",fecha:"2026-08-11",tipo:"Ingreso",concepto:"Trabajo independiente",
                  monto:500,moneda:"USD",categoria_id:"ven",cuenta_id:"c4",metodo:"Transferencia"}),
  luz      : mov({id:"m11",fecha:"2026-08-12",tipo:"Egreso",concepto:"Luz",monto:65000,
                  categoria_id:"hog-ser",tarjeta_id:"t2",metodo:"Crédito",clasificacion:"Fijo",necesidad:5}),
  // Recurrentes generadas desde el modal (fecha = fechaEsperada de la plantilla)
  alquiler : mov({id:"m12",fecha:"2026-08-05",tipo:"Egreso",concepto:"Alquiler",monto:520000,
                  categoria_id:"hog-alq",cuenta_id:"c1",metodo:"Débito automático",
                  clasificacion:"Fijo",necesidad:5,plantilla_id:"p1"}),
  gimnasio : mov({id:"m13",fecha:"2026-08-08",tipo:"Egreso",concepto:"Gimnasio",monto:45000,
                  categoria_id:"dep-gim",cuenta_id:"c2",metodo:"Débito automático",
                  clasificacion:"Fijo",necesidad:3,plantilla_id:"p2"}),
  // Compartido
  asado    : mov({id:"m15",fecha:"2026-08-16",tipo:"Egreso",concepto:"Asado",monto:128000,
                  categoria_id:"ali-car",tarjeta_id:"t1",metodo:"Crédito",necesidad:3,
                  es_compartido:true, gc_mi_parte:42666.66,
                  participantes:[{id:"pa-colo",nombre:"Colo",monto:42666.67,estado:"pendiente"},
                                 {id:"pa-rulo",nombre:"Rulo",monto:42666.67,estado:"pendiente"}]}),
  cobroColo: mov({id:"m15b",fecha:"2026-08-18",tipo:"Ingreso",concepto:"Cobro Asado",
                  monto:42666.67,categoria_id:"ree",cuenta_id:"c2",metodo:"Transferencia",
                  es_reembolso:true}),
  peajes   : mov({id:"m16",fecha:"2026-08-18",tipo:"Egreso",concepto:"Peajes",monto:18600,
                  categoria_id:"tra-pea",tarjeta_id:"t1",metodo:"Crédito",necesidad:4}),
  farmAmex : mov({id:"m20",fecha:"2026-08-19",tipo:"Egreso",concepto:"Farmacia",monto:18400,
                  categoria_id:"sal-far",tarjeta_id:"t3",metodo:"Crédito",necesidad:5}),
  devol    : mov({id:"m14",fecha:"2026-08-14",tipo:"Ingreso",concepto:"Devolución de percepciones",
                  monto:3.25,moneda:"USD",categoria_id:"ree",tarjeta_id:"t1",es_reembolso:true}),
  // Pago del resumen: Transferencia con tarjeta y SIN cuenta destino
  pagoARS  : mov({id:"m17",fecha:"2026-08-25",tipo:"Transferencia",concepto:"Pago resumen VISA Galicia",
                  monto:373800,cuenta_id:"c1",tarjeta_id:"t1",
                  descripcion:"Resumen $373.800"}),
  pagoUSD  : mov({id:"m18",fecha:"2026-08-25",tipo:"Transferencia",concepto:"Pago resumen VISA Galicia",
                  monto:54.74,moneda:"USD",cuenta_id:"c4",tarjeta_id:"t1",
                  descripcion:"Resumen US$ 54,74"}),
};

/** Viaje — cinco gastos, pagadores distintos, uno que no divide entre todos. */
const MIEMBROS = [
  {id:"g0", nombre:"Vos",   usuario:true,  color:"#1e3a5f"},
  {id:"g1", nombre:"Colo",  usuario:false, color:"#c98a2b"},
  {id:"g2", nombre:"Rulo",  usuario:false, color:"#2f9e5f"},
  {id:"g3", nombre:"Peque", usuario:false, color:"#3b82f6"},
];
const VIAJE_GASTOS = [
  {id:"vg1", concepto:"Cabañas",     monto:420000, fecha:"2026-08-28", pagador:"g0", entre:["g0","g1","g2","g3"]},
  {id:"vg2", concepto:"Nafta",       monto:95000,  fecha:"2026-08-28", pagador:"g2", entre:["g0","g1","g2","g3"]},
  {id:"vg3", concepto:"Supermercado",monto:138000, fecha:"2026-08-29", pagador:"g1", entre:["g0","g1","g2","g3"]},
  {id:"vg4", concepto:"Peajes",      monto:24000,  fecha:"2026-08-29", pagador:"g3", entre:["g0","g1","g2","g3"]},
  {id:"vg5", concepto:"Cena",        monto:86000,  fecha:"2026-08-30", pagador:"g0", entre:["g0","g1","g2"]},
];

/* ═══════════════════════════════════════════════════════════════════════════
   4. ESTADO
   ═══════════════════════════════════════════════════════════════════════════ */

const S = {};
function resetState(){
  S.hoy = ARRANQUE;
  S.perfil = {nombre:"", email:"vos@ejemplo.com"};
  S.cats = [];              // ids importados
  S.cuentas = [];           // ids creados
  S.tarjetas = [];
  S.movs = HISTORIAL.slice();
  S.plantillas = [];
  S.proyecto = null;        // {creado, gastos:[], saldado}
  S.route = "login"; S.route2 = null;
  S.device = "desktop";   // el login es la pantalla ancha
  S.modal = null; S.sheet = null; S.toast = null;
  S.form = {};              // valores tipeados en el diálogo abierto
  S.picks = {};             // onboarding: "i:si" -> true
  S.stats = {corte:"categoria", tab:"egresos", moneda:"ARS", mes:"2026-08"};
  S.heroMoneda = null;      // null = ambas
  S.hud = false; S.hudFlash = {};
  S.spot = null; S.callout = null; S.chapter = -1;
  S.mic = false; S.notif2 = false; S.tag2 = null;
  S.interactive = null;     // {txt} → chip "tocá vos"
  S.pagoParcial = null;
  S.prevSaldos = {};
}

// ── Derivados ────────────────────────────────────────────────────────────────
const catById = {}; CATS.forEach(function(c){ catById[c.id]=c; });
const cueById = {}; CUENTAS.forEach(function(c){ cueById[c.id]=c; });
const tarById = {}; TARJETAS.forEach(function(t){ tarById[t.id]=t; });
const memById = {}; MIEMBROS.forEach(function(m){ memById[m.id]=m; });

function cuentasActivas(){ return CUENTAS.filter(function(c){ return S.cuentas.indexOf(c.id)>=0; }); }
function tarjetasActivas(){ return TARJETAS.filter(function(t){ return S.tarjetas.indexOf(t.id)>=0; }); }
function movsVisibles(){ return S.movs.filter(function(m){ return !m.oculto; }); }

/** saldo = inicial (al ARRANQUE) + movimientos desde ARRANQUE. */
function saldoCuenta(id){
  const c = cueById[id]; let s = c.inicial;
  for (const m of S.movs){
    if (m.fecha < ARRANQUE) continue;
    if (m.cuenta_id === id){
      if (m.tipo === "Ingreso") s += m.monto;
      else if (m.tipo === "Egreso" && !m.tarjeta_id) s -= m.monto;
      else if (m.tipo === "Egreso" && m.tarjeta_id) s -= m.monto; // consumo ya debitado
      else if (m.tipo === "Transferencia") s -= m.monto;
    }
    if (m.cuenta_destino_id === id && m.tipo === "Transferencia") s += (m.monto_destino || m.monto);
  }
  return r2(s);
}

/** Ciclo + saldo por moneda de una tarjeta al día de hoy. */
function resumenTarjeta(id){
  const t = tarById[id];
  const ciclo = getCicloDelProximoVencimiento(t.cierre, t.vto, parseISO(S.hoy));
  const saldos = calcularSaldoTarjeta(id, S.movs, ciclo.inicio, ciclo.fin, ciclo.fechaVencimiento);
  const consumo = {}; let algo = false, pagado = false;
  for (const mo in saldos){
    consumo[mo] = saldos[mo].aPagar;
    if (saldos[mo].total > 0) algo = true;
  }
  pagado = algo && Object.keys(consumo).every(function(k){ return consumo[k] <= 0.005; });
  return { ciclo, saldos, consumo, pagado, tarjeta:t };
}

/** Totales del mes por moneda, con el criterio de finanzas.ts. */
function totalesMes(am, moneda){
  let ing=0, egr=0;
  for (const m of S.movs){
    if (m.fecha.slice(0,7) !== am) continue;
    if (m.moneda !== moneda) continue;
    if (!cuentaEnTotales(m)) continue;
    if (m.tipo === "Ingreso") ing += montoParaTotales(m);
    else if (m.tipo === "Egreso") egr += montoParaTotales(m);
  }
  return {ingresos:r2(ing), egresos:r2(egr), balance:r2(ing-egr)};
}

function mesAnterior(am){ const d=parseISO(am+"-01");
  const p=new Date(d.getFullYear(), d.getMonth()-1, 1);
  return p.getFullYear()+"-"+String(p.getMonth()+1).padStart(2,"0"); }

function patrimonio(moneda){
  return r2(cuentasActivas().filter(function(c){return c.moneda===moneda;})
    .reduce(function(s,c){ return s+saldoCuenta(c.id); },0));
}

/** Balance del viaje con el algoritmo real. */
function balanceViaje(){
  if (!S.proyecto) return null;
  const pagadores=[], parts=[];
  for (const g of S.proyecto.gastos){
    const gd = VIAJE_GASTOS.find(function(x){return x.id===g;});
    pagadores.push({ personaId: gd.pagador==="g0"?null:gd.pagador,
                     nombre: memById[gd.pagador].nombre, montoPagado: gd.monto });
    const ids = gd.entre, base = r2(gd.monto/ids.length);
    ids.forEach(function(mid,i){
      parts.push({ personaId: mid==="g0"?null:mid, nombre: memById[mid].nombre,
        montoConsumido: i===0 ? r2(gd.monto - base*(ids.length-1)) : base });
    });
  }
  return calcularBalanceGrupal(pagadores, parts, "Vos");
}

/** Cortes de Estadísticas: la misma plata agrupada de cuatro maneras. */
function resumenCorte(am, moneda, tipo, corte){
  const filas = {}; let total = 0;
  for (const m of S.movs){
    if (m.fecha.slice(0,7) !== am || m.moneda !== moneda) continue;
    if (m.tipo !== tipo || !cuentaEnTotales(m)) continue;
    const monto = montoParaTotales(m); total += monto;
    let padreId, padreNom, hijoId=null, hijoNom=null;
    if (corte === "categoria"){
      const c = catById[m.categoria_id];
      if (!c){ padreId="__sin__"; padreNom="Sin categoría"; }
      else if (c.parent_id){ const p=catById[c.parent_id];
        padreId=p.id; padreNom=p.nombre; hijoId=c.id; hijoNom=c.nombre; }
      else { padreId=c.id; padreNom=c.nombre; hijoId="__dir__"; hijoNom="Sin subcategoría"; }
    } else if (corte === "metodo"){
      padreId = m.metodo || "__na__"; padreNom = m.metodo || "Sin medio";
      if (m.tarjeta_id){ hijoId=m.tarjeta_id; hijoNom=tarById[m.tarjeta_id].nombre; }
      else if (m.cuenta_id){ hijoId=m.cuenta_id; hijoNom=cueById[m.cuenta_id].nombre; }
    } else if (corte === "cuenta"){
      if (m.cuenta_id){ padreId=m.cuenta_id; padreNom=cueById[m.cuenta_id].nombre; }
      else if (m.tarjeta_id){ padreId=m.tarjeta_id; padreNom=tarById[m.tarjeta_id].nombre; }
      else { padreId="__na__"; padreNom="Sin cuenta"; }
      const c = catById[m.categoria_id];
      if (c){ hijoId=c.id; hijoNom=c.nombre; }
    } else { // necesidad
      const n = m.necesidad;
      padreId = n ? "n"+n : "__na__";
      padreNom = n ? ["Prescindible","Poco necesario","Necesario","Importante","Imprescindible"][n-1] : "Sin clasificar";
      const c = catById[m.categoria_id]; if (c){ hijoId=c.id; hijoNom=c.nombre; }
    }
    const f = filas[padreId] || (filas[padreId]={id:padreId,nombre:padreNom,monto:0,hijos:{}});
    f.monto += monto;
    if (hijoId){ f.hijos[hijoId] = f.hijos[hijoId] || {id:hijoId,nombre:hijoNom,monto:0};
      f.hijos[hijoId].monto += monto; }
  }
  const arr = Object.keys(filas).map(function(k){ return filas[k]; })
    .sort(function(a,b){ return b.monto-a.monto; })
    .map(function(f){
      return { id:f.id, nombre:f.nombre, monto:r2(f.monto),
        porcentaje: total>0 ? Math.round(f.monto/total*100) : 0,
        hijos: Object.keys(f.hijos).map(function(k){return f.hijos[k];})
          .sort(function(a,b){return b.monto-a.monto;})
          .map(function(h){ return {id:h.id,nombre:h.nombre,monto:r2(h.monto),
            porcentaje: f.monto>0 ? Math.round(h.monto/f.monto*100) : 0}; }) };
    });
  return {total:r2(total), filas:arr};
}

/** Alertas del inicio — textos de app/(app)/dashboard/page.tsx */
function alertas(){
  const out = [];
  const hoy = parseISO(S.hoy);
  tarjetasActivas().forEach(function(t){
    const r = resumenTarjeta(t.id);
    const conSaldo = Object.keys(r.consumo).filter(function(k){ return r.consumo[k] > 0; });
    if (!conSaldo.length || !r.ciclo.fechaVencimiento) return;
    const dias = Math.round((parseISO(r.ciclo.fechaVencimiento)-hoy)/86400000);
    if (dias > 7 || dias < 0) return;
    out.push({ id:"tarjeta-"+t.id, tipo:"tarjeta_vence", urgencia: dias<=3?"alta":"media",
      titulo:"Tarjeta "+t.nombre+" vence "+(dias===0?"hoy":"en "+dias+"d"),
      descripcion: conSaldo.map(function(k){ return fmt(r.consumo[k],k); }).join(" · ")
        +" por pagar"+(r.ciclo.cicloAbierto?" (ciclo en curso)":""), href:"tarjeta:"+t.id });
  });
  getPlantillasParaAlerta(S.plantillas, S.movs, hoy).forEach(function(p){
    const dias = Math.abs(p.diasRestantes);
    out.push({ id:"plant-"+p.plantilla.id,
      tipo: p.atrasada?"plantilla_atrasada":"plantilla_pendiente",
      urgencia: (p.atrasada || p.diasRestantes<=1) ? "alta":"media",
      titulo: p.atrasada ? p.plantilla.nombre+" sin generar (hace "+dias+"d)"
            : p.diasRestantes===0 ? p.plantilla.nombre+" debita hoy"
            : p.plantilla.nombre+" debita en "+dias+"d",
      descripcion: "~"+fmt(p.plantilla.monto_estimado)+" estimado",
      href:"generar:"+p.plantilla.id, silenciable:true });
  });
  return out;
}
