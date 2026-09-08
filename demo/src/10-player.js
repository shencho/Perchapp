
/* ═══════════════════════════════════════════════════════════════════════════
   15. REPRODUCTOR
   ═══════════════════════════════════════════════════════════════════════════ */
var playing = false, T = 0, speed = 1;
let cursorIdx = 0, curEntered = false, started = false;

function fullReset(){
  resetState();
  S.pago = {}; S.gen = {}; S.genMonto = {}; S.importadas = 0; S.toast2 = null;
  cursorIdx = 0; curEntered = false;
  setChapter(null); setSpot(null); setCallout(null);
  S.hudFlash = {}; clearTimeout(flashTimer);
  $("#outro").classList.remove("on");
  elCur.classList.remove("off");
  setCursor(800, 500);
  dirty();
}

function applyUpTo(t){
  const N = SCRIPT.length;
  while (cursorIdx < N && ST[cursorIdx].end <= t){
    const s = SCRIPT[cursorIdx];
    if (!curEntered && s.enter) s.enter();
    if (s.done) s.done();
    cursorIdx++; curEntered = false;
  }
  if (cursorIdx < N){
    const s = SCRIPT[cursorIdx];
    if (!curEntered){ if (s.enter) s.enter(); curEntered = true; }
    const d = ST[cursorIdx].dur;
    const p = d > 0 ? (t - ST[cursorIdx].start) / d : 1;
    if (s.tick) s.tick(Math.max(0, Math.min(1, p)));
  }
}

function seek(t){
  t = Math.max(0, Math.min(TOTAL, t));
  silent = true;
  if (t < T || cursorIdx >= SCRIPT.length){ fullReset(); }
  applyUpTo(t);
  silent = false;
  T = t;
  if (needRender){ needRender = false; render(); }
  updateBar(); showTry();
  stage.classList.add("jump");
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    stage.classList.remove("jump"); }); });
}

function play(){
  if (!AC) initAudio();
  if (AC && AC.state === "suspended") AC.resume();
  if (T >= TOTAL) seek(0);
  playing = true; updatePlayBtn(); showTry();
}
function pause(){ playing = false; updatePlayBtn(); showTry(); }
function toggle(){ playing ? pause() : play(); }

let last = performance.now();
function loop(now){
  const dt = Math.min(0.06, (now - last) / 1000); last = now;
  if (needRender){ needRender = false; render(); }
  if (playing){
    T += dt * speed;
    if (T >= TOTAL){ T = TOTAL; playing = false; updatePlayBtn(); }
    applyUpTo(T);
    if (needRender){ needRender = false; render(); }
    updateBar();
  }
  requestAnimationFrame(loop);
}

/* ── Controles ───────────────────────────────────────────────────────────── */
const elBar = $("#bar"), elFill = elBar.querySelector(".fill"), elKnob = elBar.querySelector(".knob");
const elTime = $("#time"), elChips = $("#chips"), elPlay = $("#btnPlay");
const IC_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>';
const IC_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>';
const IC_SND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const IC_MUTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4zM17 9l5 6M22 9l-5 6"/></svg>';

function mmss(s){ const m = Math.floor(s/60); return m+":"+String(Math.floor(s%60)).padStart(2,"0"); }
function updatePlayBtn(){ elPlay.innerHTML = playing ? IC_PAUSE : IC_PLAY; }
function updateBar(){
  const p = TOTAL > 0 ? T/TOTAL : 0;
  elFill.style.width = (p*100)+"%"; elKnob.style.left = (p*100)+"%";
  elTime.textContent = mmss(T)+" / "+mmss(TOTAL);
  const cur = currentChapter();
  Array.prototype.forEach.call(elChips.children, function(c,i){ c.classList.toggle("on", i===cur); });
}
function currentChapter(){
  let c = -1;
  for (let i=0;i<CH_START.length;i++) if (CH_START[i] !== undefined && T >= CH_START[i]-0.01) c = i;
  return c;
}
function updateChips(){}

function buildChips(){
  elChips.innerHTML = "";
  CHAPS.forEach(function(t,i){
    const b = document.createElement("button");
    b.className = "cchip"; b.textContent = (i+1)+". "+t;
    b.onclick = function(){ seek((CH_START[i]||0)+0.02); };
    elChips.appendChild(b);
  });
  CH_START.forEach(function(s){
    if (s === undefined) return;
    const m = document.createElement("div");
    m.className = "mark"; m.style.left = (s/TOTAL*100)+"%";
    elBar.appendChild(m);
  });
}

let dragging = false;
function barSeek(e){
  const r = elBar.getBoundingClientRect();
  seek(Math.max(0, Math.min(1, (e.clientX - r.left)/r.width)) * TOTAL);
}
elBar.addEventListener("pointerdown", function(e){ dragging = true; elBar.setPointerCapture(e.pointerId); barSeek(e); });
elBar.addEventListener("pointermove", function(e){ if (dragging) barSeek(e); });
elBar.addEventListener("pointerup", function(){ dragging = false; });

