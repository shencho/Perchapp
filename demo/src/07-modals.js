
/* ═══════════════════════════════════════════════════════════════════════════
   8. DIÁLOGOS — mismos campos que los componentes reales
   ═══════════════════════════════════════════════════════════════════════════ */

/** Campo de texto que refleja S.form[k]; con caret si se está tipeando. */
function fv(k, ph, cls){
  const v = S.form[k];
  const focus = S.focus === k;
  const has = v !== undefined && v !== null && v !== "";
  return '<div class="inp '+(has?"":"plc")+(focus?" focus":"")+(cls?" "+cls:"")+
    '" data-k="f-'+k+'">'+(has?esc(v):esc(ph))+(focus?'<span class="caret"></span>':'')+'</div>';
}
function fsel(k, ph){
  const v = S.form[k];
  return '<div class="sel'+(S.focus===k?" focus":"")+'" data-k="f-'+k+'">'+
    '<span'+(v?'':' class="t-mut"')+'>'+esc(v||ph)+'</span>'+ico("down")+'</div>';
}
function fld(label, inner, flex){
  return '<div class="fld"'+(flex?' style="flex:'+flex+'"':'')+'><span class="lbl">'+label+'</span>'+inner+'</div>';
}
function dlg(title, body, footer, desc, w){
  return '<div class="dlg-back" data-k="backdrop"></div><div class="dlg"'+(w?' style="--dlgw:'+w+'px"':'')+'>'+
    '<div class="dlg-h"><div class="dlg-t">'+title+'</div>'+
    (desc?'<div class="dlg-d">'+desc+'</div>':'')+'</div>'+
    '<div class="dlg-b">'+body+'</div>'+
    '<div class="dlg-f">'+footer+'</div></div>';
}
function btnCancel(){ return '<span class="btn btn-ghost">Cancelar</span>'; }
function btnOk(txt,k){ return '<span class="btn btn-default" data-k="'+(k||"btn-guardar")+'">'+txt+'</span>'; }

// ── Importar categorías sugeridas ──────────────────────────────────────────
function mdImportar(){
  let body = '';
  TEMPLATE.forEach(function(cat,i){
    const subOn = cat.subs.map(function(_,si){ return !!S.picks[i+":"+si]; });
    const all = subOn.every(Boolean), some = subOn.some(Boolean);
    body += '<div data-k="cat-'+i+'">'+
      '<div class="row" style="gap:12px;padding:6px 0">'+
        '<span class="chk'+(all?" on":some?" half":"")+'" data-k="chk-'+i+'">'+(all?"✓":"")+'</span>'+
        '<span style="font-size:13.5px;font-weight:500">'+esc(cat.n)+'</span></div>'+
      '<div style="margin-left:28px;display:flex;flex-direction:column">'+
      cat.subs.map(function(s,si){
        const on = !!S.picks[i+":"+si];
        return '<div class="row" style="gap:12px;padding:4px 0" data-k="chk-'+i+'-'+si+'">'+
          '<span class="chk'+(on?" on":"")+'">'+(on?"✓":"")+'</span>'+
          '<span style="font-size:13px;color:'+(on?"var(--foreground)":"var(--muted-foreground)")+'">'+esc(s)+'</span></div>';
      }).join("")+'</div></div>';
  });
  const n = Object.keys(S.picks).filter(function(k){return S.picks[k];}).length;
  return '<div class="dlg-back"></div><div class="dlg" style="--dlgw:470px;max-height:92%">'+
    '<div class="dlg-h"><div class="dlg-t">Importar categorías sugeridas</div></div>'+
    '<div style="display:flex;border-bottom:1px solid var(--border);padding:0 22px;flex:none">'+
      '<span style="padding:8px 16px;font-size:13.5px;font-weight:500;border-bottom:2px solid var(--primary)">Egresos</span>'+
      '<span style="padding:8px 16px;font-size:13.5px;font-weight:500;color:var(--muted-foreground)">Ingresos</span></div>'+
    '<div class="dlg-b" style="padding:10px 22px;gap:0" data-k="lista-cats">'+body+'</div>'+
    '<div class="dlg-f">'+btnCancel()+
      '<span class="btn btn-default" data-k="btn-importar">Importar'+(n?" ("+n+")":"")+'</span></div></div>';
}
function mdImportadas(n){
  return '<div class="dlg-back"></div><div class="dlg" style="--dlgw:400px">'+
    '<div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:36px 26px">'+
      '<span class="t-succ">'+ico("check2","big")+'</span>'+
      '<div style="text-align:center"><div style="font-size:18px;font-weight:600">¡Listo!</div>'+
      '<div class="t-mut" style="font-size:13px;margin-top:4px">'+n+' categorías creadas</div></div>'+
      '<span class="btn btn-default" data-k="btn-cerrar">Cerrar</span></div></div>';
}

