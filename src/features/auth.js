/**
 * Demo login, roles, back-navigation and logout (client-side only, no backend).
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE, pushAudit } from '../core/store.js';
import { startSim, stopSim } from '../simulator/runner.js';
import { disposeTwin } from '../twin/digitalTwin.js';
import { NAV, render } from '../ui/shell.js';
import { $id, now } from '../utils/helpers.js';

// DEMO authentication only — no backend. Credentials live client-side and are never rendered in the dashboard.
export const DEMO_USERS = {
  admin:{p:'admin123',id:'u1'}, engineer:{p:'engineer123',id:'u2'}, logistics:{p:'logistics123',id:'u3'},
  scientist:{p:'scientist123',id:'u4'}, emergency:{p:'emergency123',id:'u5'},
};
export const ROLE_FOCUS = {
  'Admin':['settings','alerts','twin','emergency'],
  'Station Engineer':['twin','energy','infra','maintenance','telemetry'],
  'Logistics Officer':['logistics','planner'],
  'Scientist':['environment','telemetry','overview'],
  'Emergency Officer':['emergency','alerts','risk','comms'],
};
export function navItem(id){ for(const g of NAV){ const it=g.items.find(i=>i.id===id); if(it) return it; } return {id, label:'Previous page', ic:'•'}; }
export function quickNavHTML(){
  const ids = ROLE_FOCUS[STATE.role]||[]; if(!ids.length) return '';
  return `<div class="nav-group-label">Your Focus · ${STATE.role}</div>` + ids.map(id=>{ const it=navItem(id);
    return `<div class="nav-item ${STATE.route===id?'active':''}" data-route="${id}"><span class="ic">${it.ic}</span>${it.label}</div>`; }).join('');
}
export function roleStripHTML(){
  const ids = ROLE_FOCUS[STATE.role]||[];
  return `<div class="role-strip"><span>Signed in as <b>${STATE.user?STATE.user.name:''}</b> · ${STATE.role}</span><span style="flex:1"></span><span>Quick access:</span>${ids.map(id=>`<button class="sih-action" data-route="${id}">${navItem(id).label.toUpperCase()}</button>`).join('')}</div>`;
}
export function peekBack(){ const h=STATE.navHist; for(let i=h.length-1;i>=0;i--) if(h[i]!==STATE.route) return h[i]; return 'command'; }
export function backBarHTML(){
  const prev = peekBack(), lbl = prev==='command'?'Command Center':navItem(prev).label;
  return `<div class="backbar"><button class="back-btn" data-back="1">← Back to ${lbl}</button></div>`;
}
export function goBack(){
  const h = STATE.navHist; let t='command';
  while(h.length){ const p=h.pop(); if(p!==STATE.route){ t=p; break; } }
  STATE.backNav = true; STATE.route = t; render();
}
export function renderUserChip(){
  if(!STATE.user) return;
  $id('userChipName').textContent = STATE.user.name; $id('userChipRole').textContent = '· '+STATE.role;
  $id('roleSelect').style.display = STATE.user.role==='Admin' ? '' : 'none';
}
export function clearLoginFields(){ $id('loginUser').value=''; $id('loginPass').value=''; $id('loginError').hidden=true; }

export function doLogin(){
  const err = $id('loginError');
  try{
    const u = $id('loginUser').value.trim().toLowerCase(), p = $id('loginPass').value;
    const rec = Object.prototype.hasOwnProperty.call(DEMO_USERS,u) ? DEMO_USERS[u] : null;
    if(!rec || rec.p!==p){
      err.textContent = 'Invalid credentials. Please check your User ID and password.'; err.hidden=false;
      $id('loginPass').value=''; $id('loginPass').focus(); return;
    }
    const prof = DB.users.find(x=>x.id===rec.id);
    STATE.user = {id:prof.id, username:u, name:prof.name, role:prof.role, loginAt:now()};
    STATE.role = prof.role; STATE.route='command'; STATE.navHist=[]; STATE.lastRoute=null; STATE.twinSelectedObject=null;
    try{ if($id('loginRemember').checked) localStorage.setItem('polarTwinUser',u); else localStorage.removeItem('polarTwinUser'); }catch(_){}
    clearLoginFields();
    $id('login').style.display='none'; $id('app').style.display='block';
    $id('roleSelect').value = STATE.role;
    if(STATE.emergencyActive) $id('emergencyOverlay').classList.add('show');
    pushAudit('Session started', prof.name+' ('+prof.role+')');
    startSim(); render();
  }catch(e){
    console.error('Login error', e);
    err.textContent='Login failed unexpectedly. Please try again.'; err.hidden=false;
  }
}
export function logout(){
  try{ pushAudit('Session ended', STATE.user?STATE.user.name:''); }catch(_){}
  stopSim();
  STATE.demoRunning=false; if(STATE.demoTimer){ clearTimeout(STATE.demoTimer); STATE.demoTimer=null; }
  disposeTwin();
  STATE.user=null; STATE.route='command'; STATE.navHist=[]; STATE.lastRoute=null; STATE.twinSelectedObject=null;
  $id('emergencyOverlay').classList.remove('show');
  document.body.classList.remove('nav-open');
  $id('app').style.display='none'; $id('main').innerHTML='';
  $id('login').style.display=''; clearLoginFields(); $id('loginUser').focus();
}