elPlay.onclick = toggle;
$("#btnBack").onclick = function(){
  const c = currentChapter();
  const target = (c > 0 && T - (CH_START[c]||0) < 1.5) ? c-1 : Math.max(0,c);
  seek(c < 0 ? 0 : (CH_START[target]||0)+0.02);
};
$("#btnFwd").onclick = function(){
  const c = currentChapter();
  if (c+1 < CHAPS.length && CH_START[c+1] !== undefined) seek(CH_START[c+1]+0.02);
  else seek(TOTAL);
};
$("#btnSpeed").onclick = function(){
  speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
  $("#btnSpeed").textContent = speed+"x";
};
function applyMute(){
  $("#btnMute").innerHTML = muted ? IC_MUTE : IC_SND;
  if (masterG && AC) masterG.gain.setTargetAtTime(muted?0:1, AC.currentTime, 0.05);
  try { localStorage.setItem("mango_demo_mute", muted?"1":"0"); } catch(e){}
}
$("#btnMute").onclick = function(){ muted = !muted; applyMute(); };
$("#btnFull").onclick = function(){
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
};
document.addEventListener("keydown", function(e){
  if (e.key === "d"){ autotest(); return; }
  if (!started) return;
  if (e.code === "Space"){ e.preventDefault(); toggle(); }
  else if (e.code === "ArrowRight"){ seek(T+5); }
  else if (e.code === "ArrowLeft"){ seek(T-5); }
  else if (e.key >= "1" && e.key <= "8"){ const i = +e.key-1;
    if (CH_START[i] !== undefined) seek(CH_START[i]+0.02); }
  else if (e.key === "m"){ muted = !muted; applyMute(); }
});

/* ── Interactividad: en pausa, la app responde ───────────────────────────── */
stage.addEventListener("click", function(e){
  if (playing) return;
  const el = e.target.closest("[data-k]"); if (!el) return;
  const k = el.dataset.k;
  let hit = true;
  let m;
  if ((m = /^chk-(\d+)-(\d+)$/.exec(k))){
    const key = m[1]+":"+m[2]; S.picks[key] = !S.picks[key];
  } else if ((m = /^chk-(\d+)$/.exec(k)) && S.modal === "importar"){
    const i = +m[1], subs = TEMPLATE[i].subs;
    const all = subs.every(function(_,si){ return S.picks[i+":"+si]; });
    subs.forEach(function(_,si){ S.picks[i+":"+si] = !all; });
  } else if (k === "hero-ARS" || k === "hero-USD"){
    const mo = k.slice(5);
    S.heroMoneda = S.heroMoneda === mo ? null : mo;
  } else if (k.indexOf("corte-") === 0){ S.stats.corte = k.slice(6); }
  else if (k.indexOf("mon-") === 0){ S.stats.moneda = k.slice(4); }
  else if (k.indexOf("tab-") === 0){ S.stats.tab = k.slice(4); }
  else if (k === "mes-prev"){ S.stats.mes = mesAnterior(S.stats.mes); }
  else if (k === "mes-next"){
    const d = parseISO(S.stats.mes+"-01"), n = new Date(d.getFullYear(), d.getMonth()+1, 1);
    S.stats.mes = n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0");
  }
  else if (k === "f-pago-USD"){
    const cur = String(S.pago.USD||"");
    S.pago.USD = cur === "54.74" ? "30" : cur === "30" ? "12" : "54.74";
  }
  else if (k === "f-pago-ARS"){
    const cur = String(S.pago.ARS||"");
    S.pago.ARS = cur === "373800" ? "200000" : "373800";
  }
  else hit = false;
  if (hit){ sfx("tap"); dirty(); if (needRender){ needRender=false; render(); } }
});

/* ═══════════════════════════════════════════════════════════════════════════
   16. AUTOTEST (?debug=1) — la demo no puede mentir
   ═══════════════════════════════════════════════════════════════════════════ */
function casoDeAceptacion(){
  const pag = [ {personaId:null,nombre:"Vos",montoPagado:85000},
    {personaId:"manu",nombre:"P2",montoPagado:73000},
    {personaId:"kiti",nombre:"P3",montoPagado:52000} ];
  const par = ["__u","manu","kiti","p4","p5"].map(function(id){
    return {personaId: id==="__u"?null:id, nombre:id, montoConsumido:42000}; });
  const r = calcularBalanceGrupal(pag, par, "Vos");
  const esp = {"__usuario__":43000, manu:31000, kiti:10000, p4:-42000, p5:-42000};
  const errs = [];
  r.personas.forEach(function(p){
    const k = p.personaId || "__usuario__";
    if (Math.abs(p.neto - esp[k]) > 0.01) errs.push(p.nombre+": "+p.neto+" ≠ "+esp[k]);
  });
  if (r.transferencias.length !== 4) errs.push("transferencias="+r.transferencias.length+" ≠ 4");
  const tt = r.transferencias.reduce(function(s,t){ return s+t.monto; },0);
  if (Math.abs(tt-84000) > 0.01) errs.push("total transf="+tt+" ≠ 84000");
  return errs;
}