// ── Nueva cuenta ───────────────────────────────────────────────────────────
function mdCuenta(){
  return dlg("Nueva cuenta",
    fld("Nombre", fv("nombre","Ej: Caja de ahorro"))+
    '<div class="row" style="gap:12px">'+fld("Tipo",fsel("tipo","Banco"),1)+fld("Moneda",fsel("moneda","ARS"),1)+'</div>'+
    fld("Saldo inicial", fv("saldo","0","right"))+
    '<div class="t-mut" style="font-size:11.5px;margin-top:-6px">Cuánto hay hoy en la cuenta. Desde acá, cada movimiento la mueve sola.</div>',
    btnCancel()+btnOk("Guardar"));
}

// ── Nueva tarjeta — tarjetas-page-content.tsx ──────────────────────────────
function mdTarjeta(){
  return dlg("Nueva tarjeta",
    fld("Nombre", fv("nombre","Ej: VISA Banco Ciudad"))+
    '<div class="row" style="gap:12px">'+fld("Tipo",fsel("tipo","Crédito"),1)+
      fld("Banco emisor",fv("banco","Ej: Galicia"),1)+'</div>'+
    '<div class="row" style="gap:12px">'+fld("Últimos 4 dígitos",fv("u4","1234"),1)+
      fld("Día cierre",fv("cierre","20"),1)+fld("Día vto.",fv("vto","10"),1)+'</div>'+
    '<div class="row" style="gap:12px">'+fld("Límite ARS",fv("limARS","500000"),1)+
      fld("Límite USD (opcional)",fv("limUSD","1000"),1)+'</div>'+
    fld("Cuenta de pago default", fsel("pago","Sin cuenta asignada")),
    btnCancel()+btnOk("Guardar"), null, 470);
}

