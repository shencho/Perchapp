
/* ═══════════════════════════════════════════════════════════════════════════
   5. ÍCONOS (lucide, stroke 2) y átomos de marca
   ═══════════════════════════════════════════════════════════════════════════ */
const P = {
  home:"M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  swap:"M8 3 4 7l4 4M4 7h16M16 13l4 4-4 4M20 17H4",
  card:"M2 6.5A1.5 1.5 0 0 1 3.5 5h17A1.5 1.5 0 0 1 22 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-17A1.5 1.5 0 0 1 2 17.5zM2 10h20",
  wallet:"M19 7V5.5A1.5 1.5 0 0 0 17.5 4h-13A2.5 2.5 0 0 0 2 6.5v11A2.5 2.5 0 0 0 4.5 20h14a1.5 1.5 0 0 0 1.5-1.5V17M22 11h-5a2 2 0 0 0 0 4h5z",
  trend:"M22 7 13.5 15.5l-4-4L2 19M16 7h6v6",
  pie:"M21 12A9 9 0 1 1 12 3v9z",
  bars:"M4 20V10M10 20V4M16 20v-7M22 20h-20",
  bank:"M3 21h18M4 10h16M5 10V8l7-4 7 4v2M6 10v11M10 10v11M14 10v11M18 10v11",
  dots:"M5 12h.01M12 12h.01M19 12h.01",
  plus:"M12 5v14M5 12h14",
  pencil:"M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z",
  archive:"M3 8h18v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM2 3h20v5H2zM10 12h4",
  bell:"M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  right:"m9 18 6-6-6-6", left:"m15 18-6-6 6-6", down:"m6 9 6 6 6-6",
  warn:"M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01",
  x:"M18 6 6 18M6 6l12 12", check:"M20 6 9 17l-5-5",
  arrow:"M5 12h14M12 5l7 7-7 7",
  dl:"M17 7 7 17M7 7v10h10", ur:"M7 17 17 7M7 7h10v10",
  pig:"M19 5c-1.5 0-2.8 1-3.4 2.3A5 5 0 0 0 14 7H9a6 6 0 0 0-6 6v3a2 2 0 0 0 2 2h1v2h3v-2h4v2h3v-2.3A6 6 0 0 0 19 13V5zM16 11h.01M9 7V5a2 2 0 0 1 2-2h1",
  users:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  plane:"M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a.5.5 0 0 0-.5.8l3.2 3.6-2.4 2.4-2.3-.6a.5.5 0 0 0-.5.8L5 16l2.8 2.7a.5.5 0 0 0 .8-.5l-.6-2.3 2.4-2.4 3.6 3.2a.5.5 0 0 0 .8-.5z",
  trash:"M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6",
  mic:"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v3",
  send:"M22 2 11 13M22 2l-7 20-4-9-9-4z",
  spark:"M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8",
  check2:"M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4 12 14l-3-3",
  coin:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9.4a3.5 3.5 0 0 0-6 2.6c0 3 6 2 6 5a3.5 3.5 0 0 1-6 2.6M12 6v2M12 16v2",
  refresh:"M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5",
  tag:"M20.6 13.4 12 22l-9-9V3h10zM7.5 7.5h.01",
  target:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  gear:"M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H7a1.7 1.7 0 0 0 1-1.5V1a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V7a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  minus:"M5 12h14", down2:"M22 17 13.5 8.5l-4 4L2 5M16 17h6v-6",
  clip:"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9zM9 12h6M9 16h6",
  userplus:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M19 8v6M22 11h-6",
  lock:"M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4",
  eye:"M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  zap:"M13 2 3 14h8l-1 8 10-12h-8z",
  cal:"M8 2v4M16 2v4M3 9h18M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z",
};
function ico(k, cls){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '+
  'stroke-linecap="round" stroke-linejoin="round"'+(cls?' class="'+cls+'"':'')+'><path d="'+P[k]+'"/></svg>'; }
