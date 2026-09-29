/**
 * App shell: navigation, sidebar, router-style render() and shared view helpers.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE } from '../core/store.js';
import { backBarHTML, quickNavHTML, renderUserChip, roleStripHTML } from '../features/auth.js';
import { renderAlerts } from '../pages/alerts.js';
import { renderCommandCenter } from '../pages/commandCenter.js';
import { renderComms } from '../pages/comms.js';
import { renderEmergencyPage } from '../pages/emergency.js';
import { renderEnergy } from '../pages/energy.js';
import { renderEnvironment } from '../pages/environment.js';
import { renderInfra } from '../pages/infrastructure.js';
import { renderLogistics } from '../pages/logistics.js';
import { renderMaintenance } from '../pages/maintenance.js';
import { renderPlanner } from '../pages/planner.js';
import { renderRisk } from '../pages/risk.js';
import { renderSettings } from '../pages/settings.js';
import { renderStationOverview } from '../pages/stationOverview.js';
import { renderTelemetry } from '../pages/telemetry.js';
import { renderWhatIf } from '../pages/whatIf.js';
import { disposeTwin, initTwin, renderTwinPage } from '../twin/digitalTwin.js';
import { wirePageEvents } from './events.js';
import { now } from '../utils/helpers.js';

export const NAV = [
  {group:'Operations', items:[
    {id:'command', label:'Command Center', ic:'◈'},
    {id:'overview', label:'Station Overview', ic:'▤'},
    {id:'twin', label:'3D Digital Twin', ic:'⬡'},
    {id:'energy', label:'Energy', ic:'⚡'},
    {id:'infra', label:'Infrastructure', ic:'▦'},
    {id:'logistics', label:'Logistics', ic:'▣'},
    {id:'environment', label:'Environment', ic:'❄'},
  ]},
  {group:'Intelligence', items:[
    {id:'risk', label:'AI Risk Intelligence', ic:'◆'},
    {id:'whatif', label:'What-If Simulator', ic:'⟲'},
    {id:'planner', label:'Mission Planner', ic:'✈'},
    {id:'maintenance', label:'Maintenance', ic:'⚙'},
  ]},
  {group:'System', items:[
    {id:'emergency', label:'Emergency Mode', ic:'⚠'},
    {id:'telemetry', label:'Data & Telemetry', ic:'▥'},
    {id:'comms', label:'Communication', ic:'▶'},
    {id:'alerts', label:'Alert Center', ic:'●'},
    {id:'settings', label:'Settings', ic:'✦'},
  ]},
];

export function renderSidebar(){
  const el = document.getElementById('sidebar');
  el.innerHTML = quickNavHTML() + NAV.map(g => `
    <div class="nav-group-label">${g.group}</div>
    ${g.items.map(it=>{
      let badge='';
      if(it.id==='alerts'){ const n=DB.alerts.filter(a=>!a.ack).length; if(n) badge=`<span class="nav-badge">${n}</span>`; }
      if(it.id==='emergency' && STATE.emergencyActive) badge=`<span class="nav-badge">LIVE</span>`;
      return `<div class="nav-item ${STATE.route===it.id?'active':''}" data-route="${it.id}"><span class="ic">${it.ic}</span>${it.label}${badge}</div>`;
    }).join('')}
  `).join('');
}

export function activeStations(){
  return STATE.selectedStation==='ALL' ? Object.values(DB.stations) : [DB.stations[STATE.selectedStation]];
}
export function riskColorClass(level){ return level==='CRITICAL'?'crit':level==='HIGH'?'high':level==='MEDIUM'?'warn':'ok'; }
export function healthColorClass(h){ return h<40?'crit':h<65?'high':h<82?'warn':'ok'; }
export function sourceBadge(kind){ return `<span class="src-badge ${kind}">${kind}</span>`; }
export function timeAgo(ts){ const s=Math.floor((now()-ts)/1000); if(s<60) return s+'s ago'; const m=Math.floor(s/60); if(m<60) return m+'m ago'; const h=Math.floor(m/60); return h+'h ago'; }

export function render(){
  if(!STATE.user) return;
  try {
    disposeTwin();
    if(STATE.route!==STATE.lastRoute){
      if(!STATE.backNav && STATE.lastRoute && STATE.lastRoute!==STATE.navHist[STATE.navHist.length-1]) STATE.navHist.push(STATE.lastRoute);
      if(STATE.navHist.length>30) STATE.navHist.shift();
      STATE.lastRoute = STATE.route;
    }
    STATE.backNav = false;
    renderUserChip();
    renderSidebar();
    const main = document.getElementById('main');
    const routes = {
      command: renderCommandCenter, overview: renderStationOverview, twin: renderTwinPage,
      energy: renderEnergy, infra: renderInfra, logistics: renderLogistics, environment: renderEnvironment,
      risk: renderRisk, whatif: renderWhatIf, planner: renderPlanner, maintenance: renderMaintenance,
      emergency: renderEmergencyPage, telemetry: renderTelemetry, comms: renderComms, alerts: renderAlerts,
      settings: renderSettings,
    };
    main.innerHTML = (STATE.route==='command'?roleStripHTML():backBarHTML()) + (routes[STATE.route]||renderCommandCenter)();
    wirePageEvents();
    if(STATE.route==='twin') initTwin();
    renderCommsPill();
    if(STATE._scrolledRoute!==STATE.route){ STATE._scrolledRoute=STATE.route; main.scrollTop=0; }
  } catch (err) {
    console.error('POLAR TWIN render error:', err);
    renderSafeFallback(err);
  }
}

export function renderSafeFallback(err){
  const sidebar=document.getElementById('sidebar');
  const main=document.getElementById('main');
  if(sidebar){ sidebar.innerHTML = NAV.flatMap(g=>g.items.map(it=>`<div class="nav-item ${STATE.route===it.id?'active':''}" data-route="${it.id}"><span class="ic">${it.ic}</span>${it.label}</div>`)).join(''); }
  if(main){ main.innerHTML = `
    <div class="sih-command-head">
      <div><div class="sih-eyebrow">ANTARCTIC OPERATIONS · MISSION CONTROL</div><h1>Command Center</h1><div class="sih-location">Bharati Station · Digital Twin Operations</div></div>
      <div class="sih-head-right"><span class="sih-live-badge"><i class="sih-live-dot"></i> TELEMETRY ACTIVE</span><span class="sih-sim-badge">◉ SIMULATION DATA</span></div>
    </div>
    <div class="sih-kpi-grid">
      <div class="card sih-kpi"><div class="sih-kpi-top"><span>AMBIENT TEMPERATURE</span><span class="sih-kpi-icon">❄</span></div><div class="sih-kpi-value">-38<span>°C</span></div><div class="sih-kpi-trend warn">↓ Extreme cold conditions</div></div>
      <div class="card sih-kpi"><div class="sih-kpi-top"><span>POWER LOAD</span><span class="sih-kpi-icon">⚡</span></div><div class="sih-kpi-value">72<span>%</span></div><div class="sih-kpi-trend ok">● Grid operating normally</div></div>
      <div class="card sih-kpi"><div class="sih-kpi-top"><span>FUEL RESERVE</span><span class="sih-kpi-icon">▣</span></div><div class="sih-kpi-value">64<span>%</span></div><div class="sih-kpi-trend ok">● Adequate reserve</div></div>
      <div class="card sih-kpi"><div class="sih-kpi-top"><span>ENDURANCE</span><span class="sih-kpi-icon">◷</span></div><div class="sih-kpi-value">12.4<span> days</span></div><div class="sih-kpi-trend">Projected critical-operation window</div></div>
    </div>
    <div class="sih-command-grid">
      <div class="card sih-twin-card"><div class="sih-card-head"><div><div class="sih-card-title">Digital Twin</div><div class="sih-card-meta">Live station model · subsystem monitoring</div></div><button class="sih-link-btn" data-route="twin">OPEN 3D TWIN →</button></div><div class="sih-station-visual"><div class="sih-station-label main">BHARATI STATION</div><div class="sih-module m1">HABITAT</div><div class="sih-module m2">LAB</div><div class="sih-module warn">GENERATOR</div><div class="sih-module m4">FUEL FARM</div><div class="sih-module m5">COMMS</div></div></div>
      <div class="card sih-risk-card"><div class="sih-card-head"><div><div class="sih-card-title">AI Risk Intelligence</div><div class="sih-card-meta">Predictive operational assessment</div></div><span class="status-pill high">HIGH</span></div><div class="sih-risk-body"><div class="sih-risk-score">78<small>/100</small></div><div><b>Generator-02 anomaly detected</b><p>Vibration trend and environmental load are increasing.</p></div></div><div class="sih-factor"><div class="sih-factor-label"><span>Generator vibration</span><b>32%</b></div><div class="sih-factor-bar"><i style="width:80%"></i></div></div><div class="sih-factor"><div class="sih-factor-label"><span>Extreme temperature</span><b>24%</b></div><div class="sih-factor-bar"><i style="width:60%"></i></div></div><div class="sih-ai-action"><b>AI RECOMMENDATION</b>Schedule Generator-02 inspection during the next maintenance window.</div><div class="sih-action-row"><button class="sih-action" data-route="risk">VIEW RISK ANALYSIS</button><button class="sih-action" data-route="whatif">RUN WHAT-IF</button></div></div>
    </div>
    <div class="card"><div class="sih-card-title">System Health</div><div class="sih-health"><div class="sih-health-item"><i class="sih-health-dot ok"></i>Power <b>NORMAL</b></div><div class="sih-health-item"><i class="sih-health-dot ok"></i>Fuel <b>NORMAL</b></div><div class="sih-health-item"><i class="sih-health-dot warn"></i>Generator <b>WATCH</b></div><div class="sih-health-item"><i class="sih-health-dot ok"></i>Comms <b>ONLINE</b></div></div></div>
    <div class="card" style="margin-top:14px"><div class="sih-card-title">Prototype recovery mode</div><p class="small-note">The main dashboard renderer encountered an error, so a safe static dashboard is being shown. Open the browser console to identify the underlying JavaScript issue.</p><details><summary>Technical error</summary><pre style="white-space:pre-wrap;color:var(--sih-red);font-size:11px">${String(err && (err.stack||err.message||err))}</pre></details></div>`;
    main.onclick = e=>{const item=e.target.closest('[data-route]'); if(item){STATE.route=item.dataset.route; render();}};
  }
}

export function renderCommsPill(){
  const pill = document.getElementById('commsPill');
  const text = document.getElementById('commsPillText');
  if(STATE.commsConnected){
    pill.querySelector('.dot').className='dot ok';
    text.textContent='SATELLITE LINK CONNECTED';
  } else {
    pill.querySelector('.dot').className='dot crit';
    text.textContent='OFFLINE — LOCAL OPS ACTIVE';
  }
}

/* ========================= COMMAND CENTER ========================= */
export function stationStatusSummary(st){
  const reasons = [];
  if(st.riskLevel==='CRITICAL'||st.riskLevel==='HIGH') reasons.push(st.riskCauses[0]?st.riskCauses[0].text:'Elevated operational risk');
  if(st.generators.some(g=>g.status==='CRITICAL'||g.status==='WARNING')) reasons.push('Generator health degraded');
  if(st.logistics.fuel.qty<25) reasons.push('Fuel reserve low');
  if(st.commsOffline) reasons.push('Communication link offline');
  const level = st.riskLevel==='CRITICAL'?'crit':st.riskLevel==='HIGH'?'high':(reasons.length?'warn':'ok');
  const label = level==='crit'?'Critical':level==='high'?'Attention Required':level==='warn'?'Monitor':'Operational';
  const emoji = level==='crit'?'🔴':level==='high'?'🟡':level==='warn'?'🟠':'🟢';
  return {level,label,emoji,reasons};
}