// ── Nuevo movimiento — movimiento-editor.tsx ───────────────────────────────
const NECES = [1,2,3,4,5];
function mdMovimiento(){
  const tipo = S.form.tipo || "Egreso";
  const esCred = (S.form.metodo === "Crédito" || S.form.debita === "Tarjeta");
  return dlg(S.form.__titulo || "Nuevo movimiento",
    '<div class="row" style="gap:6px">'+["Ingreso","Egreso","Transferencia"].map(function(t){
      return '<span class="pill'+(tipo===t?" on":"")+'" data-k="tipo-'+t+'">'+t+'</span>'; }).join("")+'</div>'+
    '<div class="row" style="gap:12px">'+
      fld("Monto ("+(S.form.moneda||"ARS")+")", fv("monto","0.00","right"),2)+
      fld("Moneda", fsel("moneda","ARS"),1)+'</div>'+
    '<div class="row" style="gap:12px">'+
      fld("Categoría", fsel("categoria","Seleccionar…"),1)+
      fld("Subcategoría", fsel("subcategoria","Seleccionar…"),1)+'</div>'+
    fld("Concepto", fv("concepto","ej. Spotify, Alquiler"))+
    '<div class="row" style="gap:12px">'+
      fld("Clasificación", fsel("clasificacion","Variable"),1)+
      fld("Frecuencia", fsel("frecuencia","Corriente"),1)+'</div>'+
    (S.form.clasificacion==="Cuotas" ? '<div class="row" style="gap:12px">'+
      fld("Número de cuotas", fv("cuotas","3"),1)+
      fld("Monto total", fv("montoTotal","0.00","right"),1)+'</div>'+
      '<div class="t-info" style="font-size:11.5px;margin-top:-6px">Se generan 3 cuotas alineadas al ciclo de la tarjeta.</div>' : '')+
    fld("Necesidad", '<div class="row" style="gap:6px" data-k="neces">'+NECES.map(function(n){
      const on = String(S.form.necesidad)===String(n);
      return '<span class="necc" data-k="nec-'+n+'" style="width:32px;height:32px;'+
        (on?"background:"+NECC[n]+";font-weight:700":"background:#fff;border-color:var(--border);color:var(--muted-foreground)")+'">'+n+'</span>';
    }).join("")+'</div>')+
    fld("Método de pago", fsel("metodo","Seleccionar…"))+
    (tipo!=="Ingreso" ? fld("Se debita de",
      '<div class="row" style="gap:6px">'+["Cuenta","Tarjeta"].map(function(d){
        return '<span class="pill'+(S.form.debita===d?" on":"")+'" data-k="deb-'+d+'">'+d+'</span>'; }).join("")+'</div>') : '')+
    (esCred ? fld("Tarjeta de crédito", fsel("tarjeta","Seleccionar…"))
            : fld("Cuenta", fsel("cuenta","Seleccionar…")))+
    fld("Fecha del registro", fv("fecha",S.hoy))+
    '<div class="row" style="gap:10px;padding:11px 13px;border:1px solid var(--border);border-radius:12px;'+
      (S.form.compartido?"background:rgba(30,58,95,.05);border-color:rgba(30,58,95,.25)":"")+'" data-k="chk-compartido">'+
      '<span class="chk'+(S.form.compartido?" on":"")+'">'+(S.form.compartido?"✓":"")+'</span>'+
      '<span style="font-size:13.5px;font-weight:500">Es un gasto compartido</span></div>'+
    (S.form.compartido ? '<div class="col" style="gap:8px;padding:12px 13px;border:1px solid var(--border);border-radius:12px">'+
      '<span class="lbl" style="margin:0">Participantes</span>'+
      ["Vos","Colo","Rulo"].map(function(n,i){
        const col = ["#1e3a5f","#c98a2b","#2f9e5f"][i];
        return '<div class="between" style="font-size:13px"><span class="row" style="gap:8px">'+
          avaHtml(n,col)+esc(n)+'</span><span class="mono t-mut">'+
          fmt(i===0?42666.66:42666.67)+'</span></div>';
      }).join("")+
      '<div class="t-mut" style="font-size:11.5px;padding-top:6px;border-top:1px solid var(--border-suave)">'+
      'Se divide en partes iguales. En tus totales cuenta sólo tu parte.</div></div>' : '')+
    '<div class="row" style="gap:10px;padding:11px 13px;border:1px solid var(--border);border-radius:12px;'+
      (S.form.recurrente?"background:rgba(30,58,95,.05);border-color:rgba(30,58,95,.25)":"")+'" data-k="chk-recurrente">'+
      '<span class="chk'+(S.form.recurrente?" on":"")+'">'+(S.form.recurrente?"✓":"")+'</span>'+
      '<span style="font-size:13.5px;font-weight:500">Guardar como movimiento recurrente</span></div>',
    btnCancel()+btnOk("Guardar"), null, 470);
}

// ── Nuevo recurrente — movimientos-recurrentes-page-content.tsx ────────────
function mdPlantilla(){
  return dlg("Nuevo movimiento recurrente",
    '<div class="row" style="gap:6px">'+["Egreso","Ingreso"].map(function(t){
      return '<span class="pill'+((S.form.tipo||"Egreso")===t?" on":"")+'">'+t+'</span>'; }).join("")+'</div>'+
    fld("Nombre", fv("nombre","ej. Luz Edenor"))+
    '<div class="row" style="gap:12px">'+
      fld("Monto estimado", fv("monto","0","right"),2)+
      fld("Día del mes que se debita", fv("dia","1"),1)+'</div>'+
    '<div class="row" style="gap:12px">'+
      fld("Método", fsel("metodo","Seleccionar…"),1)+
      fld("Clasificación", fsel("clasificacion","Fijo"),1)+'</div>'+
    fld("Se debita de", fsel("cuenta","Seleccionar…"))+
    fld("Categoría", fsel("categoria","Seleccionar…")),
    btnCancel()+btnOk("Guardar"), null, 450);
}