function autotest(){
  const out = [];
  function ok(name, cond, got, want){
    out.push('<div class="'+(cond?"ok":"bad")+'">'+(cond?"✓":"✗")+" "+name+
      (cond?"":"  →  "+got+"  (esperado "+want+")")+'</div>');
  }
  const errs = casoDeAceptacion();
  ok("balance grupal · caso de aceptación (5 personas, $210.000, 4 transferencias)",
     errs.length===0, errs.join(" | "), "sin errores");

  seek(TOTAL);
  const esperado = {c1:1742000, c2:91266.67, c3:43000, c4:3845.26};
  for (const id in esperado){
    const v = saldoCuenta(id);
    ok("saldo "+cueById[id].nombre, Math.abs(v-esperado[id])<0.02, v, esperado[id]);
  }
  const sumaARS = saldoCuenta("c1")+saldoCuenta("c2")+saldoCuenta("c3");
  ok("patrimonio ARS = suma de las tres cuentas en pesos",
     Math.abs(patrimonio("ARS")-sumaARS)<0.02, patrimonio("ARS"), sumaARS);

  // Ciclo de la VISA en el momento del cierre
  const guardado = S.hoy; S.hoy = "2026-08-21";
  const r = resumenTarjeta("t1");
  ok("ciclo VISA = 21/07 → 20/08", r.ciclo.inicio==="2026-07-21" && r.ciclo.fin==="2026-08-20",
     r.ciclo.inicio+" → "+r.ciclo.fin, "2026-07-21 → 2026-08-20");
  ok("VISA · consumos ARS del ciclo", Math.abs(r.saldos.ARS.total-373800)<0.01, r.saldos.ARS.total, 373800);
  ok("VISA · consumos USD del ciclo", Math.abs(r.saldos.USD.total-57.99)<0.01, r.saldos.USD.total, 57.99);
  ok("VISA · devoluciones USD restan", Math.abs(r.saldos.USD.devoluciones-3.25)<0.01,
     r.saldos.USD.devoluciones, 3.25);
  S.hoy = guardado;

  const rf = resumenTarjeta("t1");
  ok("VISA queda saldada tras el pago", rf.pagado === true, "pagado="+rf.pagado, "true");

  const bal = balanceViaje();
  ok("viaje · el reparto cierra en cero",
     Math.abs(bal.totalPagado-bal.totalConsumido)<0.02, bal.totalPagado+" vs "+bal.totalConsumido, "iguales");
  ok("viaje · 3 transferencias mínimas", bal.transferencias.length===3, bal.transferencias.length, 3);
  const tot = bal.transferencias.reduce(function(s,t){ return s+t.monto; },0);
  ok("viaje · suma de transferencias = crédito de Vos", Math.abs(tot-308083.34)<0.05, tot, 308083.34);

  const ago = totalesMes("2026-08","ARS");
  const jul = totalesMes("2026-07","ARS");
  ok("agosto · sólo tu parte del gasto compartido cuenta",
     Math.abs(ago.egresos-1108066.66)<0.05, ago.egresos, 1108066.66);
  ok("julio existe como mes anterior (para el delta del hero)", jul.egresos>0, jul.egresos, ">0");

  const bad = out.filter(function(s){ return s.indexOf("bad")>=0; }).length;
  const box = $("#dbg"); box.classList.add("on");
  box.innerHTML = '<div style="font-weight:700;margin-bottom:8px;color:'+(bad?"#ff9b9b":"#7fe0aa")+'">'+
    (bad ? bad+" FALLO(S)" : "TODO OK · "+out.length+" comprobaciones")+'</div>'+out.join("");
  seek(0);
}

/* ═══════════════════════════════════════════════════════════════════════════
   17. ARRANQUE
   ═══════════════════════════════════════════════════════════════════════════ */
$("#titleMark").outerHTML = mkHtml(64);
$("#pillars").innerHTML = [
  ["wallet","Cuentas reales","Saldo inicial y cada movimiento aplicado. Pesos y dólares sin mezclar."],
  ["card","Tarjetas con ciclo","Cierre, vencimiento, cuotas y devoluciones. El resumen se arma solo."],
  ["refresh","Recurrentes","Lo que se repite avisa antes de vencer y se genera con un toque."],
  ["users","Compartido","El otro también usa MANGO: ve la deuda y la salda desde su teléfono."],
  ["pie","Estadísticas","La misma plata por categoría, medio de pago, cuenta o necesidad."],
].map(function(p){
  return '<div class="pil"><div class="ic">'+ico(p[0])+'</div><b>'+p[1]+'</b><span>'+p[2]+'</span></div>';
}).join("");

buildChips();
updatePlayBtn();
applyMute();
fitStage();
fullReset();
render();
seek(0);
requestAnimationFrame(loop);

$("#btnStart").onclick = function(){
  started = true;
  $("#title").classList.add("off");
  initAudio();
  setTimeout(function(){ play(); }, 450);
};

// Gancho de inspección: window.__demo.seek(120) salta al segundo 120.
window.__demo = { seek:seek, play:play, pause:pause, autotest:autotest,
  estado:S, total:function(){ return TOTAL; }, caps:CH_START };

if (/[?&]debug=1/.test(location.search)) setTimeout(autotest, 400);

})();
</script>
