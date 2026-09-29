/**
 * 3D Digital Twin page: mounts the React Three Fiber scene, with a Three.js fallback.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import * as THREE from 'three';
import { DB, STATE } from '../core/store.js';
import { simulateTick } from '../simulator/engine.js';
import { activateScenario, clearScenarios } from '../simulator/scenarios.js';
import { twinInit2d } from './fallback2d.js';
import { render, sourceBadge, timeAgo } from '../ui/shell.js';
import { toast } from '../ui/toast.js';
import { clamp, fmt1 } from '../utils/helpers.js';

export function renderTwinPage(){
  const stKey = STATE.selectedStation==='ALL' ? 'MAITRI' : STATE.selectedStation;
  const st = DB.stations[stKey];
  return `
  <div class="page-head"><div><h1>3D Digital Twin <span class="src-badge SIMULATED" style="vertical-align:middle">DIGITAL TWIN — SIMULATED DATA</span></h1><div class="page-sub" id="twinPageSub">Virtual replica of ${st.label} — SEE · MONITOR · SIMULATE · DECIDE. Not connected to live NCPOR station telemetry ${sourceBadge('SIMULATED')}</div></div></div>
  <div id="twin-canvas-wrap" data-stkey="${stKey}">
    <div class="twin-hint">Drag to rotate · Scroll / pinch to zoom · Tap a module for details</div>
    <div class="twin-legend">
      <span><i style="background:var(--ok)"></i>Normal</span><span><i style="background:var(--warn)"></i>Warning</span>
      <span><i style="background:var(--high)"></i>High risk</span><span><i style="background:var(--crit)"></i>Critical</span>
      <span><i style="background:var(--offline)"></i>Offline</span>
    </div>
    <button class="twin-reset" id="twinResetBtn">⟲ Reset view</button>
    <div class="twin-info" id="twinInfo" style="display:none;"></div>
  </div>
  `;
}

export let twinCtx = null; // {scene,camera,renderer,mods,labels,picks,anim,...}
export let twinResizeHandler = null, twinRetryRaf = 0;
export function twinColorFor(health, offline){
  if(offline) return 0x5b6b78;
  if(health<40) return 0xe5484d;
  if(health<65) return 0xff8a3d;
  if(health<82) return 0xf5a623;
  return 0x34d399;
}
export function twinStatus(h,off){ return off?'OFFLINE':h<40?'CRITICAL':h<65?'HIGH RISK':h<82?'WARNING':'NORMAL'; }
export function twinCls(h,off){ return off?'off':h<40?'crit':h<65?'high':h<82?'warn':'ok'; }

export function twinTeardownEngine(c){
  try{
    if(c.scene) c.scene.traverse(o=>{
      if(o.geometry) o.geometry.dispose();
      if(o.material) (Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{ if(m.map) m.map.dispose(); m.dispose(); });
    });
    if(c.renderer){ c.renderer.dispose(); if(c.renderer.forceContextLoss) c.renderer.forceContextLoss(); }
    if(c.cv && c.cv.parentNode) c.cv.parentNode.removeChild(c.cv);
  }catch(e){ console.warn('twin teardown', e); }
  c.scene=null; c.renderer=null;
}
export function disposeTwin(){
  try{ if(window.PolarTwin3D) window.PolarTwin3D.unmountAll(); }catch(e){}
  if(twinRetryRaf){ cancelAnimationFrame(twinRetryRaf); twinRetryRaf=0; }
  if(twinResizeHandler){ window.removeEventListener('resize', twinResizeHandler); twinResizeHandler=null; }
  const c = twinCtx; twinCtx = null;
  if(!c) return;
  if(c.anim) cancelAnimationFrame(c.anim);
  twinTeardownEngine(c);
}

export function twinFallback(wrap, msg){
  wrap.querySelectorAll('canvas,.twin-fallback').forEach(n=>n.remove());
  const d = document.createElement('div'); d.className='twin-fallback';
  d.innerHTML = `<div><b>${msg}</b><div class="small-note">The rest of the dashboard is unaffected.</div><button class="btn primary sm" style="margin-top:10px">Retry 3D Twin</button></div>`;
  wrap.appendChild(d);
  d.querySelector('button').onclick = retryTwin;
}
export function retryTwin(){
  twinForce2d=false;
  if(typeof THREE!=='undefined'){ render(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/128/three.min.js';
  s.onload = ()=>render();
  s.onerror = ()=>toast('Three.js could not be loaded. Check your network connection.','err');
  document.head.appendChild(s);
}

/* Module data — every value comes from DB.stations[...] */
export function twinModule(st, id){
  const b = st.buildings.find(x=>x.id===id), L = st.logistics, E = st.equipment, en = st.energy;
  const pct = v=>fmt1(v)+'%';
  let h = b.health, off = false, rows = [];
  if(id==='hab'){ h = Math.min(h,E.hvac.health); rows=[['HVAC health',pct(E.hvac.health)],['HVAC load',fmt1(en.hvacLoad)+' kW'],['Ambient temp',fmt1(st.env.temp)+' °C']]; }
  else if(id==='lab'){ rows=[['Science supplies',pct(L.science.qty)],['Ambient temp',fmt1(st.env.temp)+' °C'],['Wind',fmt1(st.env.wind)+' km/h']]; }
  else if(id==='gen'){ const [g1,g2]=st.generators; off = g1.status==='OFFLINE' && g2.status==='OFFLINE';
    rows=[['G1 health / load',pct(g1.health)+' / '+pct(g1.load)],['G2 health / load',g2.status==='OFFLINE'?'OFFLINE':pct(g2.health)+' / '+pct(g2.load)],['Output',fmt1(en.generatorOutput)+' kW'],['Backup power',pct(en.backupPower)]]; }
  else if(id==='fuel'){ rows=[['Fuel level',pct(L.fuel.qty)],['Burn rate',(L.fuel.currentRateLd||'—')+' L/day'],['Endurance',fmt1(st.endurance)+' days']]; }
  else if(id==='water'){ rows=[['Pump health',pct(E.waterPump.health)],['Pump status',E.waterPump.status],['Water reserve',pct(L.water.qty)]]; }
  else if(id==='power'){ off = !!st.commsOffline; h = Math.min(h,E.commsRig.health);
    rows=[['Comms link',off?'OFFLINE':'CONNECTED'],['Comms rig',pct(E.commsRig.health)],['Battery',pct(en.batteryState)]]; }
  else if(id==='store'){ const r = Math.min(...['food','medical','spares'].map(k=>L[k].qty/L[k].threshold)); h = Math.min(h, r<1?30:r<1.5?60:100);
    rows=[['Food',pct(L.food.qty)],['Spares',pct(L.spares.qty)],['Medical',pct(L.medical.qty)]]; }
  else if(id==='em'){ rows=[['Readiness',h>=82?'READY':'DEGRADED'],['Medical stock',pct(L.medical.qty)]]; }
  return {name:b.name, health:h, offline:off, rows};
}
export function twinPanel(name,h,off,rows){
  const c = twinCls(h,off);
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start"><h4>${name}</h4><button class="twin-x" data-twinclose title="Close">×</button></div>
    <div style="margin-bottom:8px"><span class="status-pill ${c}">● ${twinStatus(h,off)}</span></div>
    <div class="metric-row"><span>Health</span><b>${off?'—':fmt1(h)+'%'}</b></div>
    <div class="progress ${c==='ok'?'ok':c==='warn'?'warn':'crit'}" style="margin:2px 0 6px"><div style="width:${off?0:clamp(h,0,100)}%"></div></div>
    ${rows.map(r=>`<div class="metric-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
    <div class="metric-row"><span>Risk indicator</span><b>${off?'Unknown':h<40?'Critical':h<65?'High':h<82?'Medium':'Low'}</b></div>
    <div class="metric-row"><span>Last update</span><b>${STATE.lastTickAt?timeAgo(STATE.lastTickAt):'—'}</b></div>
    <div class="small-note">Simulated telemetry</div>`;
}
export function showTwinInfo(){
  const info = document.getElementById('twinInfo'), sel = STATE.twinSelectedObject;
  if(!info) return;
  if(!sel || !twinCtx){ info.style.display='none'; if(twinCtx&&twinCtx.ring) twinCtx.ring.visible=false; return; }
  const st = DB.stations[twinCtx.stKey];
  info.style.display='block';
  if(sel.genId){
    const g = st.generators.find(x=>x.id===sel.genId), off = g.status==='OFFLINE';
    info.innerHTML = twinPanel(g.name, off?0:g.health, off, [['Status',g.status],['Load',fmt1(g.load)+'%'],['Temperature',fmt1(g.temp)+' °C'],['Vibration',fmt1(g.vibration)+' mm/s'],['Runtime',Math.round(g.runtime)+' hrs']]);
  } else {
    const d = twinModule(st, sel.id);
    info.innerHTML = twinPanel(d.name, d.health, d.offline, d.rows);
  }
}
export function twinLabel(ctx,id,d,c){
  const L = ctx.labels[id], key = Math.round(d.health)+'|'+c+'|'+d.offline;
  if(L.key===key) return; L.key = key;
  const g = L.cv.getContext('2d');
  g.clearRect(0,0,384,96);
  g.fillStyle='rgba(5,17,27,.85)'; g.fillRect(2,2,380,92);
  g.strokeStyle='rgba(125,211,252,.4)'; g.lineWidth=2; g.strokeRect(2,2,380,92);
  g.fillStyle='#'+c.toString(16).padStart(6,'0'); g.beginPath(); g.arc(28,48,10,0,6.3); g.fill();
  g.fillStyle='#eaf2f7'; g.font='600 29px sans-serif'; g.textBaseline='middle'; g.fillText(L.text,50,36);
  g.fillStyle='#8ca3b8'; g.font='500 22px monospace'; g.fillText(d.offline?'OFFLINE':Math.round(d.health)+'% · '+twinStatus(d.health,false),50,68);
  L.tex.needsUpdate = true;
}

export const TW_IDS=['hab','lab','gen','fuel','water','power','store','em'];
export const TW_NAMES={hab:'Main Habitat',lab:'Laboratory',gen:'Generator Shed',fuel:'Fuel Farm',water:'Water Treatment',power:'Power / Comms Tower',store:'Storage & Cold Store',em:'Emergency Shelter'};
export let twinForce2d = false;

export function twinUpdateColors(){
  const ctx = twinCtx; if(!ctx) return;
  const st = DB.stations[ctx.stKey];
  TW_IDS.forEach(id=>{
    const d = twinModule(st,id), c = twinColorFor(d.health,d.offline);
    ctx.data[id] = {d,c};
    if(ctx.mods && ctx.mods[id]){ const M=ctx.mods[id]; M.mats.concat(M.glow).forEach(m=>{ m.color.setHex(c); m.emissive.setHex(c); }); twinLabel(ctx,id,d,c); }
  });
  ['G1','G2'].forEach(gid=>{
    const g = st.generators.find(x=>x.id===gid); if(!g) return;
    const c = twinColorFor(g.status==='OFFLINE'?0:g.health, g.status==='OFFLINE'); ctx.gcol[gid]=c;
    if(ctx.gdots && ctx.gdots[gid]){ ctx.gdots[gid].color.setHex(c); ctx.gdots[gid].emissive.setHex(c); }
  });
  ctx.fuelQty = st.logistics.fuel.qty;
  if(ctx.fuelBar) ctx.fuelBar.scale.y = 0.15 + 3*clamp(ctx.fuelQty,0,100)/100;
  if(STATE.twinSelectedObject) showTwinInfo();
}

export function buildTwinScene(ctx){
  const T = THREE, scene = ctx.scene;
  const edgeMat = new T.LineBasicMaterial({color:0xbfe9ff, transparent:true, opacity:.35});
  const mats = {
    n:new T.MeshStandardMaterial({color:0x9db2c2,roughness:.7,metalness:.2}),
    d:new T.MeshStandardMaterial({color:0x22384a,roughness:.8}),
    g:new T.MeshStandardMaterial({color:0x0b2a3a,emissive:0x38bdf8,emissiveIntensity:.4}),
  };
  const mods = ctx.mods = {}; ctx.gdots = {}; ctx.picks = [];
  const add = (id,geo,x,y,z,k)=>{
    let mat = mats[k];
    if(k==='s'||k==='b') mat = new T.MeshStandardMaterial({color:0x34d399,emissive:0x34d399,emissiveIntensity:k==='b'?.9:.08,roughness:.55,metalness:.15});
    const m = new T.Mesh(geo,mat); m.position.set(x,y,z);
    m.add(new T.LineSegments(new T.EdgesGeometry(geo),edgeMat));
    m.userData = {id}; scene.add(m);
    const M = mods[id] || (mods[id]={mats:[],glow:[],meshes:[]});
    M.meshes.push(m); ctx.picks.push(m);
    if(k==='s') M.mats.push(mat); if(k==='b') M.glow.push(mat);
    return m;
  };
  const Bx=(w,h,d)=>new T.BoxGeometry(w,h,d), Cy=(r1,r2,h,s)=>new T.CylinderGeometry(r1,r2,h,s||18), Sp=r=>new T.SphereGeometry(r,14,12);
  const A = (id,ox,oz)=>(geo,x,y,z,k)=>add(id,geo,ox+x,y,oz+z,k);
  let a;
  // Main habitat — raised on stilts
  a=A('hab',-7,-3.5);
  [[-3.6,-1.9],[3.6,-1.9],[-3.6,1.9],[3.6,1.9]].forEach(p=>a(Bx(.4,1,.4),p[0],.5,p[1],'n'));
  a(Bx(8,3,4.4),0,2.5,0,'s'); a(Bx(8.4,.25,4.8),0,4.1,0,'d');
  a(Bx(6.4,.6,.06),0,2.9,2.23,'g'); a(Bx(6.4,.6,.06),0,2.9,-2.23,'g'); a(Sp(.28),3,4.55,0,'b');
  // Laboratory
  a=A('lab',-7,3.5);
  a(Bx(6,2.4,3.6),0,1.2,0,'s'); a(Bx(6.3,.2,3.9),0,2.5,0,'d'); a(Bx(4.5,.5,.06),0,1.5,-1.83,'g');
  a(Cy(.7,.2,.5),-1.5,2.85,0,'n'); a(Sp(.25),2.4,2.9,0,'b');
  // Generator shed
  a=A('gen',3,-4.5);
  a(Bx(5,2.8,3.4),0,1.4,0,'s'); a(Bx(5.3,.2,3.7),0,2.9,0,'d');
  a(Cy(.22,.22,2),-1.6,3.9,-1,'d'); a(Cy(.22,.22,2),-.8,3.9,-1,'d'); a(Bx(3.6,.6,.06),0,1.5,1.72,'g');
  ['G1','G2'].forEach((gid,i)=>{ const m=a(Sp(.34),-1+i*2,3.55,.4+ (i?0:0),'b'); m.userData.genId=gid; mods.gen.glow.pop(); ctx.gdots[gid]=m.material; });
  // Fuel farm — three cylindrical tanks + level gauge
  a=A('fuel',0,0);
  [[8.2,-5.8],[11,-5.8],[9.6,-3.3]].forEach(p=>{ a(Cy(1.25,1.25,3.2,22),p[0],1.6,p[1],'s'); a(Cy(1.3,1.3,.12,22),p[0],3.26,p[1],'d'); });
  a(Bx(3.8,.15,.15),9.6,.9,-4.6,'d');
  const bar = a(Bx(.35,1,.35).translate(0,.5,0),12.9,0,-4.5,'b'); ctx.fuelBar = bar;
  // Water treatment
  a=A('water',4.5,3.5);
  a(Bx(4.4,2.4,3.4),0,1.2,0,'s'); a(Bx(4.7,.2,3.7),0,2.5,0,'d'); a(Cy(.9,.9,3.4,20),3.3,1.7,0,'n'); a(Bx(1.6,.15,.15),1.9,1,0,'d'); a(Sp(.25),0,2.9,0,'b');
  // Power / comms tower
  a=A('power',11,3.5);
  a(Bx(2.2,.8,2.2),0,.4,0,'s'); a(Cy(.18,.4,9.5,10),0,5.55,0,'n');
  a(Bx(3,.1,.1),0,8,0,'n'); a(Bx(2.2,.1,.1),0,6.4,0,'n');
  const dish = a(new T.SphereGeometry(.9,16,10,0,6.283,0,1.57),.9,7.2,.4,'n'); dish.rotation.x=-1.2;
  a(Sp(.3),0,10.5,0,'b');
  // Storage & cold warehouse
  a=A('store',-1,7);
  a(Bx(6,2.4,3.4),0,1.2,0,'s'); a(Bx(6.3,.2,3.7),0,2.5,0,'d'); a(Bx(1.6,1.8,.06),1.5,.9,-1.73,'d');
  a(Cy(.25,.25,.6),-1.6,2.9,0,'n'); a(Cy(.25,.25,.6),-.6,2.9,0,'n'); a(Sp(.25),2.4,2.85,0,'b');
  // Emergency shelter — dome
  a=A('em',-14,0);
  a(new T.SphereGeometry(1.9,20,12,0,6.283,0,1.5708),0,0,0,'s'); a(Bx(.8,1.1,.06),0,.55,1.75,'d'); a(Sp(.22),0,2.15,0,'b');

  // Ground, paths, grid
  const ground = new T.Mesh(new T.CircleGeometry(30,64), new T.MeshStandardMaterial({color:0xa9c2d3,roughness:1}));
  ground.rotation.x=-Math.PI/2; scene.add(ground);
  const rim = new T.Mesh(new T.RingGeometry(29.6,30,64), new T.MeshBasicMaterial({color:0x38bdf8,transparent:true,opacity:.35,side:T.DoubleSide}));
  rim.rotation.x=-Math.PI/2; rim.position.y=.03; scene.add(rim);
  const grid = new T.GridHelper(56,56,0x3f7a96,0x6f9bb3); grid.position.y=.02; grid.material.transparent=true; grid.material.opacity=.28; scene.add(grid);
  const pm = new T.MeshStandardMaterial({color:0x2a4356,roughness:.9});
  const path=(w,d,x,z)=>{ const m=new T.Mesh(new T.BoxGeometry(w,.06,d),pm); m.position.set(x,.04,z); scene.add(m); };
  path(26,1.2,-1,0);
  [[-7,-3.5],[-7,3.5],[3,-4.5],[10,-5],[4.5,3.5],[11,3.5],[-1,7]].forEach(p=>path(1,Math.abs(p[1]),p[0],p[1]/2));

  // Lights
  scene.add(new T.AmbientLight(0xb5d4ea,.7));
  const dir = new T.DirectionalLight(0xffffff,.85); dir.position.set(14,24,10); scene.add(dir);
  const acc = new T.PointLight(0x38bdf8,.7,80); acc.position.set(-12,10,12); scene.add(acc);

  // Labels (sprites) + selection ring
  const names = {hab:'Main Habitat',lab:'Laboratory',gen:'Generator Shed',fuel:'Fuel Farm',water:'Water Treatment',power:'Power / Comms Tower',store:'Storage & Cold Store',em:'Emergency Shelter'};
  ctx.labels = {}; ctx.bounds = {};
  Object.keys(mods).forEach(id=>{
    const box = new T.Box3(); mods[id].meshes.forEach(m=>{ if(!m.userData.genId) box.expandByObject(m); });
    const c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3());
    ctx.bounds[id] = {c, r:Math.max(s.x,s.z)/2+.4};
    const cv = document.createElement('canvas'); cv.width=384; cv.height=96;
    const tex = new T.CanvasTexture(cv);
    const sp = new T.Sprite(new T.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
    sp.scale.set(6.2,1.55,1); sp.position.set(c.x, box.max.y+1.4, c.z); sp.renderOrder=10; scene.add(sp);
    ctx.labels[id] = {cv,tex,text:names[id],key:''};
  });
  ctx.ring = new T.Mesh(new T.RingGeometry(.92,1,48), new T.MeshBasicMaterial({color:0x7dd3fc,side:T.DoubleSide,transparent:true,opacity:.9}));
  ctx.ring.rotation.x=-Math.PI/2; ctx.ring.position.y=.08; ctx.ring.visible=false; scene.add(ctx.ring);
}


export function twinFitR(aspect){ return clamp(32*Math.max(1,1.6/aspect),24,64); }

/* ================= Engine A: Three.js / WebGL ================= */
export function twinInit3d(ctx,w,h){
  const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 500);
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  ctx.scene=scene; ctx.camera=camera; ctx.renderer=renderer;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(w,h);
  const cv = ctx.cv = renderer.domElement;
  ctx.wrap.insertBefore(cv, ctx.wrap.firstChild);
  buildTwinScene(ctx);
  ctx.draw = ()=>{
    const cx=-1.5, cy=1.4, cz=.5;
    camera.position.set(cx+ctx.r*Math.cos(ctx.el)*Math.sin(ctx.az), cy+ctx.r*Math.sin(ctx.el), cz+ctx.r*Math.cos(ctx.el)*Math.cos(ctx.az));
    camera.lookAt(cx,cy,cz);
    renderer.render(scene,camera);
    if(ctx.frames===2){ // blank-output probe (read pixels in the same frame as the draw)
      let solid=0;
      try{
        const gl=renderer.getContext(), bw=gl.drawingBufferWidth, bh=gl.drawingBufferHeight, b=new Uint8Array(4);
        for(let i=1;i<6;i++) for(let j=1;j<5;j++){ gl.readPixels(Math.floor(bw*i/6),Math.floor(bh*j/5),1,1,gl.RGBA,gl.UNSIGNED_BYTE,b); if(b[3]>0) solid++; }
      }catch(_){ solid=99; }
      if(solid<3) throw new Error('WebGL rendered a blank frame');
    }
  };
  ctx.resize = (w2,h2)=>{ camera.aspect=w2/h2; camera.updateProjectionMatrix(); renderer.setSize(w2,h2); };
  ctx.pick = e=>{
    const rect = cv.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX-rect.left)/rect.width)*2-1, -((e.clientY-rect.top)/rect.height)*2+1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(mouse, camera);
    const hits = rc.intersectObjects(ctx.picks, false);
    return hits.length ? hits[0].object.userData : null;
  };
  cv.addEventListener('webglcontextlost', e=>{ e.preventDefault(); twinEngineFail(ctx,new Error('WebGL context lost')); });
}

