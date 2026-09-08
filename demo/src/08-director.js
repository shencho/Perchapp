
/* ═══════════════════════════════════════════════════════════════════════════
   10. LAYOUT DEL ESCENARIO
   ═══════════════════════════════════════════════════════════════════════════ */
const stage = $("#stage"), stageBox = $("#stageBox");
function fitStage(){
  const w = stageBox.clientWidth, h = stageBox.clientHeight;
  // Si el contenedor todavía no midió (pestaña en segundo plano, panel oculto)
  // una escala 0 dejaría todas las mediciones en NaN y el cursor no se movería.
  if (w < 40 || h < 40) return;
  const s = Math.min(w/1600, h/900);
  stage.style.transform = "translate(-50%,-50%) scale("+s+")";
  stage.dataset.scale = s;
}
window.addEventListener("resize", fitStage);
document.addEventListener("visibilitychange", fitStage);
if (window.ResizeObserver) new ResizeObserver(fitStage).observe(stageBox);

function place(el, x, y, s){
  el.style.transform = "translate("+x+"px,"+y+"px) scale("+s+")";
}
function layoutFrames(){
  const hud = S.hud;
  if (S.route2){                        // split: dos teléfonos, sin HUD
    const s = 0.70, w = 390*s;
    place(frPhone,  800 - w - 46, 118, s);
    place(frPhone2, 800 + 46,     118, s);
    const tagL = $("#fr2Tag");
    tagL.style.opacity = 1;
    tagL.style.left = "0px"; tagL.style.top = "72px"; tagL.style.width = "1600px";
    tagL.innerHTML = '<div style="display:flex;justify-content:center;gap:'+(92)+'px">'+
      '<div style="width:'+w+'px;text-align:center;font-size:13px;font-weight:700;letter-spacing:.14em;color:var(--gold-light)">TU TELÉFONO</div>'+
      '<div style="width:'+w+'px;text-align:center;font-size:13px;font-weight:700;letter-spacing:.14em;color:var(--gold-light)">EL DE COLO</div></div>';
  } else {
    $("#fr2Tag").style.opacity = 0;
    if (S.device === "desktop"){
      const s = 0.80;
      place(frDesk, hud ? 66 : (1600-1280*s)/2, hud ? 178 : 150, s);
    } else {
      const s = 0.855;
      place(frPhone, hud ? 300 : (1600-390*s)/2, hud ? 108 : 100, s);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. HUD DE SALDOS — la tira que reacciona a cada movimiento
   ═══════════════════════════════════════════════════════════════════════════ */
const elHud = $("#hud");
function renderHud(){
  elHud.classList.toggle("off", !S.hud);
  if (!S.hud) return;
  let h = '<div id="hudDate">'+ico("cal")+'<span>'+fmtLargo(S.hoy)+' de 2026</span></div>';
  h += '<h3>Cuentas</h3><div class="hud-grp">';
  cuentasActivas().forEach(function(c){
    const s = saldoCuenta(c.id), f = S.hudFlash["c"+c.id];
    h += '<div class="hud-r'+(f?" flash-"+f:"")+'"><div><div class="nm">'+esc(c.nombre)+'</div>'+
      '<div class="tp">'+c.tipo+' · '+c.moneda+'</div></div>'+
      '<div class="vl">'+fmt(s,c.moneda)+'</div></div>';
  });
  h += '</div>';
  const ts = tarjetasActivas();
  if (ts.length){
    h += '<h3>Tarjetas · a pagar</h3><div class="hud-grp">';
    ts.forEach(function(t){
      const r = resumenTarjeta(t.id), f = S.hudFlash["t"+t.id];
      const con = Object.keys(r.consumo).filter(function(k){ return r.consumo[k]>0.005; });
      const val = con.length ? con.map(function(k){ return fmt(r.consumo[k],k); }).join(" · ")
                : (r.pagado ? "Pagado" : "$0");
      h += '<div class="hud-r'+(f?" flash-"+f:"")+'"><div><div class="nm">'+esc(t.nombre)+'</div>'+
        '<div class="tp">cierra '+fmtDia(r.ciclo.fin)+' · vence '+fmtDia(r.ciclo.fechaVencimiento)+'</div></div>'+
        '<div class="vl '+(con.length?"dg":r.pagado?"ok":"z")+'">'+val+'</div></div>';
    });
    h += '</div>';
  }
  elHud.innerHTML = h;
}

/* ═══════════════════════════════════════════════════════════════════════════
   12. AUDIO — score y efectos sintetizados. Cero bytes de assets.
   ═══════════════════════════════════════════════════════════════════════════ */
let AC = null, masterG, musicG, sfxG, sched = null, step16 = 0, nextT = 0;
let muted = false;
try { muted = localStorage.getItem("mango_demo_mute") === "1"; } catch(e){}

const BPM = 84, SPB = 60/BPM, S16 = SPB/4;
function mid(n){ return 440*Math.pow(2,(n-69)/12); }
// Progresiones por acto (MIDI). Cada acorde dura 2 compases.
const PROGS = [
  [[53,57,60,64],[57,60,64,67],[50,53,57,60],[55,60,62,65]],   // 0 calmo
  [[50,53,57,60],[46,50,53,57],[53,57,60,64],[48,52,55,59]],   // 1 avance
  [[53,57,60,65],[50,53,57,62],[46,50,53,57],[48,52,55,60]],   // 2 tensión suave
  [[53,57,60,64],[48,52,55,59],[50,53,57,60],[46,50,53,57]],   // 3 resolución
];
let progIdx = 0;

function initAudio(){
  if (AC) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  AC = new Ctx();
  masterG = AC.createGain(); masterG.gain.value = muted ? 0 : 1; masterG.connect(AC.destination);
  musicG = AC.createGain(); musicG.gain.value = 0.34; musicG.connect(masterG);
  sfxG = AC.createGain();  sfxG.gain.value  = 0.5;  sfxG.connect(masterG);
  nextT = AC.currentTime + 0.1; step16 = 0;
  sched = setInterval(scheduler, 60);
}
function scheduler(){
  if (!AC) return;
  while (nextT < AC.currentTime + 0.35){ playStep(step16, nextT); step16++; nextT += S16; }
}
function playStep(i, t){
  const prog = PROGS[progIdx % PROGS.length];
  const bar = Math.floor(i/16), chord = prog[Math.floor(bar/2) % prog.length];
  const b = i % 16;
  if (b === 0 && bar % 2 === 0) pad(chord, t, SPB*8);
  if (b % 2 === 0){                                  // arpegio en corcheas
    const n = chord[(i/2) % chord.length] + 12;
    pluck(mid(n), t, 0.34, 0.030);
  }
  if (b === 0 || b === 8) sub(mid(chord[0]-12), t);   // pulso grave
  if (b % 4 === 2) shaker(t, 0.018);                  // contratiempo
}
function pad(chord, t, dur){
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.052, t+1.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  const f = AC.createBiquadFilter(); f.type="lowpass"; f.frequency.value=900; f.Q.value=0.6;
  const lfo = AC.createOscillator(), lg = AC.createGain();
  lfo.frequency.value = 0.07; lg.gain.value = 340; lfo.connect(lg); lg.connect(f.frequency);
  lfo.start(t); lfo.stop(t+dur);
  g.connect(f); f.connect(musicG);
  chord.forEach(function(n,k){
    const o = AC.createOscillator();
    o.type = k%2 ? "triangle" : "sine";
    o.frequency.value = mid(n) * (k===0?1:1.0008);
    o.connect(g); o.start(t); o.stop(t+dur);
  });
}
function pluck(freq, t, dur, amp){
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = "triangle"; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(amp, t+0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(musicG); o.start(t); o.stop(t+dur+0.02);
}
function sub(freq, t){
  const o = AC.createOscillator(), g = AC.createGain();
  o.type="sine"; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(0.10, t+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t+0.5);
  o.connect(g); g.connect(musicG); o.start(t); o.stop(t+0.55);
}
let noiseBuf = null;
function noise(){
  if (!noiseBuf){
    noiseBuf = AC.createBuffer(1, AC.sampleRate*0.5, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  const s = AC.createBufferSource(); s.buffer = noiseBuf; return s;
}
function shaker(t, amp){
  const s = noise(), g = AC.createGain(), f = AC.createBiquadFilter();
  f.type="highpass"; f.frequency.value = 7000;
  g.gain.setValueAtTime(amp,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
  s.connect(f); f.connect(g); g.connect(musicG); s.start(t); s.stop(t+0.06);
}
function duck(on){
  if (!AC) return;
  musicG.gain.setTargetAtTime(on ? 0.17 : 0.34, AC.currentTime, 0.18);
}
let silent = false;
function sfx(kind){
  if (!AC || silent) return;
  const t = AC.currentTime;
  function tone(f, dur, amp, type, delay){
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type||"sine"; o.frequency.value=f;
    const t0 = t+(delay||0);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(amp,t0+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(sfxG); o.start(t0); o.stop(t0+dur+0.02);
  }
  if (kind==="tap")   tone(1180,0.05,0.10,"sine");
  else if (kind==="type") tone(2400,0.014,0.030,"square");
  else if (kind==="ok"){ tone(659,0.16,0.10,"triangle"); tone(988,0.26,0.09,"triangle",0.075); }
  else if (kind==="alert"){ tone(880,0.20,0.11,"sine"); tone(1174,0.30,0.09,"sine",0.13); }
  else if (kind==="cash"){
    tone(96,0.34,0.16,"sine");
    const s=noise(), g=AC.createGain(), f=AC.createBiquadFilter();
    f.type="bandpass"; f.frequency.value=2400; f.Q.value=1.4;
    g.gain.setValueAtTime(0.10,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.28);
    s.connect(f); f.connect(g); g.connect(sfxG); s.start(t); s.stop(t+0.3);
  }
  else if (kind==="coins"){ [1319,1568,1976,2349].forEach(function(f,i){ tone(f,0.13,0.07,"triangle",i*0.055); }); }
  else if (kind==="whoosh"){
    const s=noise(), g=AC.createGain(), f=AC.createBiquadFilter();
    f.type="bandpass"; f.frequency.setValueAtTime(400,t);
    f.frequency.exponentialRampToValueAtTime(3200,t+0.32); f.Q.value=0.8;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.07,t+0.10);
    g.gain.exponentialRampToValueAtTime(0.0001,t+0.36);
    s.connect(f); f.connect(g); g.connect(sfxG); s.start(t); s.stop(t+0.4);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   13. PRIMITIVAS DE ESCENA
   ═══════════════════════════════════════════════════════════════════════════ */
const elCur = $("#cur"), elTap = $("#tap"), elSpot = $("#spot"),
      elCall = $("#callout"), elChap = $("#chap"), elTry = $("#try");
let curX = 800, curY = 500, needRender = true;
function dirty(){ needRender = true; }
function setCursor(x,y){ curX=x; curY=y; elCur.style.transform = "translate("+x+"px,"+y+"px)"; }
function cursorPos(){ return {x:curX,y:curY}; }
function ease(p){ return p<0.5 ? 4*p*p*p : 1-Math.pow(-2*p+2,3)/2; }
function lerp(a,b,p){ return a+(b-a)*p; }

function rectOf(sel){
  const el = document.querySelector(resolveSel(sel));
  if (!el) return null;
  const sr = stage.getBoundingClientRect(), sc = (sr.width/1600) || 1;
  const r = el.getBoundingClientRect();
  return { x:(r.left-sr.left)/sc, y:(r.top-sr.top)/sc, w:r.width/sc, h:r.height/sc };
}
function center(sel){ const r = rectOf(sel); return r ? {x:r.x+r.w/2, y:r.y+r.h/2} : null; }
function ripple(x,y){
  elTap.style.left = x+"px"; elTap.style.top = y+"px";
  elTap.classList.remove("go"); void elTap.offsetWidth; elTap.classList.add("go");
}
const DIMS = ["#dimT","#dimB","#dimL","#dimR"].map(function(s){ return $(s); });
function setSpot(sel, pad){
  const r = sel ? rectOf(sel) : null;
  if (!r){
    elSpot.classList.remove("on");
    DIMS.forEach(function(d){ d.classList.remove("on"); });
    return;
  }
  pad = pad==null?10:pad;
  const x = r.x-pad, y = r.y-pad, w = r.w+pad*2, h = r.h+pad*2;
  elSpot.style.left=x+"px"; elSpot.style.top=y+"px";
  elSpot.style.width=w+"px"; elSpot.style.height=h+"px";
  elSpot.classList.add("on");
  // Cuatro paños que cubren todo menos el recorte.
  const box = [[0,0,1600,Math.max(0,y)],
               [0,y+h,1600,Math.max(0,900-(y+h))],
               [0,y,Math.max(0,x),h],
               [x+w,y,Math.max(0,1600-(x+w)),h]];
  DIMS.forEach(function(d,i){
    d.style.left=box[i][0]+"px"; d.style.top=box[i][1]+"px";
    d.style.width=box[i][2]+"px"; d.style.height=box[i][3]+"px";
    d.classList.add("on");
  });
}
const CALL_POS = {
  bl:{left:"64px",top:"auto",right:"auto",bottom:"78px",transform:"none"},
  bc:{left:"50%",top:"auto",right:"auto",bottom:"64px",transform:"translateX(-50%)"},
  tl:{left:"64px",top:"210px",right:"auto",bottom:"auto",transform:"none"},
  tr:{left:"auto",top:"170px",right:"56px",bottom:"auto",transform:"none"},
  br:{left:"auto",top:"auto",right:"56px",bottom:"78px",transform:"none"},
};
function setCallout(kind, text, where){
  if (!text){ elCall.classList.add("off"); duck(false); return; }
  const p = CALL_POS[where||"bl"];
  for (const k in p) elCall.style[k] = p[k];
  elCall.querySelector(".k").textContent = kind || "";
  elCall.querySelector(".v").innerHTML = text;
  elCall.classList.remove("off"); duck(true);
}
const CHAPS = ["Entrar con Google","Setup en 40 segundos","Cargar de todo",
  "Recurrentes y la alerta","Compartido, y el otro lado","El resumen y cómo se paga",
  "El viaje, dividido","Las estadísticas"];
function setChapter(n){
  if (n === null){ elChap.classList.add("off"); return; }
  S.chapter = n;
  $("#chapNum").textContent = String(n+1).padStart(2,"0");
  $("#chapTtl").textContent = CHAPS[n];
  elChap.classList.remove("off");
  progIdx = [0,0,1,2,1,2,3,3][n] || 0;
  updateChips();
}

/* ── Mutadores de estado con flash en el HUD ─────────────────────────────── */
function snapshot(){
  const o = {};
  cuentasActivas().forEach(function(c){ o["c"+c.id] = saldoCuenta(c.id); });
  tarjetasActivas().forEach(function(t){ const r = resumenTarjeta(t.id);
    o["t"+t.id] = Object.keys(r.consumo).reduce(function(s,k){ return s+r.consumo[k]; },0); });
  return o;
}
let flashTimer = null;
function commitDiff(before){
  if (silent){ S.hudFlash = {}; dirty(); return; }   // saltando: sin destellos
  const after = snapshot(); const fl = {};
  for (const k in after){ if (before[k]===undefined) continue;
    const subio = after[k] > before[k]+0.005, bajo = after[k] < before[k]-0.005;
    if (!subio && !bajo) continue;
    // En una cuenta, subir es bueno. En una tarjeta, subir es más deuda.
    const bueno = k.charAt(0) === "t" ? bajo : subio;
    fl[k] = bueno ? "up" : "dn"; }
  S.hudFlash = fl; dirty();
  clearTimeout(flashTimer);
  flashTimer = setTimeout(function(){ S.hudFlash = {}; dirty(); }, 1400);
}
function addMov(m){
  const before = snapshot();
  S.movs.push(JSON.parse(JSON.stringify(m)));
  commitDiff(before); dirty();
}
function setHoy(iso){ S.hoy = iso; dirty(); }
function setForm(k,v){
  if (k.indexOf("pago-")===0) S.pago[k.slice(5)] = v;
  else if (k.indexOf("gen-")===0) S.genMonto[k.slice(4)] = v;
  else S.form[k] = v;
}
function getForm(k){
  if (k.indexOf("pago-")===0) return S.pago[k.slice(5)];
  if (k.indexOf("gen-")===0) return S.genMonto[k.slice(4)];
  return S.form[k];
}

/* ── Constructores de pasos ──────────────────────────────────────────────── */
const SCRIPT = [];
function push(o){ SCRIPT.push(o); return o; }
function act(fn, dur){ return push({dur:dur||0, done:fn}); }
function wait(dur){ return push({dur:dur}); }
function chapter(n){ return push({dur:0.9, __ch:n, done:function(){ setChapter(n); sfx("whoosh"); }}); }
function say(kind, text, where, dur){
  return push({dur:dur||3.2, enter:function(){ setCallout(kind,text,where); },
    done:function(){ setCallout(kind,text,where); }});
}
function hush(dur){ return push({dur:dur||0.3, done:function(){ setCallout(null); }}); }
function spot(sel, dur, pad){
  return push({dur:dur||1.6, enter:function(){ setSpot(sel,pad); },
    done:function(){ setSpot(sel,pad); }});
}
function unspot(){ return push({dur:0.2, done:function(){ setSpot(null); }}); }
function go(route, device, dur){
  return push({dur:dur||0.7, done:function(){
    if (device) S.device = device;
    S.route = route; S.modal = null; S.sheet = null; S.toast = null;
    S.focus = null; setSpot(null); dirty(); sfx("whoosh");
  }});
}
function tap(sel, after, dur){
  return push({dur:dur||0.85, enter:function(){ this._f = cursorPos(); this._r = false;
      elCur.classList.remove("off"); },
    tick:function(p){
      const to = center(sel) || this._f, e = ease(Math.min(1,p/0.78));
      setCursor(lerp(this._f.x,to.x,e), lerp(this._f.y,to.y,e));
      if (p>=0.78 && !this._r){ this._r = true; ripple(to.x,to.y); sfx("tap"); }
    },
    done:function(){ const to = center(sel); if (to) setCursor(to.x,to.y);
      if (after) after(); dirty(); }});
}
function type(key, text, dur){
  const d = dur || Math.max(0.45, String(text).length*0.052);
  return push({dur:d, enter:function(){ S.focus = key; setForm(key,""); dirty(); },
    tick:function(p){
      const n = Math.round(String(text).length*Math.min(1,p*1.06));
      const want = String(text).slice(0,n);
      if (getForm(key) !== want){ setForm(key,want); dirty(); if (n && n%2===0) sfx("type"); }
    },
    done:function(){ setForm(key,String(text)); S.focus = null; dirty(); }});
}
function pick(key, val, dur){
  return push({dur:dur||0.45, done:function(){ setForm(key,val); dirty(); }});
}
function interactive(txt, dur){
  return push({dur:dur||0.1, enter:function(){ S.interactive = txt || "Tocá vos"; showTry(); },
    done:function(){ S.interactive = txt || "Tocá vos"; showTry(); }});
}
function endInteractive(){
  return push({dur:0.1, done:function(){ S.interactive = null; showTry(); }});
}
function showTry(){
  elTry.classList.toggle("on", !!S.interactive && !playing);
  if (S.interactive) $("#tryTxt").textContent = S.interactive;
}