// ── Generar pendientes — generar-pendientes-modal.tsx ──────────────────────
function mdGenerar(){
  const pend = getPlantillasPendientesDelMes(S.plantillas, S.movs, parseISO(S.hoy));
  const sel = pend.filter(function(p){ return S.gen[p.plantilla.id]; });
  let rows = "";
  pend.forEach(function(x){
    const p = x.plantilla, on = !!S.gen[p.id];
    rows += '<tr style="'+(on?"":"opacity:.5")+'" data-k="gen-'+p.id+'">'+
      '<td style="padding:10px 12px 10px 0;width:22px"><span class="chk'+(on?" on":"")+'">'+(on?"✓":"")+'</span></td>'+
      '<td style="padding:10px 12px 10px 0"><div class="row" style="gap:6px">'+
        '<b style="font-weight:500">'+esc(p.nombre)+'</b><span class="chip chip-eg">Egreso</span></div>'+
        (x.atrasada
          ? '<div class="row t-warn" style="gap:4px;font-size:11.5px;margin-top:2px"><span style="width:12px">'+ico("warn")+'</span>'+
            'Atrasada '+Math.abs(x.diasRestantes)+'d · '+fmtDia(x.fechaEsperada)+'</div>'
          : '<div class="t-mut" style="font-size:11.5px;margin-top:2px">'+fmtDia(x.fechaEsperada)+
            (x.diasRestantes===0?" · hoy":" · en "+x.diasRestantes+"d")+'</div>')+'</td>'+
      '<td class="t-mut" style="padding:10px 12px;text-align:center;width:44px">'+p.dia_mes+'</td>'+
      '<td style="padding:10px 12px 10px 0;width:120px">'+
        '<div class="inp inp-sm right'+(S.focus==="gen-"+p.id?" focus":"")+'" data-k="f-gen-'+p.id+'">'+
        (S.genMonto[p.id]!=null?String(S.genMonto[p.id]):String(p.monto_estimado))+
        (S.focus==="gen-"+p.id?'<span class="caret"></span>':'')+'</div></td>'+
      '<td style="padding:10px 0"><div class="inp inp-sm plc">Descripción</div></td></tr>';
  });
  return dlg("Generar movimientos pendientes",
    '<table style="width:100%;border-collapse:collapse;font-size:13px">'+
      '<thead><tr class="t-mut" style="font-size:11.5px">'+
      '<th style="padding-bottom:8px"></th><th style="text-align:left;padding-bottom:8px">Plantilla</th>'+
      '<th style="padding-bottom:8px">Día</th><th style="text-align:right;padding-bottom:8px;padding-right:12px">Monto</th>'+
      '<th style="text-align:left;padding-bottom:8px">Descripción</th></tr></thead><tbody>'+rows+'</tbody></table>',
    btnCancel()+'<span class="btn btn-default" data-k="btn-crear-pendientes">Crear '+
      (sel.length?sel.length+" ":"")+'movimiento'+(sel.length!==1?"s":"")+'</span>', null, 560);
}