function icoF(k){ return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="'+P[k]+'"/></svg>'; }

function mkHtml(size){
  const b = Math.max(1, Math.round(size*0.028)), inner = size - b*2;
  return '<span class="mk" style="width:'+size+'px;height:'+size+'px;border:'+b+'px solid #fff">'+
    '<i class="body" style="width:'+(inner*0.62)+'px;height:'+(inner*0.66)+'px;left:'+(inner*0.2)+'px;top:'+(inner*0.22)+'px"></i>'+
    '<i class="leaf" style="width:'+(inner*0.3)+'px;height:'+(inner*0.18)+'px;left:'+(inner*0.47)+'px;top:'+(inner*0.11)+'px"></i></span>';
}
function wmHtml(size, color){
  return '<span class="wm" style="font-size:'+size+'px;color:'+(color||"var(--navy)")+'">'+
    '<span>MA</span><span class="cut">N</span><span>GO</span></span>';
}
function avaHtml(nom, color, size){
  size = size||20;
  return '<span class="ava" style="width:'+size+'px;height:'+size+'px;background:'+color+
    ';font-size:'+Math.round(size*0.46)+'px">'+nom.charAt(0)+'</span>';
}
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ═══════════════════════════════════════════════════════════════════════════
   6. SHELL — sidebar de escritorio / barra inferior de mobile
   ═══════════════════════════════════════════════════════════════════════════ */
const NAV = [
  {href:"dashboard",    label:"Inicio",       ic:"home",   bottom:true},
  {href:"movimientos",  label:"Movimientos",  ic:"swap",   bottom:true, short:"Movs."},
  {href:"tarjetas",     label:"Tarjetas",     ic:"card",   bottom:true},
  {href:"cuentas",      label:"Cuentas",      ic:"wallet"},
  {href:"cash-flow",    label:"Cash flow",    ic:"trend"},
  {href:"estadisticas", label:"Estadísticas", ic:"pie"},
  {href:"balances",     label:"Balances",     ic:"bars"},
  {href:"prestamos",    label:"Préstamos",    ic:"bank"},
];
const DRAWER = [
  {href:"presupuestos", label:"Presupuestos", ic:"target"},
  {href:"categorias",   label:"Categorías",   ic:"tag"},
  {href:"recurrentes",  label:"Movimientos recurrentes", ic:"refresh"},
  {href:"personas",     label:"Personas y grupos", ic:"users"},
  {href:"compartido",   label:"Compartido",   ic:"users"},
  {href:"ajustes",      label:"Ajustes",      ic:"gear"},
];

function sidebar(route){
  let nav = "";
  NAV.forEach(function(i){
    nav += '<div class="sb-i'+(i.href===route||(route==="tarjeta"&&i.href==="tarjetas")?" on":"")+
      '" data-k="nav-'+i.href+'">'+ico(i.ic)+i.label+'</div>';
  });
  return '<aside class="sb">'+
    '<div class="sb-top">'+wmHtml(26)+
      '<div class="bell" data-k="bell">'+ico("bell")+(S.notif2?'<b></b>':'')+'</div></div>'+
    '<div class="sb-ai">'+mkHtml(22)+'<span>MANGO AI</span></div>'+
    '<div class="sb-nav">'+nav+'</div>'+
    '<div class="sb-bot"><div class="sb-i" data-k="nav-mas">'+ico("dots")+'Más</div></div>'+
    '<div class="sb-user"><span class="avat">V</span><span class="grow trunc">'+esc(S.perfil.email)+'</span></div>'+
  '</aside>';
}

function bottomNav(route){
  let out = '<nav class="bn">';
  const b = NAV.filter(function(i){ return i.bottom; });
  function item(i){
    return '<div class="bn-i'+(i.href===route||(route==="tarjeta"&&i.href==="tarjetas")?" on":"")+
      '" data-k="nav-'+i.href+'">'+ico(i.ic)+'<span>'+(i.short||i.label)+'</span></div>';
  }
  out += item(b[0]) + item(b[1]) + '<div></div>' + item(b[2]);
  out += '<div class="bn-i" data-k="nav-mas">'+ico("dots")+'<span>Más</span></div>';
  return out + '</nav>';
}

/** Envuelve una pantalla en el shell correspondiente. */
function shell(inner, route, opts){
  opts = opts || {};
  if (opts.desktop){
    return '<div class="app">'+sidebar(route)+
      '<main class="main"><div class="scroll">'+inner+'</div></main></div>';
  }
  return '<div class="app" style="flex-direction:column">'+
    '<div class="tb">'+wmHtml(21)+'<div class="bell" data-k="bell">'+ico("bell")+
      (S.notif2&&opts.second?'<b></b>':'')+'</div></div>'+
    '<main class="main mob" style="flex:1;min-height:0"><div class="scroll">'+inner+'</div></main>'+
    bottomNav(route)+
    '<div class="fab" data-k="fab">'+mkHtml(58)+'</div>'+
  '</div>';
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. PANTALLAS
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Login — app/(auth)/login/page.tsx ───────────────────────────────────────
function scrLogin(){
  const g = '<svg viewBox="0 0 24 24" style="width:16px;height:16px">'+
    '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>'+
    '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>'+
    '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>'+
    '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>';
  return '<div class="auth">'+
    '<div class="auth-brand">'+
      '<div class="mango-blob" style="width:340px;height:340px;right:-110px;top:-120px"></div>'+
      '<div class="mango-blob" style="width:220px;height:220px;left:-70px;bottom:-70px"></div>'+
      '<div style="position:relative;display:flex;align-items:center;gap:12px">'+mkHtml(34)+wmHtml(26,"var(--cream)")+'</div>'+
      '<div style="position:relative">'+
        '<div style="font-family:var(--font-display);font-size:30px;color:#fff;line-height:1.25">Toda tu plata,<br>en un solo lugar.</div>'+
        '<div style="font-size:13.5px;color:rgba(232,217,180,.75);margin-top:14px;line-height:1.6">Cuentas, tarjetas, recurrentes y gastos compartidos. Con la aritmética hecha.</div>'+
      '</div>'+
    '</div>'+
    '<div class="auth-form"><div class="auth-card">'+
      '<div><div style="font-size:23px;font-weight:600;letter-spacing:-.02em">Bienvenido de nuevo</div>'+
      '<div class="t-mut" style="font-size:13.5px;margin-top:4px">Ingresá a tu cuenta</div></div>'+
      '<div class="col" style="gap:14px">'+
        '<div class="fld"><span class="lbl">Email</span><div class="inp plc">vos@ejemplo.com</div></div>'+
        '<div class="fld"><span class="lbl">Contraseña</span><div class="inp plc">••••••••</div></div>'+
        '<div class="btn btn-default btn-w" style="height:36px">Ingresar</div>'+
      '</div>'+
      '<div class="row" style="gap:12px"><div class="grow" style="height:1px;background:var(--border)"></div>'+
        '<span class="t-mut" style="font-size:12px">o</span>'+
        '<div class="grow" style="height:1px;background:var(--border)"></div></div>'+
      '<div class="btn btn-outline btn-w" style="height:38px;gap:8px" data-k="btn-google">'+g+'Continuar con Google</div>'+
      '<div class="t-mut" style="font-size:13px;text-align:center">¿No tenés cuenta? '+
        '<span style="color:var(--primary)">Crear cuenta</span></div>'+
    '</div></div></div>';
}

// ── Elección de cuenta de Google ───────────────────────────────────────────
function scrGoogle(){
  return '<div style="position:absolute;inset:0;background:#f8f9fa;display:grid;place-items:center;padding:24px">'+
    '<div style="width:100%;max-width:360px;background:#fff;border:1px solid #dadce0;border-radius:8px;padding:36px 32px;font-family:Manrope,sans-serif">'+
      '<div style="display:flex;justify-content:center;margin-bottom:14px">'+
        '<svg viewBox="0 0 24 24" style="width:26px;height:26px">'+
        '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>'+
        '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>'+
        '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>'+
        '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg></div>'+
      '<div style="text-align:center;font-size:21px;color:#202124;font-weight:500">Elegí una cuenta</div>'+
      '<div style="text-align:center;font-size:13px;color:#5f6368;margin-top:6px">para continuar en MANGO</div>'+
      '<div style="margin-top:22px;border-top:1px solid #e8eaed" data-k="g-acct">'+
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 4px;border-bottom:1px solid #e8eaed">'+
          '<span style="width:32px;height:32px;border-radius:50%;background:#1e3a5f;color:#fff;display:grid;place-items:center;font-size:14px;font-weight:600">V</span>'+
          '<span style="font-size:14px;color:#202124">vos@ejemplo.com</span></div>'+
        '<div style="display:flex;align-items:center;gap:14px;padding:14px 4px;color:#5f6368">'+
          '<span style="width:32px;height:32px;border-radius:50%;border:1px solid #dadce0;display:grid;place-items:center;font-size:16px">+</span>'+
          '<span style="font-size:14px">Usar otra cuenta</span></div>'+
      '</div>'+
    '</div></div>';
}

// ── Dashboard — dashboard-client.tsx ───────────────────────────────────────
function heroBlock(){
  const am = S.hoy.slice(0,7), prev = mesAnterior(am);
  const rows = ["ARS","USD"].map(function(mo){
    const t = totalesMes(am,mo), p = totalesMes(prev,mo);
    const delta = p.balance!==0 ? Math.round((t.balance-p.balance)/Math.abs(p.balance)*100) : null;
    return {code:mo, label: mo==="ARS"?"Pesos":"Dólares", total:patrimonio(mo), t:t, delta:delta,
      ahorro: t.ingresos>0 ? Math.round((t.ingresos-t.egresos)/t.ingresos*100) : null};
  });
  const vis = S.heroMoneda ? rows.filter(function(r){return r.code===S.heroMoneda;}) : rows;
  let cols = "";
  vis.forEach(function(m){
    cols += '<div style="min-width:0" data-k="hero-'+m.code+'">'+
      '<div class="hero-lbl">'+m.label+'</div>'+
      '<div class="hero-num trunc" data-num="hero-'+m.code+'">'+fmt(m.total,m.code)+'</div>'+
      (m.delta!==null ? '<span class="hero-delta">'+ico(m.delta>0?"trend":m.delta<0?"down2":"minus")+
        (m.delta>0?"+":"")+m.delta+'% vs mes anterior</span>' : '')+
    '</div>';
  });
  const a = rows[0], b = rows[1];
  return '<div class="col" style="gap:16px">'+
    '<div class="between" style="flex-wrap:wrap;gap:8px">'+
      '<div><h1 class="pg">Hola, '+esc(S.perfil.nombre||"vos")+'</h1>'+
      '<p class="sub">Resumen financiero de hoy</p></div>'+
      '<div class="row" style="gap:6px;border:1px solid var(--border);border-radius:8px;padding:6px 12px;font-size:13px;color:var(--muted-foreground)">'+
        ico("bars")+'Ver proyección</div>'+
    '</div>'+
    '<div class="mango-card-navy hero" data-k="hero">'+
      '<div class="mango-blob" style="width:260px;height:260px;right:-70px;top:-90px"></div>'+
      '<div class="mango-blob" style="width:170px;height:170px;right:110px;bottom:-95px"></div>'+
      '<div class="hero-grid" style="'+((vis.length===1||S.device!=="desktop")?"grid-template-columns:1fr":"")+'">'+cols+'</div>'+
    '</div>'+
    '<div class="stats" style="'+(S.device!=="desktop"?"grid-template-columns:1fr":"")+'">'+
      statCard("dl","#e6f6ef","#0b7a52","Ingresos del mes", dos(fmt(a.t.ingresos),fmt(b.t.ingresos,"USD")),"t-succ")+
      statCard("ur","#fdeaea","#c0362f","Gastos del mes", dos(fmt(a.t.egresos),fmt(b.t.egresos,"USD")),"t-dang")+
      statCard("pig","#f3ecdc","#1e3a5f","Ahorro del mes",
        dos(a.ahorro!==null?a.ahorro+"%":"—", b.ahorro!==null?b.ahorro+"%":"—"),"")+
    '</div></div>';
}
function statCard(icn,bg,col,label,val,cls){
  return '<div class="mango-card-muted stat"><div class="ic" style="background:'+bg+';color:'+col+'">'+
    ico(icn)+'</div><div class="k">'+label+'</div><div class="v '+cls+'">'+val+'</div></div>';
}
function dos(ars,usd){
  return '<span class="dos"><span><i>ARS</i><span class="trunc">'+ars+'</span></span>'+
    '<span><i>USD</i><span class="trunc">'+usd+'</span></span></span>';
}

function bloqueCuentas(){
  const cs = cuentasActivas().map(function(c){ return {c:c, s:saldoCuenta(c.id)}; })
    .sort(function(a,b){ return Math.abs(b.s)-Math.abs(a.s); });
  let out = '';
  if (cs.length){
    out += '<div class="list" data-k="lista-cuentas">';
    cs.slice(0,3).forEach(function(x){
      out += '<div class="li" data-k="cuenta-'+x.c.id+'"><div><div class="n">'+esc(x.c.nombre)+'</div>'+
        '<div class="m">'+x.c.tipo+' · '+x.c.moneda+'</div></div>'+
        '<span class="amt '+(x.s>=0?"t-succ":"t-dang")+'" data-num="cta-'+x.c.id+'">'+fmt(x.s,x.c.moneda)+'</span></div>';
    });
    if (cs.length>3) out += '<div style="padding:9px 16px;text-align:center;font-size:12px" class="t-mut">Ver todas las cuentas ('+cs.length+')</div>';
    out += '</div>';
  }
  const ts = tarjetasActivas();
  if (ts.length){
    out += '<div class="list" style="margin-top:12px" data-k="lista-tarjetas">';
    ts.forEach(function(t){
      const r = resumenTarjeta(t.id);
      out += '<div class="li" data-k="dash-tar-'+t.id+'"><div><div class="n">'+esc(t.nombre)+'</div>'+
        '<div class="m">Crédito · '+esc(t.banco)+' · vto '+fmtDate(r.ciclo.fechaVencimiento)+'</div></div>'+
        consumoPorMoneda(r)+'</div>';
    });
    out += '</div>';
  }
  return out + '<div class="more" style="margin-top:12px">Ver patrimonio completo '+ico("right")+'</div>';
}
function consumoPorMoneda(r){
  const con = Object.keys(r.consumo).filter(function(k){ return r.consumo[k]>0.005; });
  if (r.pagado && !con.length) return '<span class="t-succ" style="font-size:12px;font-weight:500">Pagado</span>';
  if (!con.length) return '<span class="amt t-mut">$0</span>';
  return '<span class="col" style="align-items:flex-end">'+con.map(function(k){
    return '<span class="amt t-dang" data-num="tar-'+r.tarjeta.id+'-'+k+'">'+fmt(r.consumo[k],k)+'</span>'; }).join("")+'</span>';
}

function bloqueAlertas(){
  const al = alertas(); if (!al.length) return "";
  let out = '<div class="col" style="gap:8px" data-k="alertas">';
  al.forEach(function(a){
    out += '<div class="alert '+(a.urgencia==="alta"?"alta":"")+'" data-k="alerta-'+a.id+'">'+
      '<div class="alert-in"><span class="alert-ic">'+ico("warn")+'</span>'+
      '<div class="grow"><div class="alert-t">'+esc(a.titulo)+'</div>'+
      '<div class="alert-d">'+esc(a.descripcion)+'</div></div>'+
      (a.silenciable?'':'<span class="t-mut" style="width:16px">'+ico("right")+'</span>')+'</div>'+
      (a.silenciable?'<div class="alert-x">'+ico("x")+'<span>Silenciar por este mes</span></div>':'')+
    '</div>';
  });
  return out + '</div>';
}

function bloqueCompartidos(){
  let pend = 0; const porPersona = {};
  S.movs.forEach(function(m){
    if (!m.es_compartido || !m.participantes) return;
    m.participantes.forEach(function(p){
      if (p.estado === "pendiente"){ pend += p.monto;
        porPersona[p.nombre] = (porPersona[p.nombre]||0) + p.monto; }
    });
  });
  let out = '<div class="mango-card" style="padding:20px;display:flex;align-items:center;justify-content:space-between">'+
    '<div><div class="t-mut" style="font-size:12px">Te deben en total</div>'+
    '<div class="mono t-succ" style="font-size:20px;font-weight:700;margin-top:2px" data-num="compartido-total">'+fmt(pend)+'</div></div>'+
    '<span class="t-mut" style="opacity:.3">'+ico("coin","md")+'</span></div>';
  const ks = Object.keys(porPersona);
  if (ks.length){
    out += '<div class="list" style="margin-top:12px">';
    ks.forEach(function(n){ out += '<div class="li"><span class="n">'+esc(n)+'</span>'+
      '<span class="amt t-succ">'+fmt(porPersona[n])+'</span></div>'; });
    out += '</div>';
  }
  return out;
}

function bloqueAnalisis(){
  const am = S.hoy.slice(0,7);
  const res = resumenCorte(am,"ARS","Egreso","categoria");
  if (!res.filas.length) return "";
  return '<div class="row" style="gap:20px;align-items:flex-start">'+
    donut(res.filas.slice(0,6), "ARS", "Gastos", res.total)+
    '<div class="grow list">'+res.filas.slice(0,5).map(function(f,i){
      return '<div class="lg"><span class="dot" style="background:'+COLORES[i%COLORES.length]+'"></span>'+
        '<span class="grow trunc" style="font-size:13px;font-weight:500">'+esc(f.nombre)+'</span>'+
        '<span class="t-mut" style="font-size:11.5px">'+f.porcentaje+'%</span>'+
        '<span class="mono" style="font-size:13px;font-weight:600;width:104px;text-align:right">'+fmt(f.monto)+'</span></div>';
    }).join("")+'</div></div>';
}

const COLORES = ["#1e3a5f","#c98a2b","#10b981","#3b82f6","#ef4444","#f59e0b","#8b5cf6","#14b8a6","#ec4899","#6b7280"];

function donut(filas, moneda, label, total){
  const R=42, C=2*Math.PI*R; let off=0;
  const arcs = filas.map(function(f,i){
    const frac = total>0 ? f.monto/total : 0;
    const seg = '<circle cx="50" cy="50" r="'+R+'" fill="none" stroke="'+COLORES[i%COLORES.length]+
      '" stroke-width="16" stroke-dasharray="'+(frac*C)+' '+C+'" stroke-dashoffset="'+(-off*C)+'"/>';
    off += frac; return seg;
  }).join("");
  return '<div class="donut"><svg viewBox="0 0 100 100">'+arcs+'</svg>'+
    '<div class="mid"><div><div class="t-mut" style="font-size:11px">'+label+'</div>'+
    '<div class="mono" style="font-size:15px;font-weight:700">'+fmt(total,moneda)+'</div></div></div></div>';
}

function scrDashboard(){
  const al = bloqueAlertas();
  return (al?'<section class="col" style="gap:10px"><h2 class="sec">Alertas</h2>'+al+'</section>':'')+
    heroBlock()+
    '<section class="col" style="gap:10px"><h2 class="sec">Gráfico</h2>'+bloqueAnalisis()+'</section>'+
    '<section class="col" style="gap:10px"><h2 class="sec">Cuentas</h2>'+bloqueCuentas()+'</section>'+
    (S.movs.some(function(m){return m.es_compartido;})
      ?'<section class="col" style="gap:10px"><h2 class="sec">Compartidos</h2>'+bloqueCompartidos()+'</section>':'');
}

// ── Cuentas ────────────────────────────────────────────────────────────────
function scrCuentas(){
  const cs = cuentasActivas();
  return '<div><h1 class="pg">Cuentas</h1><p class="sub">Dónde está tu plata hoy.</p></div>'+
    '<div class="between"><span class="t-mut" style="font-size:13px">'+
      (cs.length? cs.length+" cuenta"+(cs.length!==1?"s":"") : "Todavía no tenés cuentas.")+'</span>'+
      '<div class="btn btn-default btn-sm" data-k="btn-nueva-cuenta">'+ico("plus")+'Nueva cuenta</div></div>'+
    (cs.length?'<div class="list" data-k="lista-cuentas">'+cs.map(function(c){
      const s = saldoCuenta(c.id);
      return '<div class="li" data-k="cuenta-'+c.id+'"><div><div class="n">'+esc(c.nombre)+'</div>'+
        '<div class="m">'+c.tipo+' · '+c.moneda+'</div></div>'+
        '<span class="amt '+(s>=0?"t-succ":"t-dang")+'" data-num="cta-'+c.id+'">'+fmt(s,c.moneda)+'</span></div>';
    }).join("")+'</div>':'');
}

// ── Tarjetas — components/tarjetas/tarjetas-page-content.tsx ───────────────
function scrTarjetas(){
  const ts = tarjetasActivas();
  return '<div><h1 class="pg">Tarjetas</h1><p class="sub">Tus tarjetas de crédito y débito.</p></div>'+
    '<div class="between"><span class="t-mut" style="font-size:13px">'+
      (ts.length? ts.length+" tarjeta"+(ts.length!==1?"s":"") : "Todavía no tenés tarjetas.")+'</span>'+
      '<div class="btn btn-default btn-sm" data-k="btn-nueva-tarjeta">'+ico("plus")+'Nueva tarjeta</div></div>'+
    (ts.length?'<div class="list" data-k="lista-tarjetas">'+ts.map(function(t){
      const r = resumenTarjeta(t.id);
      const con = Object.keys(r.consumo).filter(function(k){return r.consumo[k]>0.005;});
      const montos = con.length
        ? con.map(function(k){ return '<span class="mono t-dang" style="font-size:13.5px;font-weight:600" data-num="tl-'+t.id+'-'+k+'">'+fmt(r.consumo[k],k)+'</span>'; }).join("")
        : (r.pagado?'<span class="t-succ" style="font-size:13.5px;font-weight:600">Pagado</span>'
                   :'<span class="mono t-mut" style="font-size:13.5px;font-weight:600">$0</span>');
      return '<div class="li" data-k="tar-'+t.id+'" style="align-items:flex-start">'+
        '<div class="grow"><div class="n">'+esc(t.nombre)+
          '<span class="t-mut" style="font-weight:400"> ···· '+t.u4+'</span></div>'+
        '<div class="m">Crédito · '+esc(t.banco)+'</div>'+
        '<div class="row" style="gap:12px;margin-top:4px;flex-wrap:wrap">'+montos+
          '<span class="t-mut" style="font-size:11px">cierra '+fmtDia(r.ciclo.fin)+
          ' · vence '+fmtDia(r.ciclo.fechaVencimiento)+'</span></div></div>'+
        '<div class="row" style="gap:2px"><span class="btn btn-icon" data-k="ver-'+t.id+'">'+ico("bars")+'</span>'+
        '<span class="btn btn-icon">'+ico("pencil")+'</span>'+
        '<span class="btn btn-icon">'+ico("archive")+'</span></div></div>';
    }).join("")+'</div>':'');
}

// ── Detalle de tarjeta ─────────────────────────────────────────────────────
function scrTarjeta(id){
  const r = resumenTarjeta(id), t = r.tarjeta;
  const movs = S.movs.filter(function(m){ return m.tarjeta_id===id &&
    m.fecha>=r.ciclo.inicio && m.fecha<=r.ciclo.fin; })
    .sort(function(a,b){ return a.fecha<b.fecha?1:-1; });
  const monedas = Object.keys(r.saldos).sort(function(a,b){ return a==="ARS"?-1:1; });
  return '<div class="row" style="gap:12px;align-items:flex-start">'+
      '<span class="t-mut" data-k="volver">'+ico("left")+'</span>'+
      '<div class="grow"><h1 class="pg" style="font-size:20px">'+esc(t.nombre)+
        '<span class="t-mut" style="font-weight:400;font-size:15px"> ···· '+t.u4+'</span></h1>'+
      '<p class="sub">Ciclo '+fmtDia(r.ciclo.inicio)+' – '+fmtDia(r.ciclo.fin)+
        (r.ciclo.cicloAbierto?' · <span class="t-warn">en curso</span>':' · <span class="t-succ">cerrado</span>')+
        ' · vence '+fmtLargo(r.ciclo.fechaVencimiento)+'</p></div>'+
      '<div class="btn btn-default btn-sm" data-k="btn-pagar">'+ico("wallet")+'Pagar resumen</div></div>'+
    '<div class="row" style="gap:12px">'+monedas.map(function(mo){
      const v = r.saldos[mo];
      return '<div class="mango-card grow" style="padding:18px" data-k="resumen-'+mo+'">'+
        '<div class="between"><span style="font-size:13px;font-weight:600">'+mo+'</span>'+
        '<span class="t-mut" style="font-size:11.5px">'+movs.filter(function(m){return m.moneda===mo&&m.tipo==="Egreso";}).length+' consumos</span></div>'+
        '<div class="mono" style="font-size:26px;font-weight:700;margin-top:6px" data-num="det-'+mo+'">'+fmt2(v.aPagar,mo)+'</div>'+
        '<div class="t-mut" style="font-size:11.5px;margin-top:2px">a pagar de '+fmt2(v.total,mo)+' consumidos</div>'+
        (v.devoluciones>0?'<div class="t-succ" style="font-size:11.5px;margin-top:4px">− '+fmt2(v.devoluciones,mo)+' en devoluciones</div>':'')+
        (v.yaPagado>0?'<div class="t-mut" style="font-size:11.5px;margin-top:4px">− '+fmt2(v.yaPagado,mo)+' ya pagado</div>':'')+
      '</div>';
    }).join("")+'</div>'+
    '<div class="col" style="gap:8px"><h2 class="sec">Consumos del ciclo</h2>'+
    '<div class="list">'+movs.map(function(m){
      return '<div class="li"><div class="grow"><div class="n">'+esc(m.concepto)+
        (m.cuota_numero?' <span class="chip chip-cuota">'+m.cuota_numero+'/'+m.cuotas+'</span>':'')+
        (m.es_compartido?' <span class="chip chip-cuota" style="background:rgba(30,58,95,.08);color:var(--navy);border-color:rgba(30,58,95,.18)">compartido</span>':'')+'</div>'+
        '<div class="m">'+fmtDate(m.fecha)+(m.categoria_id&&catById[m.categoria_id]?' · '+esc(catById[m.categoria_id].nombre):'')+'</div></div>'+
        '<span class="amt '+(m.tipo==="Ingreso"?"t-succ":"t-dang")+'">'+
        (m.tipo==="Ingreso"?"+":"-")+fmt2(m.monto,m.moneda)+'</span></div>';
    }).join("")+'</div></div>';
}

// ── Movimientos ────────────────────────────────────────────────────────────
const NECC = {1:"rgba(239,68,68,.1);color:var(--danger);border-color:rgba(239,68,68,.2)",
  2:"rgba(245,158,11,.1);color:var(--warning);border-color:rgba(245,158,11,.2)",
  3:"rgba(245,158,11,.1);color:var(--warning);border-color:rgba(245,158,11,.2)",
  4:"rgba(47,158,95,.1);color:var(--success);border-color:rgba(47,158,95,.2)",
  5:"rgba(47,158,95,.1);color:var(--success);border-color:rgba(47,158,95,.2)"};

function scrMovimientos(){
  const ms = S.movs.filter(function(m){ return !m.historial; })
    .sort(function(a,b){ return a.fecha<b.fecha?1:a.fecha>b.fecha?-1:(a.id<b.id?1:-1); });
  let rows = "";
  ms.forEach(function(m){
    const parts = m.participantes||[];
    const cob = parts.filter(function(p){return p.estado==="cobrado";});
    const totalM = parts.reduce(function(s,p){return s+p.monto;},0);
    const cobM = cob.reduce(function(s,p){return s+p.monto;},0);
    const pct = totalM>0 ? Math.round(cobM/totalM*100) : 0;
    rows += '<tr data-k="mov-'+m.id+'">'+
      '<td class="t-mut" style="white-space:nowrap">'+fmtDate(m.fecha)+'</td>'+
      '<td><div style="font-weight:500">'+esc(m.concepto)+
        (m.cuota_numero?' <span class="chip chip-cuota">'+m.cuota_numero+'/'+m.cuotas+'</span>':'')+'</div>'+
        (m.categoria_id&&catById[m.categoria_id]?'<div class="m t-mut" style="font-size:11.5px">'+esc(catById[m.categoria_id].nombre)+'</div>':'')+
        (m.es_compartido&&parts.length?'<div style="margin-top:4px" data-k="barra-'+m.id+'">'+
          '<div class="row t-mut" style="gap:4px;font-size:11.5px"><span style="width:12px;flex:none">'+ico("users")+'</span>'+
          '<span>Compartido · '+cob.length+'/'+parts.length+' cobrado</span></div>'+
          '<div class="bar" style="margin-top:3px"><i style="width:'+pct+'%"></i></div>'+
          '<div class="t-mut" style="font-size:11px;margin-top:2px">'+fmt(cobM)+' cobrado de '+fmt(totalM)+'</div></div>':'')+
      '</td>'+
      '<td class="t-mut" style="font-size:11.5px">'+(m.metodo||"—")+
        (m.tarjeta_id?'<span> · '+esc(tarById[m.tarjeta_id].nombre)+'</span>':'')+
        (m.cuenta_id&&!m.tarjeta_id?'<span> · '+esc(cueById[m.cuenta_id].nombre)+'</span>':'')+'</td>'+
      '<td style="text-align:right" class="mono '+(m.tipo==="Ingreso"?"t-succ":m.tipo==="Egreso"?"t-dang":"t-mut")+
        '"><b>'+(m.tipo==="Ingreso"?"+":m.tipo==="Egreso"?"-":"↔")+fmt(m.monto,m.moneda)+'</b></td>'+
      '<td style="text-align:center">'+(m.necesidad?'<span class="necc" style="background:'+NECC[m.necesidad]+'">'+m.necesidad+'</span>'
        :'<span style="color:rgba(148,136,108,.35)">—</span>')+'</td>'+
    '</tr>';
  });
  return '<div class="between"><div><h1 class="pg">Movimientos</h1>'+
      '<p class="sub">'+ms.length+' movimiento'+(ms.length!==1?"s":"")+' este período.</p></div>'+
      '<div class="row" style="gap:8px">'+
      '<div class="btn btn-outline btn-sm" data-k="btn-generar">'+ico("refresh")+'Generar pendientes</div>'+
      '<div class="btn btn-default btn-sm" data-k="btn-nuevo-mov">'+ico("plus")+'Nuevo</div></div></div>'+
    '<div class="row" style="gap:6px;flex-wrap:wrap">'+
      '<span class="pill on">Todos</span><span class="pill">Ingresos</span><span class="pill">Gastos</span>'+
      '<span class="pill">Compartidos</span><span class="pill">En cuotas</span></div>'+
    '<div class="mango-card" style="overflow:hidden;padding:0"><table class="mv">'+
      '<thead><tr><th style="width:64px">Fecha</th><th>Concepto</th><th style="width:210px">Medio</th>'+
      '<th style="width:130px;text-align:right">Monto</th><th style="width:74px;text-align:center">Nec.</th></tr></thead>'+
      '<tbody>'+rows+'</tbody></table></div>';
}

// ── Recurrentes ────────────────────────────────────────────────────────────
function scrRecurrentes(){
  const ps = S.plantillas;
  return '<div><h1 class="pg">Movimientos recurrentes</h1>'+
    '<p class="sub">Gastos e ingresos que se repiten cada mes.</p></div>'+
    '<div class="between"><span class="t-mut" style="font-size:13px">'+
      (ps.length? ps.length+" movimiento"+(ps.length!==1?"s":"")+" recurrente"+(ps.length!==1?"s":"")
                : "Todavía no tenés movimientos recurrentes.")+'</span>'+
      '<div class="btn btn-default btn-sm" data-k="btn-nueva-plantilla">'+ico("plus")+'Nuevo recurrente</div></div>'+
    (ps.length?'<div class="list" data-k="lista-plantillas">'+ps.map(function(p){
      return '<div class="li" data-k="plant-'+p.id+'"><div class="grow"><div class="n">'+esc(p.nombre)+
        ' <span class="chip chip-eg">Egreso</span></div>'+
        '<div class="m">Día '+p.dia_mes+' · '+p.metodo+' · '+esc(cueById[p.cuenta_id].nombre)+' · '+p.clasificacion+'</div></div>'+
        '<span class="amt">'+fmt(p.monto_estimado,p.moneda)+'</span>'+
        '<span class="btn btn-icon">'+ico("pencil")+'</span></div>';
    }).join("")+'</div>':'');
}

// ── Compartido (hub) y Proyecto ────────────────────────────────────────────
function scrCompartido(){
  const p = S.proyecto;
  return '<div class="between"><div><h1 class="pg">Compartido</h1>'+
      '<p class="sub">Gastos y proyectos compartidos con otros.</p></div>'+
      '<div class="btn btn-default btn-sm" data-k="btn-nuevo-proyecto">'+ico("plus")+'Nuevo proyecto</div></div>'+
    '<div class="tabs" style="max-width:280px"><span class="tab on">Proyectos</span><span class="tab">Todos</span></div>'+
    (p ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
        '<div class="mango-card" style="padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px" data-k="proy-card">'+
        '<div class="row" style="gap:12px"><span style="width:36px;height:36px;border-radius:10px;'+
          'background:rgba(30,58,95,.1);color:var(--primary);display:grid;place-items:center">'+ico("plane")+'</span>'+
        '<div><div style="font-size:13.5px;font-weight:500">'+esc(p.nombre)+'</div>'+
        '<div class="t-mut" style="font-size:11.5px">'+MIEMBROS.length+' miembros · '+p.gastos.length+
          ' gasto'+(p.gastos.length!==1?"s":"")+'</div></div></div>'+
        '<span class="t-mut" style="width:16px">'+ico("right")+'</span></div></div>'
      : '<div style="padding:32px;text-align:center;border:1px dashed var(--border);border-radius:10px" class="t-mut">'+
        'Todavía no tenés proyectos. Creá un viaje, evento o grupo para dividir gastos.</div>');
}

function scrProyecto(){
  const p = S.proyecto, bal = balanceViaje();
  const gastos = p.gastos.map(function(id){ return VIAJE_GASTOS.find(function(g){return g.id===id;}); });
  let saldos = "";
  if (bal && bal.personas.length){
    saldos = '<div class="saldos" data-k="saldos">'+
      '<div class="between"><h2 class="sec">Saldos (ARS)</h2>'+
      (bal.transferencias.length? '<div class="btn btn-outline btn-sm" data-k="btn-saldar">'+ico("check")+'Saldar</div>'
        : '<span class="chip chip-in">saldado</span>')+'</div>'+
      '<div class="col" style="gap:4px">'+bal.personas.map(function(x){
        const cls = x.neto>0.005?"t-succ":x.neto<-0.005?"t-dang":"t-mut";
        return '<div class="between" style="font-size:13.5px"><span>'+esc(x.nombre)+'</span>'+
          '<span class="mono '+cls+'" style="font-weight:500" data-num="neto-'+(x.personaId||"g0")+'">'+
          (x.neto>0.005?"+":"")+fmt(x.neto)+'</span></div>';
      }).join("")+'</div>'+
      (bal.transferencias.length? '<div class="col" style="gap:4px;padding-top:10px;border-top:1px solid rgba(227,220,206,.5)">'+
        '<div class="t-mut" style="font-size:11.5px;font-weight:500">Para saldar:</div>'+
        bal.transferencias.map(function(t){
          return '<div class="transf"><b>'+esc(t.deudorNombre)+'</b>'+ico("arrow")+'<b>'+esc(t.acreedorNombre)+'</b>'+
            '<span class="mono grow" style="text-align:right">'+fmt(t.monto)+'</span></div>';
        }).join("")+'</div>' : '')+
    '</div>';
  }
  return '<div class="row" style="gap:12px;align-items:flex-start">'+
      '<span class="t-mut" data-k="volver">'+ico("left")+'</span>'+
      '<div class="grow"><h1 class="pg" style="font-size:20px">'+esc(p.nombre)+'</h1>'+
      '<p class="sub" style="text-transform:capitalize">viaje · '+MIEMBROS.length+' miembros</p></div>'+
      '<div class="btn btn-default btn-sm" data-k="btn-cargar-gasto">'+ico("plus")+'Cargar gasto</div></div>'+
    saldos+
    '<div class="col" style="gap:8px"><h2 class="sec">Gastos</h2>'+
    (gastos.length?'<div class="list" data-k="lista-gastos">'+gastos.map(function(g){
      return '<div class="li" data-k="vg-'+g.id+'"><div class="grow"><div class="n">'+esc(g.concepto)+'</div>'+
        '<div class="m">Pagó '+esc(memById[g.pagador].nombre)+' · '+g.entre.length+' personas'+
        (g.entre.length<MIEMBROS.length?' <span class="t-warn">(no todos)</span>':'')+'</div></div>'+
        '<span class="amt">'+fmt(g.monto)+'</span>'+
        '<span class="btn btn-icon">'+ico("trash")+'</span></div>';
    }).join("")+'</div>'
      :'<div style="padding:24px;text-align:center;border:1px dashed var(--border);border-radius:10px" class="t-mut">'+
       'Todavía no hay gastos. Cargá el primero.</div>')+'</div>'+
    '<div class="col" style="gap:8px"><h2 class="sec">Miembros</h2>'+
    '<div class="row" style="gap:8px;flex-wrap:wrap">'+MIEMBROS.map(function(m){
      return '<span class="memb">'+avaHtml(m.nombre,m.color)+esc(m.nombre)+
        (m.usuario?'<span class="t-mut" style="font-size:10px">(owner)</span>':'')+'</span>';
    }).join("")+'</div></div>';
}

// ── Balances (la pantalla que ve el otro usuario) ──────────────────────────
function scrBalancesColo(){
  const asado = S.movs.find(function(m){ return m.id==="m15"; });
  const p = asado && asado.participantes ? asado.participantes.find(function(x){return x.nombre==="Colo";}) : null;
  const pagado = p && p.estado === "cobrado";
  return '<div><h1 class="pg">Balances</h1><p class="sub">Lo que debés y lo que te deben.</p></div>'+
    '<div class="mango-card-navy hero" style="padding:22px">'+
      '<div class="mango-blob" style="width:200px;height:200px;right:-60px;top:-70px"></div>'+
      '<div style="position:relative"><div class="hero-lbl">'+(pagado?"Saldado":"Debés en total")+'</div>'+
      '<div class="hero-num" style="font-size:30px" data-num="colo-debe">'+fmt(pagado?0:(p?p.monto:0))+'</div></div></div>'+
    '<div class="col" style="gap:8px"><h2 class="sec">Con otros usuarios</h2>'+
    '<div class="list"><div class="li" data-k="deuda-vos">'+
      '<div class="row" style="gap:10px">'+avaHtml("Vos","#1e3a5f",30)+
      '<div><div class="n">Vos</div><div class="m">Asado · 16/08</div></div></div>'+
      '<div class="row" style="gap:8px">'+
        '<span class="amt '+(pagado?"t-mut":"t-dang")+'">'+(pagado?"Saldado":fmt(p?p.monto:0))+'</span>'+
        (pagado?'':'<span class="btn btn-default btn-sm" data-k="btn-saldar-colo">Saldar</span>')+
      '</div></div></div></div>'+
    (pagado?'<div class="row" style="gap:8px;padding:12px 14px;border-radius:12px;background:rgba(47,158,95,.09);border:1px solid rgba(47,158,95,.2)">'+
      '<span class="t-succ">'+ico("check2")+'</span>'+
      '<span style="font-size:12.5px" class="t-succ">Le transferiste tu parte. Ya está descontado de tu balance.</span></div>':'');
}

// ── Estadísticas ───────────────────────────────────────────────────────────
const CORTES = [["categoria","Categoría"],["metodo","Medio de pago"],["cuenta","Cuenta"],["necesidad","Necesidad"]];
function scrEstadisticas(){
  const st = S.stats;
  const ing = resumenCorte(st.mes, st.moneda, "Ingreso", st.corte);
  const egr = resumenCorte(st.mes, st.moneda, "Egreso", st.corte);
  const res = st.tab==="ingresos" ? ing : egr;
  return '<div><h1 class="pg">Estadísticas</h1>'+
    '<p class="sub">Ingresos y gastos del mes. Cambiá el corte para ver la misma plata agrupada distinto.</p></div>'+
    '<div class="mango-card between" style="padding:6px 8px;max-width:560px">'+
      '<span class="btn btn-icon" style="width:34px;height:34px" data-k="mes-prev">'+ico("left")+'</span>'+
      '<span style="font-size:13.5px;font-weight:600;text-transform:capitalize" data-k="mes-label">'+mesLabel(st.mes)+'</span>'+
      '<span class="btn btn-icon" style="width:34px;height:34px" data-k="mes-next">'+ico("right")+'</span></div>'+
    '<div class="row" style="gap:6px;flex-wrap:wrap" data-k="cortes">'+CORTES.map(function(c){
      return '<span class="pill'+(st.corte===c[0]?" on":"")+'" data-k="corte-'+c[0]+'">'+c[1]+'</span>'; }).join("")+'</div>'+
    '<div class="row" style="gap:6px">'+["ARS","USD"].map(function(mo){
      return '<span class="pill'+(st.moneda===mo?" on":"")+'" data-k="mon-'+mo+'">'+mo+'</span>'; }).join("")+'</div>'+
    '<div class="tabs" style="max-width:560px">'+
      '<span class="tab'+(st.tab==="ingresos"?" on":"")+'" data-k="tab-ingresos"><span>Ingresos</span>'+
        '<span class="mono t-succ" style="font-size:12px">'+fmt(ing.total,st.moneda)+'</span></span>'+
      '<span class="tab'+(st.tab==="egresos"?" on":"")+'" data-k="tab-egresos"><span>Gastos</span>'+
        '<span class="mono t-dang" style="font-size:12px">'+fmt(egr.total,st.moneda)+'</span></span></div>'+
    (res.filas.length
      ? '<div class="row" style="gap:26px;align-items:flex-start" data-k="torta">'+
        donut(res.filas, st.moneda, st.tab==="ingresos"?"Ingresos":"Gastos", res.total)+
        '<div class="grow list">'+res.filas.map(function(f,i){
          return '<div><div class="lg"><span style="width:14px;color:var(--muted-foreground)">'+
            (f.hijos.length?ico("down"):'')+'</span>'+
            '<span class="dot" style="background:'+COLORES[i%COLORES.length]+'"></span>'+
            '<span class="grow trunc" style="font-weight:500">'+esc(f.nombre)+'</span>'+
            '<span class="t-mut" style="font-size:11.5px">'+f.porcentaje+'%</span>'+
            '<span class="mono" style="font-weight:600;width:112px;text-align:right">'+fmt(f.monto,st.moneda)+'</span></div>'+
            (i===0&&f.hijos.length?'<div style="background:var(--surface);padding-bottom:4px">'+
              f.hijos.map(function(h){
                return '<div class="row" style="gap:12px;padding:5px 14px 5px 44px">'+
                  '<span class="t-mut grow trunc" style="font-size:12px">'+esc(h.nombre)+'</span>'+
                  '<span class="t-mut mono" style="font-size:11px">'+h.porcentaje+'%</span>'+
                  '<span class="mono" style="font-size:12px;width:112px;text-align:right">'+fmt(h.monto,st.moneda)+'</span></div>';
              }).join("")+'</div>':'')+'</div>';
        }).join("")+'</div></div>'
      : '<div style="padding:40px;text-align:center;border:1px dashed var(--border);border-radius:10px" class="t-mut">'+
        'No hay '+(st.tab==="ingresos"?"ingresos":"gastos")+' en este mes.</div>');
}