/* ================= Engine B: built-in software 3D (Canvas 2D) =================
   Needs neither Three.js nor WebGL. Same layout, colours, labels and interaction. */

export function twinEngineFail(ctx,err){
  console.warn('Twin engine failed:', err);
  if(twinCtx!==ctx) return;
  if(ctx.engine==='three' && !twinForce2d){ twinForce2d=true; disposeTwin(); initTwin(0); }
  else twinFail(err);
}
export function initTwin(tries){
  tries = tries||0;
  const wrap = document.getElementById('twin-canvas-wrap');
  if(!wrap || STATE.route!=='twin') return;
  const stKey = wrap.dataset.stkey;
  try{
    disposeTwin();
    if(window.PolarTwin3D && !twinForce2d){
      const w0=wrap.clientWidth,h0=wrap.clientHeight;
      if(w0>=20 && h0>=20){
        try{
          window.PolarTwin3D.mount(wrap,{stKey,st:k=>DB.stations[k],module:(s,id)=>twinModule(s,id),
            activate:(k,t)=>{ activateScenario(k,t,1); simulateTick(); },clear:k=>{ clearScenarios(k); simulateTick(); },
            setStation:s=>{ STATE.selectedStation=s; document.querySelectorAll('#stationSelect button').forEach(x=>x.classList.toggle('active',x.dataset.st===s));
              const sub=document.getElementById('twinPageSub'); if(sub) sub.innerHTML='Virtual replica of '+DB.stations[s].label+' — SEE · MONITOR · SIMULATE · DECIDE. Not connected to live NCPOR station telemetry '+sourceBadge('SIMULATED'); },
            fallback:()=>{ twinForce2d=true; setTimeout(render,0); }});
          return;
        }catch(e){ console.warn('R3F twin failed, using built-in renderer',e); window.PolarTwin3D.unmount(wrap); twinForce2d=true; }
      }
    }
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if(w<20 || h<20){
      if(tries<30){ twinRetryRaf = requestAnimationFrame(()=>{ twinRetryRaf=0; initTwin(tries+1); }); return; }
      throw new Error('Twin container has no size');
    }
    const fit = twinFitR(w/h);
    const ctx = twinCtx = {wrap,stKey,anim:0,drag:false,zoomed:false,az:.7,taz:.7,el:.55,tel:.55,r:fit*1.25,tr:fit,
      t0:performance.now(),last:performance.now(),frames:0,data:{},gcol:{},engine:''};
    if(!twinForce2d && typeof THREE!=='undefined'){
      try{ twinInit3d(ctx,w,h); ctx.engine='three'; }
      catch(e){ console.warn('Three.js engine failed, switching to built-in renderer', e); twinTeardownEngine(ctx); ctx.mods=ctx.gdots=ctx.picks=ctx.labels=ctx.fuelBar=null; twinForce2d=true; }
    }
    if(!ctx.engine){ twinInit2d(ctx,w,h); ctx.engine='canvas'; }
    const cv = ctx.cv; cv.style.touchAction='none';
    const hint = wrap.querySelector('.twin-hint');
    if(hint && ctx.engine==='canvas') hint.textContent = 'Drag to rotate · Scroll / pinch to zoom · Tap a module · built-in 3D view';
    twinUpdateColors();

    const ptrs = new Map(); let lx=0, ly=0, moved=0, pinch0=1, tr0=ctx.tr;
    const pdist = ()=>{ const q=[...ptrs.values()]; return Math.hypot(q[0].x-q[1].x,q[0].y-q[1].y)||1; };
    cv.addEventListener('pointerdown', e=>{
      ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(ptrs.size===1){ ctx.drag=true; moved=0; lx=e.clientX; ly=e.clientY; }
      else if(ptrs.size===2){ pinch0=pdist(); tr0=ctx.tr; moved=99; }
      ctx.last=performance.now(); cv.style.cursor='grabbing'; try{cv.setPointerCapture(e.pointerId);}catch(_){}
    });
    cv.addEventListener('pointermove', e=>{
      if(!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY}); ctx.last=performance.now();
      if(ptrs.size>=2){ ctx.zoomed=true; ctx.tr=clamp(tr0*pinch0/pdist(),8,75); return; }
      if(!ctx.drag) return;
      const dx=e.clientX-lx, dy=e.clientY-ly; moved+=Math.abs(dx)+Math.abs(dy); lx=e.clientX; ly=e.clientY;
      ctx.taz-=dx*.006; ctx.tel=clamp(ctx.tel+dy*.005,.15,1.35);
    });
    const up = e=>{
      if(!ptrs.delete(e.pointerId)) return;
      if(ptrs.size===1){ const q=[...ptrs.values()][0]; lx=q.x; ly=q.y; }
      if(ptrs.size>0) return;
      ctx.drag=false; cv.style.cursor='grab'; ctx.last=performance.now();
      if(e.type==='pointerup' && moved<8) twinPick(ctx,e);
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e=>{ e.preventDefault(); ctx.zoomed=true; ctx.tr=clamp(ctx.tr*(1+e.deltaY*.001),8,75); ctx.last=performance.now(); }, {passive:false});

    const info = document.getElementById('twinInfo');
    if(info) info.onclick = e=>{ if(e.target.closest('[data-twinclose]')){ STATE.twinSelectedObject=null; showTwinInfo(); } };
    const rb = document.getElementById('twinResetBtn');
    if(rb) rb.onclick = ()=>{ ctx.zoomed=false; ctx.taz=.7; ctx.tel=.55; ctx.tr=twinFitR(wrap.clientWidth/Math.max(1,wrap.clientHeight)); ctx.last=performance.now(); };

    twinResizeHandler = ()=>{
      if(twinCtx!==ctx || !document.body.contains(wrap)) return;
      const w2=wrap.clientWidth, h2=wrap.clientHeight; if(w2<20||h2<20) return;
      ctx.resize(w2,h2); if(!ctx.zoomed) ctx.tr=twinFitR(w2/h2);
    };
    window.addEventListener('resize', twinResizeHandler);

    if(STATE.twinSelectedObject && STATE.twinSelectedObject.stKey===stKey) twinSelectRing(ctx); else STATE.twinSelectedObject=null;
    showTwinInfo();
    const loop = t=>{
      if(twinCtx!==ctx) return;
      ctx.anim = requestAnimationFrame(loop);              // exactly one loop per context
      try{
        const dt = Math.min(.05,(t-ctx.t0)/1000||.016); ctx.t0=t;
        if(!ctx.drag && performance.now()-ctx.last>2500) ctx.taz += dt*.12;   // idle auto-rotate
        ctx.az+=(ctx.taz-ctx.az)*.12; ctx.el+=(ctx.tel-ctx.el)*.12; ctx.r+=(ctx.tr-ctx.r)*.08;
        ctx.draw(); ctx.frames++;
      }catch(err){ twinEngineFail(ctx,err); }
    };
    ctx.anim = requestAnimationFrame(loop);
  }catch(err){
    console.error('Twin init failed', err);
    disposeTwin();
    twinFallback(wrap,'Digital Twin temporarily unavailable');
  }
}
export function twinFail(err){
  console.error('Twin runtime error', err);
  const wrap = document.getElementById('twin-canvas-wrap');
  disposeTwin();
  if(wrap) twinFallback(wrap,'Digital Twin temporarily unavailable');
}
export function twinSelectRing(ctx){
  const sel = STATE.twinSelectedObject; if(!sel || !ctx.bounds || !ctx.bounds[sel.id] || !ctx.ring) return;
  const b = ctx.bounds[sel.id]; ctx.ring.position.set(b.c.x,.08,b.c.z); ctx.ring.scale.set(b.r,b.r,1); ctx.ring.visible=true;
}
export function twinPick(ctx,e){
  const u = ctx.pick(e);
  if(u){ STATE.twinSelectedObject = {stKey:ctx.stKey, id:u.id, genId:u.genId||null}; twinSelectRing(ctx); }
  else { STATE.twinSelectedObject = null; if(ctx.ring) ctx.ring.visible=false; }
  showTwinInfo();
}

/* ========================= CHARTS ========================= */