// ── Pagar resumen — pagar-resumen.tsx ──────────────────────────────────────
function mdPagar(){
  const r = resumenTarjeta("t1");
  const monedas = Object.keys(r.saldos).filter(function(m){ return r.saldos[m].total>0; })
    .sort(function(a,b){ return a==="ARS"?-1:1; });
  let body = "";
  monedas.forEach(function(mo){
    const v = r.saldos[mo];
    const raw = S.pago[mo];
    const monto = raw==null||raw==="" ? 0 : parseFloat(String(raw).replace(",","."));
    const dif = Math.round((monto - v.aPagar)*100)/100;
    body += '<div style="border:1px solid var(--border);border-radius:var(--radius-card);padding:14px;'+
      'display:flex;flex-direction:column;gap:12px" data-k="bloque-'+mo+'">'+
      '<div class="between"><span style="font-size:13px;font-weight:600">'+mo+'</span>'+
      '<span class="t-mut" style="font-size:11.5px">Consumos: <span class="mono">'+fmt2(v.total,mo)+'</span></span></div>'+
      ((v.yaDescontado>0||v.devoluciones>0||v.yaPagado>0)?'<div class="col" style="gap:2px;font-size:11.5px" class="t-mut">'+
        (v.yaDescontado>0?'<div class="between t-mut"><span>Ya descontado de cuentas</span><span class="mono">− '+fmt2(v.yaDescontado,mo)+'</span></div>':'')+
        (v.devoluciones>0?'<div class="between t-succ"><span>Devoluciones y reintegros</span><span class="mono">− '+fmt2(v.devoluciones,mo)+'</span></div>':'')+
        (v.yaPagado>0?'<div class="between t-mut"><span>Ya pagado en este ciclo</span><span class="mono">− '+fmt2(v.yaPagado,mo)+'</span></div>':'')+
      '</div>':'')+
      '<div class="between" style="font-size:13.5px;font-weight:500;border-top:1px solid var(--border);padding-top:8px">'+
        '<span>Pendiente</span><span class="mono">'+fmt2(v.aPagar,mo)+'</span></div>'+
      '<div class="row" style="gap:12px">'+
        fld("Cuenta", '<div class="sel"><span>'+(mo==="ARS"?"Caja de ahorro Galicia":"Caja de ahorro Santander")+'</span>'+ico("down")+'</div>',1)+
        fld("Monto a pagar",
          '<div class="inp right'+(S.focus==="pago-"+mo?" focus":"")+(raw?"":" plc")+'" data-k="f-pago-'+mo+'">'+
          (raw?esc(String(raw)):"0")+(S.focus==="pago-"+mo?'<span class="caret"></span>':'')+'</div>',1)+
      '</div>'+
      (monto>0 && dif!==0 ? '<div class="t-mut" style="font-size:11.5px" data-k="parcial-'+mo+'">'+
        (dif>0 ? fmt2(dif,mo)+' más que el pendiente.'
               : 'Pago parcial: quedan '+fmt2(Math.abs(dif),mo)+'.')+'</div>' : '')+
    '</div>';
  });
  const n = monedas.filter(function(mo){ const v=S.pago[mo]; return v && parseFloat(String(v).replace(",","."))>0; }).length;
  return dlg("Pagar resumen · VISA Galicia", body+
    fld("Fecha del pago", '<div class="inp" style="width:170px">'+S.hoy+'</div>')+
    fld("Observación (opcional)", '<div class="inp plc">Ej. incluye consumo no cargado</div>'),
    btnCancel()+'<span class="btn btn-default" data-k="btn-registrar-pago">Registrar '+
      (n>1?"pagos":"pago")+'</span>',
    "Vence el "+fmtLargo(r.ciclo.fechaVencimiento), 470);
}

// ── Nuevo proyecto / Cargar gasto — hub-client + proyecto-detail-client ────
function mdProyecto(){
  const tipos = [["viaje","Viaje","plane"],["evento","Evento","spark"],["proyecto","Proyecto","clip"],["grupo","Grupo","users"]];
  return dlg("Nuevo proyecto",
    fld("Nombre", fv("nombre","Ej. Viaje a la montaña"))+
    fld("Tipo", '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">'+
      tipos.map(function(t){
        const on = (S.form.ptipo||"viaje")===t[0];
        return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 4px;'+
          'border-radius:10px;border:1px solid '+(on?"var(--primary)":"var(--border)")+';font-size:11.5px;'+
          (on?"background:rgba(30,58,95,.1);color:var(--primary)":"color:var(--muted-foreground)")+'">'+
          '<span style="width:16px">'+ico(t[2])+'</span>'+t[1]+'</div>';
      }).join("")+'</div>')+
    fld("Miembros (usuarios conectados)", '<div class="bordered" data-k="miembros">'+
      MIEMBROS.slice(1).map(function(m,i){
        const on = !!S.form["mem"+i];
        return '<div class="row" style="gap:12px;padding:9px 12px;font-size:13px" data-k="mem-'+i+'">'+
          '<span class="chk'+(on?" on":"")+'">'+(on?"✓":"")+'</span>'+avaHtml(m.nombre,m.color)+esc(m.nombre)+'</div>';
      }).join("")+'</div>'),
    btnCancel()+btnOk("Crear","btn-crear-proyecto"), "Un viaje, evento o grupo para dividir gastos entre varios.");
}

function mdGasto(){
  const entre = S.form.entre || {g0:1,g1:1,g2:1,g3:1};
  return dlg("Cargar gasto",
    fld("Concepto", fv("concepto","Ej. Cena, nafta…"))+
    '<div class="row" style="gap:12px">'+
      fld("Monto total", fv("monto","0","right"),1)+
      fld("Fecha", fv("fecha",S.hoy),1)+'</div>'+
    '<div class="row" style="gap:12px">'+
      fld("Moneda", fsel("moneda","ARS"),1)+
      fld("Pagó", fsel("pagador","Vos"),1)+'</div>'+
    fld("Se divide entre", '<div class="bordered" data-k="entre">'+MIEMBROS.map(function(m){
      const on = !!entre[m.id];
      return '<div class="row" style="gap:12px;padding:8px 12px;font-size:13px" data-k="entre-'+m.id+'">'+
        '<span class="chk'+(on?" on":"")+'">'+(on?"✓":"")+'</span>'+avaHtml(m.nombre,m.color)+esc(m.nombre)+'</div>';
    }).join("")+'</div>'+
    '<div class="t-mut" style="font-size:11.5px;margin-top:6px">Se divide en partes iguales entre los seleccionados.</div>'),
    btnCancel()+btnOk("Guardar","btn-guardar-gasto"));
}

// ── Captura MANGO AI (sheet) + revisión ────────────────────────────────────
function shCaptura(){
  const txt = S.form.captura || "";
  return '<div class="dlg-back" data-k="backdrop"></div><div class="sheet">'+
    '<div style="width:38px;height:4px;border-radius:2px;background:var(--border);margin:0 auto 16px"></div>'+
    '<div class="row" style="gap:10px;margin-bottom:14px">'+mkHtml(32)+
      '<div class="grow" style="min-width:0"><div style="font-size:15px;font-weight:600">MANGO AI</div>'+
      '<div class="t-mut" style="font-size:11.5px;line-height:1.35">Contale el gasto como se lo contarías a alguien</div></div></div>'+
    '<div class="cap-ta'+(S.focus==="captura"?" focus":"")+'" style="'+(txt?"":"color:#a9a190")+'">'+
      (txt?esc(txt):"Ej. Pagué la luz 65 lucas con la Master")+
      (S.focus==="captura"?'<span class="caret"></span>':'')+'</div>'+
    '<div class="row" style="gap:10px;margin-top:14px">'+
      '<div class="mic'+(S.mic?" on":"")+'" data-k="btn-mic">'+ico("mic")+'</div>'+
      (S.mic ? '<div class="wave grow">'+Array.from({length:26}).map(function(_,i){
          return '<i style="animation-delay:'+(i*0.06)+'s"></i>'; }).join("")+'</div>'
             : '<div class="cap-sug grow"><span>Cargué nafta 100 lucas en efectivo</span>'+
               '<span>Se debitó el gimnasio</span></div>')+
      '<div class="btn btn-default" style="width:44px;height:44px;border-radius:50%" data-k="btn-enviar">'+ico("send")+'</div>'+
    '</div>'+
    (S.mic?'<div class="t-dang" style="font-size:12px;text-align:center;margin-top:12px;font-weight:500">Escuchando…</div>':'')+
  '</div>';
}

function mdRevision(){
  const f = [["Tipo","Egreso"],["Monto","$ 65.000"],["Concepto","Luz"],
             ["Categoría","Hogar › Servicios"],["Método","Crédito"],
             ["Tarjeta","Mastercard Santander ···· 8032"],["Fecha","12/08/2026"],
             ["Clasificación","Fijo"],["Necesidad","5 · Imprescindible"]];
  return dlg('<span class="row" style="gap:8px">'+mkHtml(22)+'Revisá antes de guardar</span>',
    '<div class="row" style="gap:8px;padding:10px 12px;border-radius:10px;background:rgba(30,58,95,.05);font-size:12.5px">'+
      '<span class="t-gold" style="width:16px;flex:none">'+ico("spark")+'</span>'+
      '<span class="t-mut">De: <b style="color:var(--foreground)">“Pagué la luz 65 lucas con la Master”</b></span></div>'+
    '<div class="bordered">'+f.map(function(x){
      return '<div class="between" style="padding:9px 13px;font-size:13px">'+
        '<span class="t-mut">'+x[0]+'</span><b style="font-weight:500">'+esc(x[1])+'</b></div>';
    }).join("")+'</div>'+
    '<div class="t-mut" style="font-size:11.5px">Interpretó "lucas" como miles y "la Master" como tu Mastercard. Podés corregir cualquier campo.</div>',
    '<span class="btn btn-ghost">Editar</span>'+btnOk("Confirmar","btn-confirmar-captura"), null, 420);
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. RENDER
   ═══════════════════════════════════════════════════════════════════════════ */
const $ = function(s){ return document.querySelector(s); };
const elPhone = $("#scrPhone"), elDesk = $("#scrDesktop"), elPhone2 = $("#scrPhone2");
const frPhone = $("#frPhone"), frDesk = $("#frDesktop"), frPhone2 = $("#frPhone2");

function pantalla(route, second){
  switch(route){
    case "login":        return scrLogin();
    case "google":       return scrGoogle();
    case "onboarding":   return '<div style="position:absolute;inset:0;background:var(--background)"></div>';
    case "dashboard":    return shell(scrDashboard(), route, {desktop:S.device==="desktop", second:second});
    case "cuentas":      return shell(scrCuentas(), route, {desktop:S.device==="desktop"});
    case "tarjetas":     return shell(scrTarjetas(), route, {desktop:S.device==="desktop"});
    case "tarjeta":      return shell(scrTarjeta("t1"), route, {desktop:S.device==="desktop"});
    case "movimientos":  return shell(scrMovimientos(), route, {desktop:true});
    case "recurrentes":  return shell(scrRecurrentes(), route, {desktop:S.device==="desktop"});
    case "compartido":   return shell(scrCompartido(), route, {desktop:true});
    case "proyecto":     return shell(scrProyecto(), route, {desktop:true});
    case "estadisticas": return shell(scrEstadisticas(), route, {desktop:true});
    case "balances":     return shell(scrBalancesColo(), route, {desktop:false, second:true});
    default:             return "";
  }
}
function overlay(){
  if (S.sheet === "captura") return shCaptura();
  if (!S.modal) return "";
  switch(S.modal){
    case "importar":   return mdImportar();
    case "importadas": return mdImportadas(S.importadas||0);
    case "cuenta":     return mdCuenta();
    case "tarjeta":    return mdTarjeta();
    case "movimiento": return mdMovimiento();
    case "plantilla":  return mdPlantilla();
    case "generar":    return mdGenerar();
    case "pagar":      return mdPagar();
    case "proyecto":   return mdProyecto();
    case "gasto":      return mdGasto();
    case "revision":   return mdRevision();
    default: return "";
  }
}

let lastHtml = {a:null,b:null,c:null};
function render(){
  const isDesk = S.device === "desktop";
  frDesk.classList.toggle("hide", !isDesk);
  frPhone.classList.toggle("hide", isDesk);
  frPhone2.classList.toggle("hide", !S.route2);

  const inner = pantalla(S.route) + overlay() +
    (S.toast ? '<div class="toast">'+ico("check2")+esc(S.toast)+'</div>' : '');
  const target = isDesk ? elDesk : elPhone;
  const key = isDesk ? "b" : "a";
  if (lastHtml[key] !== inner){ target.innerHTML = inner; lastHtml[key] = inner; }

  if (S.route2){
    const h2 = pantalla(S.route2, true) +
      (S.toast2 ? '<div class="toast">'+ico("check2")+esc(S.toast2)+'</div>' : '');
    if (lastHtml.c !== h2){ elPhone2.innerHTML = h2; lastHtml.c = h2; }
  }
  layoutFrames();
  renderHud();
}
